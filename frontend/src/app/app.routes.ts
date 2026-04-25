import { Routes } from "@angular/router";

import { authGuard } from "./core/guards/auth.guard";
import { CategoriesPageComponent } from "./features/catalog/categories-page.component";
import { ProductFormComponent } from "./features/catalog/product-form.component";
import { ProductsPageComponent } from "./features/catalog/products-page.component";
import { UnitsPageComponent } from "./features/catalog/units-page.component";
import { DashboardComponent } from "./features/dashboard/dashboard.component";
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
      { path: "inventario", component: DashboardComponent },
      { path: "cotizaciones", component: DashboardComponent },
      { path: "facturacion", component: DashboardComponent },
      { path: "reportes", component: DashboardComponent },
      { path: "", pathMatch: "full", redirectTo: "dashboard" },
    ],
  },
  { path: "**", redirectTo: "dashboard" },
];
