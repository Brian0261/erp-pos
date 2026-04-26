import { Routes } from "@angular/router";

import { authGuard } from "./core/guards/auth.guard";
import { CategoriesPageComponent } from "./features/catalog/categories-page.component";
import { ProductFormComponent } from "./features/catalog/product-form.component";
import { ProductsPageComponent } from "./features/catalog/products-page.component";
import { UnitsPageComponent } from "./features/catalog/units-page.component";
import { DashboardComponent } from "./features/dashboard/dashboard.component";
import { AdjustmentsPageComponent } from "./features/inventory/adjustments-page.component";
import { InitialStockPageComponent } from "./features/inventory/initial-stock-page.component";
import { KardexPageComponent } from "./features/inventory/kardex-page.component";
import { StockPageComponent } from "./features/inventory/stock-page.component";
import { TransfersPageComponent } from "./features/inventory/transfers-page.component";
import { WarehousesPageComponent } from "./features/inventory/warehouses-page.component";
import { LoginComponent } from "./features/login/login.component";
import { PurchaseOrderDetailPageComponent } from "./features/purchases/purchase-order-detail-page.component";
import { PurchaseOrderEditPageComponent } from "./features/purchases/purchase-order-edit-page.component";
import { PurchaseOrderNewPageComponent } from "./features/purchases/purchase-order-new-page.component";
import { PurchaseOrderReceivePageComponent } from "./features/purchases/purchase-order-receive-page.component";
import { PurchaseOrdersPageComponent } from "./features/purchases/purchase-orders-page.component";
import { SuppliersPageComponent } from "./features/purchases/suppliers-page.component";
import { CashRegisterPageComponent } from "./features/sales/cash-register-page.component";
import { PosPageComponent } from "./features/sales/pos-page.component";
import { SaleDetailPageComponent } from "./features/sales/sale-detail-page.component";
import { SaleVoidPageComponent } from "./features/sales/sale-void-page.component";
import { SalesPageComponent } from "./features/sales/sales-page.component";
import { LayoutComponent } from "./shared/layout/layout.component";

export const routes: Routes = [
  { path: "login", component: LoginComponent },
  {
    path: "",
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: "dashboard", component: DashboardComponent },
      { path: "pos", component: PosPageComponent },
      { path: "caja", component: CashRegisterPageComponent },
      { path: "ventas", component: SalesPageComponent },
      { path: "ventas/:id/anular", component: SaleVoidPageComponent },
      { path: "ventas/:id", component: SaleDetailPageComponent },
      { path: "catalogo", pathMatch: "full", redirectTo: "catalogo/productos" },
      { path: "catalogo/productos", component: ProductsPageComponent },
      { path: "catalogo/productos/nuevo", component: ProductFormComponent },
      {
        path: "catalogo/productos/:id/editar",
        component: ProductFormComponent,
      },
      { path: "catalogo/categorias", component: CategoriesPageComponent },
      { path: "catalogo/unidades", component: UnitsPageComponent },
      { path: "inventario", pathMatch: "full", redirectTo: "inventario/stock" },
      { path: "inventario/almacenes", component: WarehousesPageComponent },
      { path: "inventario/stock", component: StockPageComponent },
      {
        path: "inventario/stock-inicial",
        component: InitialStockPageComponent,
      },
      { path: "inventario/ajustes", component: AdjustmentsPageComponent },
      {
        path: "inventario/transferencias",
        component: TransfersPageComponent,
      },
      { path: "inventario/kardex", component: KardexPageComponent },
      { path: "compras", pathMatch: "full", redirectTo: "compras/ordenes" },
      { path: "compras/proveedores", component: SuppliersPageComponent },
      { path: "compras/ordenes", component: PurchaseOrdersPageComponent },
      {
        path: "compras/ordenes/nueva",
        component: PurchaseOrderNewPageComponent,
      },
      {
        path: "compras/ordenes/:id",
        component: PurchaseOrderDetailPageComponent,
      },
      {
        path: "compras/ordenes/:id/editar",
        component: PurchaseOrderEditPageComponent,
      },
      {
        path: "compras/ordenes/:id/recibir",
        component: PurchaseOrderReceivePageComponent,
      },
      { path: "cotizaciones", component: DashboardComponent },
      { path: "facturacion", component: DashboardComponent },
      { path: "reportes", component: DashboardComponent },
      { path: "", pathMatch: "full", redirectTo: "dashboard" },
    ],
  },
  { path: "**", redirectTo: "dashboard" },
];
