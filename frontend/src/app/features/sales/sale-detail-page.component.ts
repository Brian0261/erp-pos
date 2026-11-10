import { formatCommercialInstant } from "../../shared/utils/commercial-date";
import { CommonModule } from "@angular/common";
import { Component, DoCheck, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute, Params, RouterLink } from "@angular/router";
import { Subscription, timeout } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { UserProfile } from "../../core/auth/auth.models";
import { createBoundAuthContext } from "../../core/auth/bound-auth-context";
import { ElectronicDocumentResponse } from "../billing/data/billing.models";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import { SaleItemResponse, SaleResponse } from "./data/sales.models";
import { SalesService } from "./data/sales.service";
import { documentReadError, documentView, filtersFromContext, salesContext, saleStatusLabel } from "./sales-presentation";
import { blocksInternalVoid, latestSaleDocument } from "./sale-document-verification";
import { SalesReturnFocus } from "./sales-return-focus";
import { SaleVoidAttempts, saleVoidAttemptKey } from "./sale-void-attempts";

type DocumentPhase = "loading" | "absent" | "present" | "error";
@Component({
  selector: "app-sale-detail-page",
  imports: [CommonModule, RouterLink],
  templateUrl: "./sale-detail-page.component.html",
  styleUrl: "./sale-detail-page.component.css",
})
export class SaleDetailPageComponent implements OnInit, OnDestroy, DoCheck {
  sale: SaleResponse | null = null;
  billingDocument: ElectronicDocumentResponse | null = null;
  currentUser: UserProfile | null = null;
  documentPhase: DocumentPhase = "loading";
  loading = true;
  errorMessage = "";
  billingErrorMessage = "";
  successMessage = "";
  canRetrySale = false;
  listContext: Params = {};
  readonly saleStatusLabel = saleStatusLabel;
  @ViewChild("saleTitle") private title?: ElementRef<HTMLElement>;
  @ViewChild("documentSection") private documentSection?: ElementRef<HTMLElement>;
  @ViewChild("documentTitle") private documentTitle?: ElementRef<HTMLElement>;
  private routeSubscription = new Subscription();
  private saleSubscription = new Subscription();
  private documentSubscription = new Subscription();
  private profileSubscription = new Subscription();
  private generation = 0;
  private documentGeneration = 0;
  private credential: string | null = null;
  private expired = false;
  private destroyed = false;
  private readonly currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2, maximumFractionDigits: 2 });


  constructor(private readonly route: ActivatedRoute, private readonly salesService: SalesService,
    private readonly documents: ElectronicDocumentService, private readonly auth: AuthService,
    private readonly returnFocus: SalesReturnFocus, private readonly voidAttempts: SaleVoidAttempts) {}
  ngOnInit(): void {
    this.credential = this.auth.getToken();
    this.routeSubscription.add(this.route.queryParamMap.subscribe(params => {
      this.listContext = salesContext(filtersFromContext(params));
    }));
    this.routeSubscription.add(this.route.paramMap.subscribe(params => this.loadSale(params.get("id"))));
  }
  private current(generation = this.generation): boolean {
    return !this.destroyed && !this.expired && generation === this.generation && !!this.credential && this.credential === this.auth.getToken();
  }
  ngDoCheck(): void { this.checkSession(); }
  @HostListener("window:storage")
  @HostListener("window:focus")
  checkSession(): void {
    if (this.credential === this.auth.getToken()) return;
    this.generation++; this.documentGeneration++; this.cancelReads(); this.sale = null;
    this.currentUser = null; this.billingDocument = null; this.loading = false; this.documentPhase = "error";
    this.successMessage = ""; this.canRetrySale = false;
    this.errorMessage = "La sesión cambió. Vuelve a abrir la venta con la sesión actual.";
  }
  private cancelReads(): void {
    this.saleSubscription.unsubscribe(); this.documentSubscription.unsubscribe(); this.profileSubscription.unsubscribe();
  }
  focusDocumentSection(event: MouseEvent): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !this.sale || !this.current()) return;
    const section = this.documentSection?.nativeElement;
    const title = this.documentTitle?.nativeElement;
    if (!section?.isConnected || !title?.isConnected) return;
    title.focus({ preventScroll: true });
    section.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
  }
  rememberReturn(): void {
    if (this.sale && this.current()) this.returnFocus.remember(this.sale.id, this.credential);
  }
  retrySale(): void {
    if (this.canRetrySale && this.current()) this.loadSale(this.route.snapshot.paramMap.get("id"));
  }
  private expireSession(): void {
    this.expired = true;
    this.generation++; this.documentGeneration++; this.cancelReads();
    this.sale = null; this.billingDocument = null; this.currentUser = null;
    this.loading = false; this.documentPhase = "error"; this.canRetrySale = false; this.successMessage = "";
    this.errorMessage = "Sesión vencida. Inicia sesión para consultar esta venta.";
  }
  private loadSale(rawId: string | null): void {
    const generation = ++this.generation;
    this.documentGeneration++; this.cancelReads();
    this.sale = null; this.billingDocument = null; this.currentUser = null; this.errorMessage = ""; this.billingErrorMessage = "";
    this.successMessage = ""; this.canRetrySale = false;
    this.loading = true; this.documentPhase = "loading";
    const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : 0;
    if (!Number.isSafeInteger(id) || id <= 0) { this.loading = false; this.errorMessage = "Identificador de venta no válido."; return; }
    if (!this.current(generation)) { this.loading = false; this.errorMessage = "Inicia sesión para consultar esta venta."; return; }
    const context = createBoundAuthContext(this.credential);
    this.profileSubscription = this.auth.me(context).pipe(timeout(15_000)).subscribe({
      next: actor => { if (this.current(generation)) this.currentUser = actor; },
      error: error => {
        if (!this.current(generation)) return;
        if (error?.status === 401) this.expireSession();
        else this.currentUser = null;
      },
    });
    if (!this.current(generation)) return;
    this.saleSubscription = this.salesService.getById(id, context).pipe(timeout(20_000)).subscribe({
      next: sale => {
        if (!this.current(generation)) return;
        this.loading = false;
        if (sale?.id !== id || !Array.isArray(sale.items) || !Array.isArray(sale.payments)) {
          this.errorMessage = "No se pudo verificar la venta solicitada."; this.canRetrySale = true; return;
        }
        this.sale = sale;
        if (sale.status === "VOIDED" && this.route.snapshot.queryParamMap.get("status") === "voided") {
          this.successMessage = "Anulación confirmada.";
        }
        this.retryDocument();
        queueMicrotask(() => { if (this.current(generation)) this.title?.nativeElement.focus({ preventScroll: true }); });
      },
      error: error => {
        if (!this.current(generation)) return;
        if (error?.status === 401) { this.expireSession(); return; }
        this.loading = false;
        this.canRetrySale = ![403, 404, 422].includes(error?.status);
        this.errorMessage = error?.status === 403 || error?.status === 422 ? "No tienes permiso para consultar esta venta."
          : error?.status === 404 ? "La venta no existe o no está disponible." : "No se pudo consultar la venta. Reintenta la consulta.";
      },
    });
  }
  retryDocument(): void {
    if (!this.sale || !this.current()) return;
    this.documentSubscription.unsubscribe();
    const generation = this.generation, documentGeneration = ++this.documentGeneration, saleId = this.sale.id;
    this.documentPhase = "loading"; this.billingDocument = null; this.billingErrorMessage = "";
    this.documentSubscription = this.documents.listBySaleId(saleId, createBoundAuthContext(this.credential)).pipe(timeout(20_000)).subscribe({
      next: rows => {
        if (!this.current(generation) || documentGeneration !== this.documentGeneration || this.sale?.id !== saleId) return;
        try {
          const doc = latestSaleDocument(rows, saleId);
          this.billingDocument = doc;
          this.documentPhase = doc ? "present" : "absent";
        } catch (error) {
          this.documentFailure(error);
        }
      },
      error: error => { if (this.current(generation) && documentGeneration === this.documentGeneration) this.documentFailure(error); },
    });
  }
  private documentFailure(error: unknown): void {
    if ((error as { status?: number } | null)?.status === 401) { this.expireSession(); return; }
    this.billingDocument = null; this.documentPhase = "error"; this.billingErrorMessage = documentReadError(error);
  }
  private viewFor(doc: ElectronicDocumentResponse) {
    return documentView({ hasElectronicDocument: true, documentId: doc?.id, documentType: doc?.documentType,
      fullNumber: doc?.fullNumber, status: doc?.status, environment: doc?.environment });
  }
  get documentPresentation() { return this.billingDocument ? this.viewFor(this.billingDocument) : null; }
  private salesRole(): boolean { return this.current() && !!this.currentUser?.roles.some(role => ["ADMIN", "SUPERVISOR", "CAJERO"].includes(role)); }
  canIssue(): boolean { return this.salesRole() && this.sale?.status === "COMPLETED" && this.documentPhase === "absent"; }
  voidRole(): boolean { return this.current() && !!this.currentUser?.roles.some(role => ["ADMIN", "SUPERVISOR"].includes(role)) && this.sale?.status === "COMPLETED"; }
  get pendingVoid(): boolean {
    return this.voidRole() && !!this.sale && !!this.currentUser
      && !!this.voidAttempts.get(saleVoidAttemptKey(this.currentUser.id, this.sale.id));
  }
  canVoidSale(): boolean {
    return this.voidRole() && !this.pendingVoid
      && (this.documentPhase === "absent" || (this.documentPhase === "present" && !this.hasBlockingBillingDocument()));
  }
  hasBlockingBillingDocument(): boolean { return blocksInternalVoid(this.billingDocument); }
  get voidHint(): string {
    return this.pendingVoid ? "La anulación previa todavía está por verificar."
      : this.documentPhase === "loading" ? "Verifica el estado documental antes de anular."
      : this.documentPhase === "error" ? "La anulación no está disponible mientras el estado documental no pueda verificarse."
      : "La documentación electrónica activa impide la anulación interna. Gestiona el caso desde Facturación.";
  }
  productName(item: SaleItemResponse): string {
    return item.productNameSnapshot != null ? item.productNameSnapshot.trim() || "Descripción original no disponible"
      : item.productName?.trim() || "Descripción no disponible";
  }
  productSource(item: SaleItemResponse): string {
    if (item.productNameSnapshot != null && item.skuSnapshot == null) return "Descripción original · SKU original no disponible";
    if (item.productNameSnapshot == null && item.skuSnapshot != null) return "Nombre del catálogo actual · identidad histórica incompleta";
    return item.productNameSnapshot != null ? "Descripción original de la venta" : "Catálogo actual · descripción original no disponible";
  }
  productSku(item: SaleItemResponse): string | null { return item.skuSnapshot ?? (item.productNameSnapshot == null ? item.sku : null); }
  paymentMethodLabel(method: string): string { return ({ CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia" } as Record<string, string>)[method] || "Método no disponible"; }
  formatCurrency(value: number): string { return Number.isFinite(value) ? this.currency.format(value) : "No disponible"; }
  formatDateTime = formatCommercialInstant;
  formatQuantity(item: SaleItemResponse): string {
    return typeof item.quantityText === "string" && /^\d+(?:\.\d+)?$/.test(item.quantityText) ? item.quantityText
      : new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(item.quantity);
  }
  settlementLabel(sale: SaleResponse): string {
    if (sale.payments.some(payment => payment.paymentMethod === "CASH")) return "Vuelto";
    const difference = sale.paidAmount - sale.totalAmount;
    return difference > 0 ? "Diferencia" : difference < 0 ? "Saldo" : "Vuelto";
  }
  settlementDisplayAmount(sale: SaleResponse): number | null {
    if (sale.payments.some(payment => payment.paymentMethod === "CASH")) return sale.changeAmount;
    const difference = sale.paidAmount - sale.totalAmount;
    return difference === 0 ? null : Math.abs(difference);
  }
  ngOnDestroy(): void { this.destroyed = true; this.generation++; this.documentGeneration++; this.cancelReads(); this.routeSubscription.unsubscribe(); }
}
