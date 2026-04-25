import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="login-wrapper">
      <form [formGroup]="form" (ngSubmit)="submit()" class="card">
        <h1>ERP/POS Login</h1>

        <label>
          Usuario o Email
          <input type="text" formControlName="usernameOrEmail" />
        </label>

        <label>
          Password
          <input type="password" formControlName="password" />
        </label>

        <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>

        <button type="submit" [disabled]="form.invalid || loading">
          {{ loading ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>
    </section>
  `,
  styles: [`
    .login-wrapper { min-height: 100vh; display: grid; place-items: center; background: #e5e7eb; }
    .card { width: 360px; background: #fff; padding: 1.25rem; border-radius: .5rem; display: grid; gap: 1rem; }
    label { display: grid; gap: .3rem; font-size: .92rem; }
    input { padding: .55rem; border: 1px solid #d1d5db; border-radius: .35rem; }
    button { padding: .65rem; border: 0; border-radius: .35rem; background: #111827; color: #fff; cursor: pointer; }
    .error { color: #b91c1c; margin: 0; }
  `]
})
export class LoginComponent {
  loading = false;
  errorMessage = '';

  readonly form = this.formBuilder.nonNullable.group({
    usernameOrEmail: ['', Validators.required],
    password: ['', Validators.required]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Credenciales invalidas';
      }
    });
  }
}

