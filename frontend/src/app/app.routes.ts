import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { LoginComponent } from './features/login/login.component';
import { LayoutComponent } from './shared/layout/layout.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'pos', component: DashboardComponent },
      { path: 'catalogo', component: DashboardComponent },
      { path: 'inventario', component: DashboardComponent },
      { path: 'cotizaciones', component: DashboardComponent },
      { path: 'facturacion', component: DashboardComponent },
      { path: 'reportes', component: DashboardComponent },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

