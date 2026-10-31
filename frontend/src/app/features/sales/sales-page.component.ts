import { CommonModule } from "@angular/common";
import { Component, DoCheck, HostListener, OnDestroy, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute, Params, Router, RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { createBoundAuthContext } from "../../core/auth/bound-auth-context";
import { SalesFilters, SalesListItem } from "./data/sales.models";
import { SalesService } from "./data/sales.service";
import { documentView, filtersFromContext, salesContext, saleStatusLabel } from "./sales-presentation";

@Component({
  selector: "app-sales-page",
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./sales-page.component.html",
  styleUrl: "./sales-page.component.css",
})
export class SalesPageComponent implements OnInit, OnDestroy, DoCheck {
  readonly filterForm = this.formBuilder.group({ from: [""], to: [""], status: [""],
    cashRegisterSessionId: [null as number | null], createdBy: [""] });
  readonly documentView = documentView;
  readonly saleStatusLabel = saleStatusLabel;
  sales: SalesListItem[] = [];
  loading = false;
  errorMessage = "";
  cashier = false;
  listContext: Params = {};
  private request = new Subscription();
  private profile = new Subscription();
  private generation = 0;
  private credential: string | null = null;
  private destroyed = false;
  private readonly currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
  private readonly date = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false });

  constructor(private readonly formBuilder: FormBuilder, private readonly salesService: SalesService,
    private readonly auth: AuthService, private readonly route: ActivatedRoute, private readonly router: Router) {}

  ngOnInit(): void {
    this.credential = this.auth.getToken();
    const filters = filtersFromContext(this.route.snapshot.queryParamMap);
    this.filterForm.patchValue({ from: filters.from ?? "", to: filters.to ?? "", status: filters.status ?? "",
      cashRegisterSessionId: filters.cashRegisterSessionId ?? null, createdBy: filters.createdBy ?? "" });
    if (this.credential) this.profile = this.auth.me(createBoundAuthContext(this.credential)).subscribe({
      next: actor => { if (this.current()) this.cashier = actor.roles.includes("CAJERO"); },
      error: () => {},
    });
    this.applyFilters();
  }
  ngDoCheck(): void { this.checkSession(); }
  @HostListener("window:storage")
  @HostListener("window:focus")
  checkSession(): void {
    if (this.credential === this.auth.getToken()) return;
    this.generation++; this.request.unsubscribe(); this.profile.unsubscribe(); this.sales = [];
    this.loading = false; this.cashier = false;
    this.errorMessage = "La sesión cambió. Vuelve a abrir Ventas con la sesión actual.";
  }
  private current(): boolean { return !this.destroyed && !!this.credential && this.credential === this.auth.getToken(); }
  applyFilters(): void {
    if (!this.current()) { this.sales = []; this.errorMessage = "Inicia sesión para consultar ventas."; return; }
    const value = this.filterForm.getRawValue();
    if (value.from && value.to && value.from > value.to) {
      this.errorMessage = "La fecha Desde no puede ser mayor que la fecha Hasta."; return;
    }
    const cash = value.cashRegisterSessionId;
    if (cash != null && (!Number.isSafeInteger(Number(cash)) || Number(cash) <= 0)) {
      this.errorMessage = "Ingresa una sesión de caja válida."; return;
    }
    const filters: SalesFilters = { from: value.from || undefined, to: value.to || undefined,
      status: value.status === "COMPLETED" || value.status === "VOIDED" ? value.status : undefined,
      cashRegisterSessionId: cash == null ? undefined : Number(cash), createdBy: value.createdBy?.trim() || undefined };
    this.listContext = salesContext(filters);
    void this.router.navigate([], { relativeTo: this.route, queryParams: this.listContext, replaceUrl: true });
    this.request.unsubscribe();
    const generation = ++this.generation;
    this.sales = []; this.loading = true; this.errorMessage = "";
    this.request = this.salesService.listItems(filters, createBoundAuthContext(this.credential)).subscribe({
      next: rows => {
        if (!this.current() || generation !== this.generation) return;
        this.loading = false;
        if (!Array.isArray(rows) || rows.some(row => !row || !Number.isSafeInteger(row.id) || row.id <= 0)) {
          this.errorMessage = "No se pudo verificar el listado recibido."; return;
        }
        // Preserve the existing date behavior. UTC/Lima alignment is a separate contract gate.
        const from = filters.from ? new Date(filters.from + "T00:00:00.000") : null;
        const to = filters.to ? new Date(filters.to + "T23:59:59.999") : null;
        this.sales = rows.filter(sale => {
          if (!from && !to) return true;
          const sold = new Date(sale.soldAt);
          return !Number.isNaN(sold.getTime()) && (!from || sold >= from) && (!to || sold <= to);
        });
      },
      error: error => {
        if (!this.current() || generation !== this.generation) return;
        this.loading = false; this.sales = [];
        this.errorMessage = error?.status === 401 ? "Sesión vencida. Inicia sesión para consultar ventas."
          : error?.status === 403 || error?.status === 422 ? "No tienes permiso para consultar estas ventas."
          : "No se pudo cargar el listado de ventas. Reintenta la consulta.";
      },
    });
  }
  resetFilters(): void {
    this.filterForm.reset({ from: "", to: "", status: "", cashRegisterSessionId: null, createdBy: "" });
    this.applyFilters();
  }
  formatCurrency(value: number): string { return Number.isFinite(value) ? this.currency.format(value) : "No disponible"; }
  formatDate(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? "No disponible" : this.date.format(date); }
  ngOnDestroy(): void { this.destroyed = true; this.generation++; this.request.unsubscribe(); this.profile.unsubscribe(); }
}
