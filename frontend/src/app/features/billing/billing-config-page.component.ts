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
    <section class="card">
      <header class="header">
        <div>
          <h1>Facturacion - Configuracion tributaria</h1>
          <p class="muted">Configura perfil de emision por ambiente.</p>
        </div>
      </header>

      <p class="error" *ngIf="permissionMessage">{{ permissionMessage }}</p>
      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <form [formGroup]="form" class="grid" (ngSubmit)="submit()">
        <label>
          Ambiente *
          <select
            formControlName="environment"
            (change)="onEnvironmentChanged()"
          >
            <option *ngFor="let env of environments" [value]="env">
              {{ env }}
            </option>
          </select>
        </label>

        <label>
          RUC *
          <input type="text" maxlength="11" formControlName="ruc" />
          <small class="error" *ngIf="isInvalid('ruc')">
            RUC obligatorio de 11 digitos.
          </small>
        </label>

        <label>
          Razon social *
          <input type="text" maxlength="180" formControlName="legalName" />
          <small class="error" *ngIf="isInvalid('legalName')">
            legalName es obligatorio.
          </small>
        </label>

        <label>
          Nombre comercial
          <input type="text" maxlength="180" formControlName="tradeName" />
        </label>

        <label class="full">
          Direccion fiscal *
          <input type="text" maxlength="240" formControlName="fiscalAddress" />
          <small class="error" *ngIf="isInvalid('fiscalAddress')">
            fiscalAddress es obligatorio.
          </small>
        </label>

        <label>
          Ubigeo
          <input type="text" maxlength="6" formControlName="ubigeo" />
        </label>

        <label>
          Departamento
          <input type="text" maxlength="120" formControlName="department" />
        </label>

        <label>
          Provincia
          <input type="text" maxlength="120" formControlName="province" />
        </label>

        <label>
          Distrito
          <input type="text" maxlength="120" formControlName="district" />
        </label>

        <label class="full">
          Ruta o alias de certificado
          <input
            type="text"
            maxlength="240"
            formControlName="certificatePath"
          />
        </label>

        <label class="full">
          Password certificado (si aplica)
          <input
            type="password"
            maxlength="120"
            formControlName="certificatePassword"
          />
        </label>

        <label class="inline">
          <input type="checkbox" formControlName="active" />
          Perfil activo
        </label>

        <div class="actions full">
          <button
            type="button"
            class="secondary"
            (click)="loadProfile()"
            [disabled]="loading || !canEdit"
          >
            Recargar
          </button>
          <button type="submit" [disabled]="loading || !canEdit">
            {{ loading ? "Guardando..." : saveButtonLabel }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      .card {
        background: #fff;
        border-radius: 0.5rem;
        padding: 1rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        display: grid;
        gap: 1rem;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      h1 {
        margin: 0;
      }
      .muted {
        margin: 0.25rem 0 0;
        color: #4b5563;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: 0.65rem;
      }
      .full {
        grid-column: 1 / -1;
      }
      .inline {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
      select,
      button {
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
      }
      button {
        border: 0;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
      }
      .secondary {
        background: #374151;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      .success {
        margin: 0;
        color: #166534;
      }
      @media (max-width: 900px) {
        .grid {
          grid-template-columns: 1fr;
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
