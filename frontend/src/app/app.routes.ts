import { Routes } from "@angular/router";

import { authGuard } from "./core/guards/auth.guard";
import { roleGuard } from "./core/guards/role.guard";
import { CategoriesPageComponent } from "./features/catalog/categories-page.component";
import { ProductFormComponent } from "./features/catalog/product-form.component";
import { ProductImportPageComponent } from "./features/catalog/product-import-page.component";
import { ProductsPageComponent } from "./features/catalog/products-page.component";
import { UnitsPageComponent } from "./features/catalog/units-page.component";
import { BillingConfigPageComponent } from "./features/billing/billing-config-page.component";
import { BillingDocumentDetailPageComponent } from "./features/billing/billing-document-detail-page.component";
import { BillingDocumentsPageComponent } from "./features/billing/billing-documents-page.component";
import { BillingIssueFromSalePageComponent } from "./features/billing/billing-issue-from-sale-page.component";
import { BillingSeriesPageComponent } from "./features/billing/billing-series-page.component";
import { ProductCleanupPreviewPageComponent } from "./features/admin/product-cleanup-preview-page.component";
import { DashboardComponent } from "./features/dashboard/dashboard.component";
import { OutboxEventDetailPageComponent } from "./features/integrations/outbox-event-detail-page.component";
import { OutboxEventsPageComponent } from "./features/integrations/outbox-events-page.component";
import { AdjustmentsPageComponent } from "./features/inventory/adjustments-page.component";
import { InitialStockPageComponent } from "./features/inventory/initial-stock-page.component";
import { KardexPageComponent } from "./features/inventory/kardex-page.component";
import { StockPageComponent } from "./features/inventory/stock-page.component";
import { TransfersPageComponent } from "./features/inventory/transfers-page.component";
import { WarehousesPageComponent } from "./features/inventory/warehouses-page.component";
import { LoginComponent } from "./features/login/login.component";
import { CashRegisterReportPageComponent } from "./features/reports/cash-register-report-page.component";
import { ElectronicDocumentsReportPageComponent } from "./features/reports/electronic-documents-report-page.component";
import { InventoryMovementsReportPageComponent } from "./features/reports/inventory-movements-report-page.component";
import { LowStockReportPageComponent } from "./features/reports/low-stock-report-page.component";
import { PurchasesReportPageComponent } from "./features/reports/purchases-report-page.component";
import { QuotesReportPageComponent } from "./features/reports/quotes-report-page.component";
import { ReportsDashboardPageComponent } from "./features/reports/reports-dashboard-page.component";
import { SalesReportPageComponent } from "./features/reports/sales-report-page.component";
import { TopProductsReportPageComponent } from "./features/reports/top-products-report-page.component";
import { PurchaseOrderDetailPageComponent } from "./features/purchases/purchase-order-detail-page.component";
import { PurchaseOrderEditPageComponent } from "./features/purchases/purchase-order-edit-page.component";
import { PurchaseOrderNewPageComponent } from "./features/purchases/purchase-order-new-page.component";
import { PurchaseOrderReceivePageComponent } from "./features/purchases/purchase-order-receive-page.component";
import { PurchaseOrdersPageComponent } from "./features/purchases/purchase-orders-page.component";
import { SuppliersPageComponent } from "./features/purchases/suppliers-page.component";
import { QuoteConvertPageComponent } from "./features/quotes/quote-convert-page.component";
import { QuoteDetailPageComponent } from "./features/quotes/quote-detail-page.component";
import { QuoteEditPageComponent } from "./features/quotes/quote-edit-page.component";
import { QuoteNewPageComponent } from "./features/quotes/quote-new-page.component";
import { QuotesPageComponent } from "./features/quotes/quotes-page.component";
import { CashRegisterPageComponent } from "./features/sales/cash-register-page.component";
import { PosPageComponent } from "./features/sales/pos-page.component";
import { SaleDetailPageComponent } from "./features/sales/sale-detail-page.component";
import { SaleVoidPageComponent } from "./features/sales/sale-void-page.component";
import { SalesPageComponent } from "./features/sales/sales-page.component";
import { LayoutComponent } from "./shared/layout/layout.component";

const ROLES_ADMIN = ["ADMIN"];
const ROLES_CATALOG = ["ADMIN", "ALMACENERO", "SUPERVISOR"];
const ROLES_INVENTORY_STOCK = ["ADMIN", "ALMACENERO", "SUPERVISOR", "CAJERO"];
const ROLES_INVENTORY_MANAGEMENT = ["ADMIN", "ALMACENERO"];
const ROLES_INVENTORY_KARDEX = ["ADMIN", "SUPERVISOR"];
const ROLES_SALES = ["ADMIN", "CAJERO", "SUPERVISOR"];
const ROLES_SALES_VOID = ["ADMIN", "SUPERVISOR"];
const ROLES_PURCHASES = ["ADMIN", "ALMACENERO", "SUPERVISOR"];
const ROLES_PURCHASES_MANAGEMENT = ["ADMIN", "ALMACENERO"];
const ROLES_REPORTS = ["ADMIN", "SUPERVISOR", "ALMACENERO"];
const ROLES_REPORTS_COMMERCIAL = ["ADMIN", "SUPERVISOR"];

export const routes: Routes = [
  { path: "login", component: LoginComponent },
  {
    path: "",
    component: LayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [roleGuard],
    children: [
      { path: "dashboard", component: DashboardComponent },
      {
        path: "pos",
        component: PosPageComponent,
        data: { allowedRoles: ROLES_SALES },
      },
      {
        path: "caja",
        component: CashRegisterPageComponent,
        data: { allowedRoles: ROLES_SALES },
      },
      {
        path: "ventas",
        component: SalesPageComponent,
        data: { allowedRoles: ROLES_SALES },
      },
      {
        path: "ventas/:id/anular",
        component: SaleVoidPageComponent,
        data: { allowedRoles: ROLES_SALES_VOID },
      },
      {
        path: "ventas/:id",
        component: SaleDetailPageComponent,
        data: { allowedRoles: ROLES_SALES },
      },
      {
        path: "admin/test-data-cleanup/products",
        component: ProductCleanupPreviewPageComponent,
        data: { allowedRoles: ROLES_ADMIN },
      },
      {
        path: "catalogo",
        pathMatch: "full",
        redirectTo: "catalogo/productos",
        data: { allowedRoles: ROLES_CATALOG },
      },
      {
        path: "catalogo/productos",
        component: ProductsPageComponent,
        data: { allowedRoles: ROLES_CATALOG },
      },
      {
        path: "catalogo/productos/importar",
        component: ProductImportPageComponent,
        data: { allowedRoles: ROLES_ADMIN },
      },
      {
        path: "catalogo/productos/nuevo",
        component: ProductFormComponent,
        data: { allowedRoles: ROLES_CATALOG },
      },
      {
        path: "catalogo/productos/:id/editar",
        component: ProductFormComponent,
        data: { allowedRoles: ROLES_CATALOG },
      },
      {
        path: "catalogo/categorias",
        component: CategoriesPageComponent,
        data: { allowedRoles: ROLES_CATALOG },
      },
      {
        path: "catalogo/unidades",
        component: UnitsPageComponent,
        data: { allowedRoles: ROLES_CATALOG },
      },
      {
        path: "inventario",
        pathMatch: "full",
        redirectTo: "inventario/stock",
        data: { allowedRoles: ROLES_INVENTORY_STOCK },
      },
      {
        path: "inventario/almacenes",
        component: WarehousesPageComponent,
        data: { allowedRoles: ROLES_CATALOG },
      },
      {
        path: "inventario/stock",
        component: StockPageComponent,
        data: { allowedRoles: ROLES_INVENTORY_STOCK },
      },
      {
        path: "inventario/stock-inicial",
        component: InitialStockPageComponent,
        data: { allowedRoles: ROLES_INVENTORY_MANAGEMENT },
      },
      {
        path: "inventario/ajustes",
        component: AdjustmentsPageComponent,
        data: { allowedRoles: ROLES_INVENTORY_MANAGEMENT },
      },
      {
        path: "inventario/transferencias",
        component: TransfersPageComponent,
        data: { allowedRoles: ROLES_INVENTORY_MANAGEMENT },
      },
      {
        path: "inventario/kardex",
        component: KardexPageComponent,
        data: { allowedRoles: ROLES_INVENTORY_KARDEX },
      },
      {
        path: "compras",
        pathMatch: "full",
        redirectTo: "compras/ordenes",
        data: { allowedRoles: ROLES_PURCHASES },
      },
      {
        path: "compras/proveedores",
        component: SuppliersPageComponent,
        data: { allowedRoles: ROLES_PURCHASES },
      },
      {
        path: "compras/ordenes",
        component: PurchaseOrdersPageComponent,
        data: { allowedRoles: ROLES_PURCHASES },
      },
      {
        path: "compras/ordenes/nueva",
        component: PurchaseOrderNewPageComponent,
        data: { allowedRoles: ROLES_PURCHASES_MANAGEMENT },
      },
      {
        path: "compras/ordenes/:id",
        component: PurchaseOrderDetailPageComponent,
        data: { allowedRoles: ROLES_PURCHASES },
      },
      {
        path: "compras/ordenes/:id/editar",
        component: PurchaseOrderEditPageComponent,
        data: { allowedRoles: ROLES_PURCHASES_MANAGEMENT },
      },
      {
        path: "compras/ordenes/:id/recibir",
        component: PurchaseOrderReceivePageComponent,
        data: { allowedRoles: ROLES_PURCHASES_MANAGEMENT },
      },
      {
        path: "cotizaciones",
        component: QuotesPageComponent,
        data: { allowedRoles: ROLES_SALES },
      },
      {
        path: "cotizaciones/nueva",
        component: QuoteNewPageComponent,
        data: { allowedRoles: ROLES_SALES },
      },
      {
        path: "cotizaciones/:id/editar",
        component: QuoteEditPageComponent,
        data: { allowedRoles: ROLES_SALES },
      },
      {
        path: "cotizaciones/:id/convertir",
        component: QuoteConvertPageComponent,
        data: { allowedRoles: ROLES_SALES },
      },
      {
        path: "cotizaciones/:id",
        component: QuoteDetailPageComponent,
        data: { allowedRoles: ROLES_SALES },
      },
      {
        path: "facturacion",
        pathMatch: "full",
        redirectTo: "facturacion/comprobantes",
        data: { allowedRoles: ROLES_SALES },
      },
      {
        path: "facturacion/configuracion",
        component: BillingConfigPageComponent,
        data: { allowedRoles: ROLES_ADMIN },
      },
      {
        path: "facturacion/series",
        component: BillingSeriesPageComponent,
        data: { allowedRoles: ROLES_ADMIN },
      },
      {
        path: "facturacion/comprobantes",
        component: BillingDocumentsPageComponent,
        data: { allowedRoles: ROLES_SALES },
      },
      {
        path: "facturacion/comprobantes/:id",
        component: BillingDocumentDetailPageComponent,
        data: { allowedRoles: ROLES_SALES },
      },
      {
        path: "facturacion/emitir/:saleId",
        component: BillingIssueFromSalePageComponent,
        data: { allowedRoles: ROLES_SALES },
      },
      {
        path: "reportes",
        component: ReportsDashboardPageComponent,
        data: { allowedRoles: ROLES_REPORTS },
      },
      {
        path: "reportes/ventas",
        component: SalesReportPageComponent,
        data: { allowedRoles: ROLES_REPORTS_COMMERCIAL },
      },
      {
        path: "reportes/caja",
        component: CashRegisterReportPageComponent,
        data: { allowedRoles: ROLES_REPORTS_COMMERCIAL },
      },
      {
        path: "reportes/stock-bajo",
        component: LowStockReportPageComponent,
        data: { allowedRoles: ROLES_REPORTS },
      },
      {
        path: "reportes/movimientos-inventario",
        component: InventoryMovementsReportPageComponent,
        data: { allowedRoles: ROLES_REPORTS },
      },
      {
        path: "reportes/compras",
        component: PurchasesReportPageComponent,
        data: { allowedRoles: ROLES_REPORTS_COMMERCIAL },
      },
      {
        path: "reportes/productos-mas-vendidos",
        component: TopProductsReportPageComponent,
        data: { allowedRoles: ROLES_REPORTS_COMMERCIAL },
      },
      {
        path: "reportes/cotizaciones",
        component: QuotesReportPageComponent,
        data: { allowedRoles: ROLES_REPORTS_COMMERCIAL },
      },
      {
        path: "reportes/comprobantes",
        component: ElectronicDocumentsReportPageComponent,
        data: { allowedRoles: ROLES_REPORTS_COMMERCIAL },
      },
      {
        path: "integraciones/eventos",
        component: OutboxEventsPageComponent,
        data: { allowedRoles: ROLES_ADMIN },
      },
      {
        path: "integraciones/eventos/:id",
        component: OutboxEventDetailPageComponent,
        data: { allowedRoles: ROLES_ADMIN },
      },
      { path: "", pathMatch: "full", redirectTo: "dashboard" },
    ],
  },
  { path: "**", redirectTo: "dashboard" },
];
