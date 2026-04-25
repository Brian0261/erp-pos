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
import { LayoutComponent } from "./shared/layout/layout.component";

export const routes: Routes = [
  { path: "login", component: LoginComponent },
  {
    path: "",
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: "dashboard", component: DashboardComponent },
      { path: "pos", component: DashboardComponent },
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
      { path: "cotizaciones", component: DashboardComponent },
      { path: "facturacion", component: DashboardComponent },
      { path: "reportes", component: DashboardComponent },
      { path: "", pathMatch: "full", redirectTo: "dashboard" },
    ],
  },
  { path: "**", redirectTo: "dashboard" },
];
