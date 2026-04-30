import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import {
  BILLING_ENVIRONMENTS,
  BillingEnvironment,
  CompanyBillingProfileRequest,
  CompanyBillingProfileResponse,
} from "./data/billing.models";
import { CompanyBillingProfileService } from "./data/company-billing-profile.service";
import { toHttpErrorMessage } from "./data/http-error-message";

interface BillingProfileExtras {
  tradeName: string;
  ubigeo: string;
  department: string;
  province: string;
  district: string;
}

@Component({
  selector: "app-billing-config-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card billing-config-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Facturacion electronica MVP</p>
          <h1 class="ui-page-title">Configuracion tributaria</h1>
          <p class="ui-page-description">
            Define datos de empresa, direccion fiscal y certificado por ambiente
            sin alterar reglas de emision.
          </p>
        </div>
        <span class="ui-badge env-badge">
          {{ form.controls.environment.value || "LOCAL" }}
        </span>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="permissionMessage">
        {{ permissionMessage }}
      </p>
      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <form [formGroup]="form" class="form-layout" (ngSubmit)="submit()">
        <section class="form-section">
          <header class="section-head">
            <h2>Ambiente y estado</h2>
          </header>

          <div class="form-grid form-grid--two">
            <label class="field">
              <span>Ambiente *</span>
              <select
                formControlName="environment"
                (change)="onEnvironmentChanged()"
              >
                <option *ngFor="let env of environments" [value]="env">
                  {{ env }}
                </option>
              </select>
            </label>

            <label class="field field--inline">
              <input type="checkbox" formControlName="active" />
              <span>Perfil activo</span>
            </label>
          </div>
        </section>

        <section class="form-section">
          <header class="section-head">
            <h2>Datos de empresa</h2>
          </header>

          <div class="form-grid form-grid--two">
            <label class="field">
              <span>RUC *</span>
              <input type="text" maxlength="11" formControlName="ruc" />
              <small class="field-error" *ngIf="isInvalid('ruc')">
                RUC obligatorio de 11 digitos.
              </small>
            </label>

            <label class="field">
              <span>Razon social *</span>
              <input type="text" maxlength="180" formControlName="legalName" />
              <small class="field-error" *ngIf="isInvalid('legalName')">
                legalName es obligatorio.
              </small>
            </label>

            <label class="field full">
              <span>Nombre comercial</span>
              <input type="text" maxlength="180" formControlName="tradeName" />
            </label>
          </div>
        </section>

        <section class="form-section">
          <header class="section-head">
            <h2>Direccion fiscal</h2>
          </header>

          <div class="form-grid form-grid--two">
            <label class="field full">
              <span>Direccion fiscal *</span>
              <input
                type="text"
                maxlength="240"
                formControlName="fiscalAddress"
              />
              <small class="field-error" *ngIf="isInvalid('fiscalAddress')">
                fiscalAddress es obligatorio.
              </small>
            </label>

            <label class="field">
              <span>Ubigeo</span>
              <input type="text" maxlength="6" formControlName="ubigeo" />
            </label>

            <label class="field">
              <span>Departamento</span>
              <input type="text" maxlength="120" formControlName="department" />
            </label>

            <label class="field">
              <span>Provincia</span>
              <input type="text" maxlength="120" formControlName="province" />
            </label>

            <label class="field">
              <span>Distrito</span>
              <input type="text" maxlength="120" formControlName="district" />
            </label>
          </div>
        </section>

        <section class="form-section">
          <header class="section-head">
            <h2>Certificado</h2>
          </header>

          <div class="form-grid">
            <label class="field full">
              <span>Ruta o alias de certificado</span>
              <input
                type="text"
                maxlength="240"
                formControlName="certificatePath"
              />
            </label>

            <label class="field full">
              <span>Password certificado (si aplica)</span>
              <input
                type="password"
                maxlength="120"
                formControlName="certificatePassword"
              />
            </label>
          </div>
        </section>

        <div class="form-actions">
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="loadProfile()"
            [disabled]="loading || !canEdit"
          >
            Recargar
          </button>
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="loading || !canEdit"
          >
            {{ loading ? "Guardando..." : saveButtonLabel }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      .billing-config-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .env-badge {
        background: #ede9fe;
        color: #6d28d9;
        font-weight: 700;
      }

      .form-layout {
        display: grid;
        gap: var(--space-4);
      }

      .form-section {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
      }

      .section-head {
        border-bottom: 1px solid var(--color-border-default);
        padding-bottom: var(--space-2);
      }

      .form-grid {
        display: grid;
        gap: var(--space-3);
      }

      .form-grid--two {
        grid-template-columns: repeat(2, minmax(220px, 1fr));
      }

      .full {
        grid-column: 1 / -1;
      }

      .field {
        display: grid;
        gap: var(--space-1);
      }

      .field > span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .field--inline {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        min-height: 42px;
      }

      .field--inline span {
        font-size: var(--font-size-sm);
      }

      .field--inline input {
        width: auto;
      }

      input,
      select {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
      }

      .field-error {
        margin: 0;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        font-weight: 700;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 900px) {
        .billing-config-page {
          padding: var(--space-4);
        }

        .form-grid--two {
          grid-template-columns: 1fr;
        }

        .form-actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class BillingConfigPageComponent implements OnInit {
  readonly environments = BILLING_ENVIRONMENTS;

  readonly form = this.formBuilder.group({
    ruc: ["", [Validators.required, Validators.pattern(/^\d{11}$/)]],
    legalName: ["", [Validators.required, Validators.maxLength(180)]],
    tradeName: ["", Validators.maxLength(180)],
    fiscalAddress: ["", [Validators.required, Validators.maxLength(240)]],
    ubigeo: ["", Validators.maxLength(6)],
    department: ["", Validators.maxLength(120)],
    province: ["", Validators.maxLength(120)],
    district: ["", Validators.maxLength(120)],
    environment: ["LOCAL" as BillingEnvironment, Validators.required],
    certificatePath: ["", Validators.maxLength(240)],
    certificatePassword: ["", Validators.maxLength(120)],
    active: [true],
  });

  canEdit = false;
  loading = false;

  private currentProfile: CompanyBillingProfileResponse | null = null;

  permissionMessage = "";
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly profileService: CompanyBillingProfileService,
  ) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.canEdit = user.roles.includes("ADMIN");

        if (!this.canEdit) {
          this.permissionMessage =
            "Solo ADMIN puede editar configuracion tributaria.";
          this.form.disable();
          return;
        }

        this.form.enable();
        this.loadProfile();
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
        this.form.disable();
      },
    });
  }

  get saveButtonLabel(): string {
    return this.currentProfile ? "Actualizar perfil" : "Crear perfil";
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  onEnvironmentChanged(): void {
    this.errorMessage = "";
    this.successMessage = "";
    if (!this.canEdit) {
      return;
    }
    this.loadProfile();
  }

  loadProfile(): void {
    if (!this.canEdit) {
      return;
    }

    const environmentValue = this.form.controls.environment.value;
    if (!environmentValue) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";

    this.profileService.get(environmentValue).subscribe({
      next: (profile) => {
        this.loading = false;
        this.currentProfile = profile;
        this.form.patchValue({
          ruc: profile.ruc,
          legalName: profile.legalName,
          fiscalAddress: profile.fiscalAddress,
          environment: profile.environment,
          certificatePath: profile.certificatePath || "",
          certificatePassword: "",
          active: profile.active,
        });
        this.patchExtras(profile.environment);
      },
      error: (error: unknown) => {
        this.loading = false;
        this.currentProfile = null;

        const message = toHttpErrorMessage(
          error,
          "No se pudo cargar el perfil tributario.",
        );

        if (message.startsWith("No encontrado:")) {
          this.successMessage =
            "No existe perfil para este ambiente. Completa el formulario para crearlo.";
          this.form.patchValue({
            ruc: "",
            legalName: "",
            fiscalAddress: "",
            certificatePath: "",
            certificatePassword: "",
            active: true,
          });
          this.patchExtras(environmentValue);
          return;
        }

        this.errorMessage = message;
      },
    });
  }

  submit(): void {
    if (!this.canEdit) {
      return;
    }

    this.errorMessage = "";
    this.successMessage = "";

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CompanyBillingProfileRequest = {
      ruc: String(raw.ruc || "").trim(),
      legalName: String(raw.legalName || "").trim(),
      fiscalAddress: String(raw.fiscalAddress || "").trim(),
      environment: (raw.environment || "LOCAL") as BillingEnvironment,
      certificatePath: this.normalizeOptional(raw.certificatePath),
      certificatePassword: this.normalizeOptional(raw.certificatePassword),
      active: !!raw.active,
    };

    this.persistExtras(payload.environment, {
      tradeName: this.normalizeOptional(raw.tradeName) || "",
      ubigeo: this.normalizeOptional(raw.ubigeo) || "",
      department: this.normalizeOptional(raw.department) || "",
      province: this.normalizeOptional(raw.province) || "",
      district: this.normalizeOptional(raw.district) || "",
    });

    this.loading = true;

    const request$ = this.currentProfile
      ? this.profileService.update(payload)
      : this.profileService.create(payload);

    request$.subscribe({
      next: (profile) => {
        this.loading = false;
        this.currentProfile = profile;
        this.successMessage = this.currentProfile
          ? "Perfil tributario guardado correctamente."
          : "Perfil tributario creado correctamente.";
        this.form.patchValue({
          certificatePassword: "",
        });
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo guardar el perfil tributario.",
        );
      },
    });
  }

  private patchExtras(environmentValue: BillingEnvironment): void {
    const extras = this.readExtras(environmentValue);
    this.form.patchValue({
      tradeName: extras.tradeName,
      ubigeo: extras.ubigeo,
      department: extras.department,
      province: extras.province,
      district: extras.district,
    });
  }

  private persistExtras(
    environmentValue: BillingEnvironment,
    extras: BillingProfileExtras,
  ): void {
    localStorage.setItem(
      this.extrasStorageKey(environmentValue),
      JSON.stringify(extras),
    );
  }

  private readExtras(
    environmentValue: BillingEnvironment,
  ): BillingProfileExtras {
    try {
      const raw = localStorage.getItem(this.extrasStorageKey(environmentValue));
      if (!raw) {
        return this.emptyExtras();
      }

      const parsed = JSON.parse(raw) as Partial<BillingProfileExtras>;
      return {
        tradeName: typeof parsed.tradeName === "string" ? parsed.tradeName : "",
        ubigeo: typeof parsed.ubigeo === "string" ? parsed.ubigeo : "",
        department:
          typeof parsed.department === "string" ? parsed.department : "",
        province: typeof parsed.province === "string" ? parsed.province : "",
        district: typeof parsed.district === "string" ? parsed.district : "",
      };
    } catch {
      return this.emptyExtras();
    }
  }

  private emptyExtras(): BillingProfileExtras {
    return {
      tradeName: "",
      ubigeo: "",
      department: "",
      province: "",
      district: "",
    };
  }

  private extrasStorageKey(environmentValue: BillingEnvironment): string {
    return `billing_profile_extras_${environmentValue}`;
  }

  private normalizeOptional(value: unknown): string | null {
    const text = String(value ?? "").trim();
    return text ? text : null;
  }
}
