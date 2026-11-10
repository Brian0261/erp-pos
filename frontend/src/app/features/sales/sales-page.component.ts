import { CommonModule } from "@angular/common";
import { Component, DoCheck, ElementRef, HostListener, OnDestroy, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from "@angular/router";
import { Subscription, timeout } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { createBoundAuthContext } from "../../core/auth/bound-auth-context";
import { formatCommercialInstant } from "../../shared/utils/commercial-date";
import { SALES_PAGE_SIZES, SalesListItem, SalesListPage, SalesListQuery } from "./data/sales.models";
import { SalesService } from "./data/sales.service";
import {
  DOCUMENT_STATUS_OPTIONS, MAX_SALES_PAGE, SalesPeriod, SalesQueryError, salesPeriodDates, salesQueryFromUrl,
  salesQueryParams, validateSalesQuery,
} from "./sales-list-query";
import { SalesReturnFocus } from "./sales-return-focus";
import { listDocumentView, saleStatusLabel } from "./sales-presentation";

const emptyFilters = {
  search: "", mode: "exact", from: "", to: "", status: "", cashRegisterSessionId: null as number | null,
  createdBy: "", hasElectronicDocument: "", documentStatus: "",
};

@Component({
  selector: "app-sales-page",
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./sales-page.component.html",
  styleUrl: "./sales-page.component.css",
})
export class SalesPageComponent implements OnInit, OnDestroy, DoCheck {
  readonly filterForm = this.forms.nonNullable.group(emptyFilters);
  readonly listDocumentView = listDocumentView;
  readonly saleStatusLabel = saleStatusLabel;
  readonly documentStatuses = DOCUMENT_STATUS_OPTIONS;
  readonly sizes = SALES_PAGE_SIZES;
  readonly periods = [{ key: "today", label: "Hoy" }, { key: "week", label: "Últimos 7 días" },
    { key: "month", label: "Este mes" }] as const;
  result: SalesListPage | null = null;
  applied: SalesListQuery | null = null;
  listContext: Params = {};
  loading = false;
  errorMessage = "";
  validationError = "";
  invalidField = "";
  filtersOpen = false;
  cashier = false;
  canFilterUser = false;
  canRetry = false;

  private request = new Subscription();
  private profileRequest = new Subscription();
  private subscriptions = new Subscription();
  private generation = 0;
  private credential: string | null = null;
  private actorReady = false;
  private expired = false;
  private destroyed = false;
  private restoreId: number | null = null;
  private focusPage = false;
  private readonly currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

  constructor(private readonly forms: FormBuilder, private readonly salesService: SalesService,
    private readonly auth: AuthService, private readonly route: ActivatedRoute, private readonly router: Router,
    private readonly host: ElementRef<HTMLElement>, private readonly returnFocus: SalesReturnFocus) {}

  ngOnInit(): void {
    this.credential = this.auth.getToken();
    this.restoreId = this.returnFocus.take(this.credential);
    this.subscriptions.add(this.route.queryParamMap.subscribe(params => {
      if (this.actorReady && this.current()) this.loadFromUrl(params);
    }));
    this.subscriptions.add(this.filterForm.controls.hasElectronicDocument.valueChanges.subscribe(value => {
      const control = this.filterForm.controls.documentStatus;
      if (value === "false") {
        control.setValue("", { emitEvent: false });
        control.disable({ emitEvent: false });
      } else control.enable({ emitEvent: false });
    }));
    this.loadActor();
  }

  private loadActor(): void {
    if (!this.current()) { this.fail("Inicia sesión para consultar ventas."); return; }
    this.loading = true;
    this.errorMessage = "";
    this.canRetry = false;
    this.profileRequest.unsubscribe();
    this.profileRequest = this.auth.me(createBoundAuthContext(this.credential)).pipe(timeout(15_000)).subscribe({
      next: actor => {
        if (!this.current()) return;
        if (!actor?.id || !Array.isArray(actor.roles) || !actor.roles.some(role => ["CAJERO", "ADMIN", "SUPERVISOR"].includes(role))) {
          this.fail("No tienes permiso para consultar estas ventas."); return;
        }
        this.cashier = actor.roles.includes("CAJERO");
        this.canFilterUser = !this.cashier && actor.roles.some(role => role === "ADMIN" || role === "SUPERVISOR");
        this.actorReady = true;
        this.loadFromUrl(this.route.snapshot.queryParamMap);
      },
      error: error => { if (this.current()) this.handleReadError(error); },
    });
  }

  ngDoCheck(): void { this.checkSession(); }
  @HostListener("window:storage")
  @HostListener("window:focus")
  checkSession(): void {
    if (this.credential === this.auth.getToken() || this.destroyed) return;
    this.generation++;
    this.request.unsubscribe();
    this.profileRequest.unsubscribe();
    this.subscriptions.unsubscribe();
    this.actorReady = false;
    this.cashier = false;
    this.canFilterUser = false;
    this.applied = null;
    this.listContext = {};
    this.filterForm.reset(emptyFilters);
    this.validationError = "";
    this.fail("La sesión cambió. Vuelve a abrir Ventas con la sesión actual.");
  }

  private current(): boolean {
    return !this.destroyed && !this.expired && !!this.credential && this.credential === this.auth.getToken();
  }

  private loadFromUrl(params: ParamMap): void {
    this.validationError = "";
    this.invalidField = "";
    try {
      const query = salesQueryFromUrl(params);
      if (!this.canFilterUser) delete query.createdBy;
      this.applied = query;
      this.listContext = salesQueryParams(query);
      this.filterForm.reset({
        search: query.saleNumberPrefix ?? query.saleNumber ?? "", mode: query.saleNumberPrefix ? "prefix" : "exact",
        from: query.from ?? "", to: query.to ?? "", status: query.status ?? "",
        cashRegisterSessionId: query.cashRegisterSessionId ?? null, createdBy: query.createdBy ?? "",
        hasElectronicDocument: query.hasElectronicDocument === undefined ? "" : String(query.hasElectronicDocument),
        documentStatus: query.documentStatus ?? "",
      });
      this.read(query);
    } catch (error) {
      this.generation++;
      this.request.unsubscribe();
      this.applied = null;
      this.listContext = {};
      this.fail(error instanceof SalesQueryError ? error.message : "No se pudieron leer los filtros del enlace.");
    }
  }

  applyFilters(): void {
    if (!this.current() || !this.actorReady) return;
    const value = this.filterForm.getRawValue();
    try {
      const query = validateSalesQuery({
        from: value.from, to: value.to, status: value.status, cashRegisterSessionId: value.cashRegisterSessionId,
        createdBy: this.canFilterUser ? value.createdBy : undefined, hasElectronicDocument: value.hasElectronicDocument,
        documentStatus: value.hasElectronicDocument === "false" ? undefined : value.documentStatus,
        saleNumber: value.mode === "exact" ? value.search : undefined,
        saleNumberPrefix: value.mode === "prefix" ? value.search : undefined, size: this.applied?.size,
      });
      this.validationError = "";
      this.invalidField = "";
      this.navigate(query);
    } catch (error) {
      if (!(error instanceof SalesQueryError)) throw error;
      this.invalidField = error.field;
      this.validationError = error.message;
      if (!["saleNumber", "saleNumberPrefix"].includes(error.field)) this.filtersOpen = true;
    }
  }

  resetFilters(): void {
    this.filterForm.reset(emptyFilters);
    this.applyFilters();
  }

  choosePeriod(period: SalesPeriod): void {
    if (!this.applied || !this.current()) return;
    const dates = salesPeriodDates(period, new Date().toISOString());
    this.navigate({ ...this.applied, ...dates, page: 0 });
  }

  openCustomPeriod(): void {
    this.filtersOpen = true;
    requestAnimationFrame(() => this.host.nativeElement.querySelector<HTMLInputElement>("#sales-from")?.focus());
  }

  isPeriod(period: SalesPeriod): boolean {
    if (!this.applied?.from || !this.applied.to) return false;
    const dates = salesPeriodDates(period, new Date().toISOString());
    return this.applied.from === dates.from && this.applied.to === dates.to;
  }

  changeSize(size: string): void {
    if (!this.applied || !this.current()) return;
    const selected = this.sizes.find(value => String(value) === size);
    if (selected) this.navigate({ ...this.applied, page: 0, size: selected });
  }

  goToPage(page: number): void {
    if (!this.applied || !this.result || !this.current() || page < 0 || page >= this.reachablePages) return;
    this.focusPage = true;
    this.navigate({ ...this.applied, page });
  }

  refresh(): void {
    if (!this.current()) return;
    if (this.applied) this.read(this.applied);
    else if (!this.actorReady) this.loadActor();
  }

  private navigate(query: SalesListQuery, replaceUrl = false): void {
    const queryParams = salesQueryParams(query);
    const url = this.router.createUrlTree([], { relativeTo: this.route, queryParams });
    if (this.router.serializeUrl(url) === this.router.url) {
      this.read(query);
    } else void this.router.navigateByUrl(url, { replaceUrl });
  }

  private correctionInProgress = false;
  private read(query: SalesListQuery): void {
    const generation = ++this.generation;
    this.request.unsubscribe();
    this.result = null;
    this.loading = true;
    this.errorMessage = "";
    this.canRetry = false;
    this.request = this.salesService.listPage(query, createBoundAuthContext(this.credential)).pipe(timeout(20_000)).subscribe({
      next: result => {
        if (!this.current() || generation !== this.generation) return;
        const last = Math.min(MAX_SALES_PAGE, Math.max(0, result.totalPages - 1));
        if (query.page > last) {
          if (this.correctionInProgress) {
            this.correctionInProgress = false;
            this.fail("Los resultados cambiaron mientras consultabas. Actualiza para ajustar la página.", true);
            return;
          }
          this.correctionInProgress = true;
          const url = this.router.createUrlTree([], { relativeTo: this.route, queryParams: salesQueryParams({ ...query, page: last }) });
          void this.router.navigateByUrl(url, { replaceUrl: true }).then(navigated => {
            if (!navigated && this.current() && generation === this.generation) {
              this.correctionInProgress = false;
              this.fail("No se pudo ajustar la página. Actualiza los resultados.", true);
            }
          });
          return;
        }
        this.correctionInProgress = false;
        this.result = result;
        this.loading = false;
        this.restoreFocus(generation);
      },
      error: error => {
        if (this.current() && generation === this.generation) {
          this.correctionInProgress = false;
          this.handleReadError(error);
        }
      },
    });
  }

  private handleReadError(error: { status?: number } | null): void {
    const status = error?.status;
    if (status === 401) {
      this.expired = true;
      this.actorReady = false;
      this.canFilterUser = false;
      this.applied = null;
      this.listContext = {};
      this.filterForm.reset(emptyFilters);
      this.fail("Sesión vencida. Inicia sesión para consultar ventas.");
    } else if (status === 403) this.fail("No tienes permiso para consultar estas ventas.");
    else if (status === 400 || status === 422) this.fail("No se pudieron aplicar los filtros. Revisa sus valores.");
    else this.fail(error instanceof Error && /^Invalid sale/.test(error.message)
      ? "No se pudo verificar el listado recibido." : "No se pudo cargar el listado de ventas. Reintenta la consulta.", true);
  }

  private fail(message: string, canRetry = false): void {
    this.result = null;
    this.loading = false;
    this.errorMessage = message;
    this.canRetry = canRetry;
    this.restoreFocus(this.generation);
  }

  rememberDetail(id: number): void {
    if (this.current()) this.returnFocus.remember(id, this.credential);
  }

  private restoreFocus(generation: number): void {
    if (this.restoreId === null && !this.focusPage) return;
    const id = this.restoreId;
    const focusPage = this.focusPage;
    this.restoreId = null;
    this.focusPage = false;
    requestAnimationFrame(() => {
      if (!this.current() || generation !== this.generation) return;
      const selector = focusPage ? '[aria-current="page"]' : '[data-sale-id="' + id + '"]';
      const element = this.host.nativeElement.querySelector<HTMLElement>(selector)
        ?? this.host.nativeElement.querySelector<HTMLElement>("#sales-title");
      element?.focus();
    });
  }

  get sales(): SalesListItem[] { return this.result?.items ?? []; }
  get reachablePages(): number { return Math.min(this.result?.totalPages ?? 0, MAX_SALES_PAGE + 1); }
  get pageNumbers(): number[] {
    if (!this.result || !this.reachablePages) return [];
    const start = Math.max(0, Math.min(this.result.page - 2, this.reachablePages - 5));
    return Array.from({ length: Math.min(5, this.reachablePages) }, (_, offset) => start + offset);
  }
  get resultRange(): string {
    if (!this.result?.items.length) return "";
    const offset = this.result.page * this.result.size;
    return "Mostrando " + (offset + 1) + "–" + (offset + this.result.items.length) + " de " + this.result.totalItems;
  }
  get criteria(): string[] {
    const query = this.applied;
    if (!query) return [];
    const { saleNumber, saleNumberPrefix, from, to, status, cashRegisterSessionId, createdBy, hasElectronicDocument, documentStatus } = query;
    return [saleNumber && "Número: " + saleNumber, saleNumberPrefix && "Comienza con: " + saleNumberPrefix,
      from && "Desde: " + from, to && "Hasta: " + to, status && "Comercial: " + saleStatusLabel(status),
      cashRegisterSessionId && "Caja: " + cashRegisterSessionId, createdBy && "Usuario: " + createdBy,
      hasElectronicDocument === true && "Con documento", hasElectronicDocument === false && "Sin documento",
      documentStatus && "Fiscal: " + this.documentStatuses.find(([code]) => code === documentStatus)?.[1]]
      .filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  formatCurrency(value: number): string { return Number.isFinite(value) ? this.currency.format(value) : "No disponible"; }
  formatDate = formatCommercialInstant;
  ngOnDestroy(): void {
    this.destroyed = true;
    this.generation++;
    this.request.unsubscribe();
    this.profileRequest.unsubscribe();
    this.subscriptions.unsubscribe();
  }
}
