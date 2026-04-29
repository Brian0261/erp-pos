import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="login-shell">
      <div class="login-grid">
        <aside class="brand-panel" aria-label="InkToy branding">
          <img
            src="assets/images/brand/logo-inktoy.png"
            alt="InkToy"
            class="brand-logo"
          />
          <p class="brand-tagline">Sistema ERP/POS</p>
          <h1>Bienvenido a InkToy</h1>
          <p class="brand-copy">
            Plataforma operativa para ventas, caja, inventario y compras de
            tienda escolar.
          </p>
          <p class="brand-note">Uso interno autorizado.</p>
        </aside>

        <form [formGroup]="form" (ngSubmit)="submit()" class="card">
          <header class="card-header">
            <h2>Iniciar sesion</h2>
            <p class="muted">Ingresa con tu usuario o email registrado.</p>
          </header>

          <label>
            Usuario o Email
            <input
              type="text"
              formControlName="usernameOrEmail"
              autocomplete="username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              formControlName="password"
              autocomplete="current-password"
            />
          </label>

          <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>

          <button type="submit" [disabled]="form.invalid || loading">
            {{ loading ? "Ingresando..." : "Ingresar" }}
          </button>

          <footer class="card-footer">
            <p>InkToy - Sistema ERP/POS</p>
          </footer>
        </form>
      </div>
    </section>
  `,
  styles: [
    `
      .login-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1.25rem;
        background:
          radial-gradient(
            circle at 15% 20%,
            rgba(242, 74, 11, 0.12),
            transparent 30%
          ),
          radial-gradient(
            circle at 85% 15%,
            rgba(18, 23, 184, 0.15),
            transparent 33%
          ),
          radial-gradient(
            circle at 55% 90%,
            rgba(244, 194, 13, 0.13),
            transparent 32%
          ),
          var(--color-bg-canvas);
      }

      .login-grid {
        width: min(980px, 100%);
        display: grid;
        grid-template-columns: 1.1fr minmax(320px, 420px);
        border-radius: var(--radius-lg);
        overflow: hidden;
        box-shadow: var(--shadow-md);
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-default);
      }

      .brand-panel {
        background: linear-gradient(
          160deg,
          #1217b8 0%,
          #1f32d6 45%,
          #f24a0b 120%
        );
        color: #ffffff;
        padding: 2rem;
        display: grid;
        align-content: center;
        gap: 0.9rem;
      }

      .brand-logo {
        width: min(300px, 100%);
        background: #ffffff;
        border-radius: 12px;
        padding: 0.35rem;
        box-shadow: 0 8px 20px rgba(16, 17, 20, 0.22);
      }

      .brand-tagline {
        display: inline-flex;
        width: fit-content;
        padding: 0.28rem 0.65rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.15);
        font-size: 0.84rem;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .brand-panel h1 {
        margin: 0;
        font-family: var(--font-family-display);
        font-size: clamp(1.5rem, 2.5vw, 2.05rem);
        line-height: 1.15;
      }

      .brand-copy {
        margin: 0;
        color: rgba(255, 255, 255, 0.92);
        max-width: 35ch;
      }

      .brand-note {
        margin: 0.4rem 0 0;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.86);
      }

      .card {
        background: var(--color-bg-surface);
        padding: 1.5rem;
        display: grid;
        align-content: center;
        gap: 0.95rem;
      }

      .card-header {
        display: grid;
        gap: 0.28rem;
      }

      .card-header h2 {
        margin: 0;
        color: var(--color-text-primary);
        font-size: 1.45rem;
      }

      .muted {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: 0.92rem;
      }

      label {
        display: grid;
        gap: 0.3rem;
        font-size: 0.92rem;
        color: var(--color-text-primary);
        font-weight: 700;
      }

      input {
        padding: 0.62rem 0.7rem;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        background: #ffffff;
        color: var(--color-text-primary);
      }

      input:focus {
        border-color: var(--color-brand-primary);
        box-shadow: 0 0 0 3px rgba(18, 23, 184, 0.14);
        outline: none;
      }

      button {
        padding: 0.68rem;
        border: 0;
        border-radius: var(--radius-sm);
        background: var(--color-brand-primary);
        color: #ffffff;
        font-weight: 700;
        cursor: pointer;
      }

      button:hover:not(:disabled) {
        filter: brightness(1.03);
      }

      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .error {
        color: var(--color-danger);
        margin: 0;
        font-size: 0.9rem;
      }

      .card-footer p {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: 0.8rem;
        text-align: center;
      }

      @media (max-width: 900px) {
        .login-grid {
          grid-template-columns: 1fr;
        }

        .brand-panel {
          padding: 1.25rem;
        }

        .brand-copy,
        .brand-note {
          display: none;
        }
      }
    `,
  ],
})
export class LoginComponent {
  loading = false;
  errorMessage = "";

  readonly form = this.formBuilder.nonNullable.group({
    usernameOrEmail: ["", Validators.required],
    password: ["", Validators.required],
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = "";

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(["/dashboard"]);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = "Credenciales invalidas";
      },
    });
  }
}
