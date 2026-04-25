import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { UserProfile } from '../../core/auth/auth.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <h1>Dashboard</h1>
      <p *ngIf="loading">Cargando perfil...</p>

      <ng-container *ngIf="!loading && user">
        <p><strong>Usuario:</strong> {{ user.username }}</p>
        <p><strong>Email:</strong> {{ user.email }}</p>
        <p><strong>Roles:</strong> {{ user.roles.join(', ') }}</p>
      </ng-container>

      <p *ngIf="!loading && !user" class="muted">
        Este modulo estara disponible cuando inicie sesion correctamente.
      </p>
    </section>
  `,
  styles: [`
    .card { background: #fff; border-radius: .5rem; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .muted { color: #6b7280; }
  `]
})
export class DashboardComponent implements OnInit {
  user: UserProfile | null = null;
  loading = true;

  constructor(private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (response) => {
        this.user = response;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}

