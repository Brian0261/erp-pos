import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import {
  EcommerceAdminBrandRequest,
  EcommerceAdminBrandResponse,
} from "./data/ecommerce-admin.models";
import { EcommerceAdminService } from "./data/ecommerce-admin.service";
import { toHttpErrorMessage } from "./data/http-error-message";

@Component({
  selector: "app-ecommerce-brands-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card ecommerce-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Catálogo online</p>
          <h1 class="ui-page-title">Marcas ecommerce</h1>
          <p class="ui-page-description">
            Administra marcas para perfiles online con control de estado y slug.
          </p>
        </div>

        <div class="header-actions">
          <button
            *ngIf="canManage"
            type="button"
            class="ui-button ui-button--primary"
            (click)="openCreateForm()"
            [disabled]="loading"
          >
            Nueva marca
          </button>

          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="loadBrands(true)"
            [disabled]="loading || !canView"
          >
            Actualizar
          </button>
        </div>
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
      <p class="ui-alert ui-alert--info" *ngIf="loading">Cargando marcas ecommerce...</p>

      <section class="ui-module-section" *ngIf="showForm && canManage">
        <header class="section-head">
          <h2>{{ editingId ? "Editar marca" : "Nueva marca" }}</h2>
        </header>

        <form [formGroup]="form" class="form-grid" (ngSubmit)="submit()">
          <label class="field">
            <span>Nombre</span>
            <input type="text" formControlName="name" maxlength="140" />
            <small class="field-help" *ngIf="isInvalid('name')">Nombre requerido.</small>
          </label>

          <label class="field">
            <span>Slug</span>
            <input type="text" formControlName="slug" maxlength="180" />
            <small class="field-help">Si lo dejas vacío, backend lo genera.</small>
          </label>

          <label class="field field--full">
            <span>Descripción</span>
            <textarea formControlName="description" rows="3" maxlength="800"></textarea>
          </label>

          <div class="form-actions">
            <button
              type="submit"
              class="ui-button ui-button--primary"
              [disabled]="saving"
            >
              {{ editingId ? "Guardar cambios" : "Crear marca" }}
            </button>
            <button
              type="button"
              class="ui-button ui-button--secondary"
              (click)="cancelForm()"
              [disabled]="saving"
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>

      <p class="ui-alert ui-alert--info" *ngIf="!canManage && canView">
        Modo revisión: SUPERVISOR puede consultar, pero solo ADMIN puede crear, editar o cambiar estado.
      </p>

      <div class="ui-table-wrapper" *ngIf="!loading && canView">
        <table class="ui-table brands-table" *ngIf="brands.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Slug</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Actualizado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let brand of brands">
              <td class="cell-code">#{{ brand.id }}</td>
              <td>{{ brand.name }}</td>
              <td class="cell-code">{{ brand.slug }}</td>
              <td class="cell-description">{{ brand.description || "-" }}</td>
              <td>
                <span
                  class="ui-badge"
                  [class.ui-badge--success]="brand.active"
                  [class.ui-badge--danger]="!brand.active"
                >
                  {{ brand.active ? "Activa" : "Inactiva" }}
                </span>
              </td>
              <td class="cell-date">{{ formatDateTime(brand.updatedAt) }}</td>
              <td class="actions">
                <button
                  type="button"
                  class="ui-button ui-button--secondary"
                  (click)="edit(brand)"
                  [disabled]="!canManage || saving || loading"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="ui-button"
                  [class.ui-button--danger]="brand.active"
                  [class.ui-button--secondary]="!brand.active"
                  (click)="toggleStatus(brand)"
                  [disabled]="!canManage || saving || loading"
                >
                  {{ brand.active ? "Desactivar" : "Activar" }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="ui-empty-state" *ngIf="brands.length === 0">
          <p class="empty-state-title">Aún no hay marcas ecommerce</p>
          <p class="ui-muted">Las marcas permiten identificar el fabricante o línea de productos en los perfiles online.</p>
          <button
            *ngIf="canManage"
            type="button"
            class="ui-button ui-button--primary"
            (click)="openCreateForm()"
            [disabled]="loading"
          >
            Nueva marca
          </button>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .ecommerce-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .header-actions {
        display: inline-flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .section-head h2 {
        margin: 0;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-3);
      }

      .field {
        display: grid;
        gap: var(--space-1);
      }

      .field span {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      .field input,
      .field textarea,
      .field select {
        width: 100%;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        padding: 0.58rem 0.65rem;
        box-sizing: border-box;
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
        transition: border-color 120ms ease-in-out, box-shadow 120ms ease-in-out;
      }

      .field input:focus,
      .field textarea:focus,
      .field select:focus {
        border-color: var(--color-brand-primary);
        outline: 3px solid var(--color-focus-ring);
        outline-offset: 2px;
      }

      .empty-state-title {
        margin: 0 0 var(--space-1);
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--color-text-primary);
      }

      .form-actions {
        grid-column: 1 / -1;
        display: inline-flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .brands-table {
        min-width: 900px;
      }

      .cell-code,
      .cell-date {
        font-family: var(--font-family-display);
        font-size: var(--font-size-sm);
      }

      .cell-description {
        max-width: 320px;
      }

      .actions {
        white-space: nowrap;
        display: inline-flex;
        gap: var(--space-2);
      }

      @media (max-width: 900px) {
        .ecommerce-page {
          padding: var(--space-4);
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .field--full,
        .form-actions {
          grid-column: auto;
        }
      }
    `,
  ],
})
export class EcommerceBrandsPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    name: ["", [Validators.required, Validators.maxLength(140)]],
    slug: ["", [Validators.maxLength(180)]],
    description: ["", [Validators.maxLength(800)]],
  });

  brands: EcommerceAdminBrandResponse[] = [];

  canView = false;
  canManage = false;
  loading = false;
  saving = false;

  showForm = false;
  editingId: number | null = null;

  permissionMessage = "";
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly ecommerceAdminService: EcommerceAdminService,
    private readonly confirmDialogService: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.canManage = user.roles.includes("ADMIN");
        this.canView = user.roles.some((role) => role === "ADMIN" || role === "SUPERVISOR");

        if (!this.canView) {
          this.permissionMessage =
            "No tienes permisos para revisar marcas ecommerce en esta pantalla.";
          return;
        }

        this.loadBrands();
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
      },
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  openCreateForm(): void {
    if (!this.canManage) {
      return;
    }

    this.showForm = true;
    this.editingId = null;
    this.form.reset({
      name: "",
      slug: "",
      description: "",
    });
  }

  edit(brand: EcommerceAdminBrandResponse): void {
    if (!this.canManage) {
      return;
    }

    this.showForm = true;
    this.editingId = brand.id;
    this.form.reset({
      name: brand.name,
      slug: brand.slug,
      description: brand.description || "",
    });
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form.reset({
      name: "",
      slug: "",
      description: "",
    });
  }

  submit(): void {
    if (!this.canManage) {
      return;
    }

    this.errorMessage = "";
    this.successMessage = "";

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: EcommerceAdminBrandRequest = {
      name: String(raw.name || "").trim(),
      slug: this.trimToNull(raw.slug),
      description: this.trimToNull(raw.description),
    };

    this.saving = true;
    const request$ = this.editingId
      ? this.ecommerceAdminService.updateBrand(this.editingId, payload)
      : this.ecommerceAdminService.createBrand(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = this.editingId
          ? "Marca actualizada correctamente."
          : "Marca creada correctamente.";
        this.cancelForm();
        this.loadBrands();
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(error, "No se pudo guardar la marca ecommerce.");
      },
    });
  }

  async toggleStatus(brand: EcommerceAdminBrandResponse): Promise<void> {
    if (!this.canManage) {
      return;
    }

    const nextStatus = !brand.active;
    const confirmed = await this.confirmDialogService.confirm({
      title: nextStatus ? "Activar marca" : "Desactivar marca",
      description: nextStatus
        ? `La marca ${brand.name} quedará disponible para perfiles online.`
        : `La marca ${brand.name} dejará de estar disponible para nuevos cambios en perfiles online.`,
      confirmText: nextStatus ? "Activar" : "Desactivar",
      cancelText: "Cancelar",
      variant: nextStatus ? "warning" : "danger",
    });

    if (!confirmed) {
      return;
    }

    this.errorMessage = "";
    this.successMessage = "";
    this.saving = true;

    this.ecommerceAdminService.changeBrandStatus(brand.id, { active: nextStatus }).subscribe({
      next: (updated) => {
        this.saving = false;
        this.brands = this.brands.map((item) => (item.id === updated.id ? updated : item));
        this.successMessage = nextStatus
          ? `Marca ${updated.name} activada correctamente.`
          : `Marca ${updated.name} desactivada correctamente.`;
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cambiar el estado de la marca ecommerce.",
        );
      },
    });
  }

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  }

  loadBrands(showSuccess = false): void {
    if (!this.canView) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    if (!showSuccess) {
      this.successMessage = "";
    }

    this.ecommerceAdminService.listBrands().subscribe({
      next: (brands) => {
        this.loading = false;
        this.brands = brands;
        if (showSuccess) {
          this.successMessage = "Listado de marcas actualizado.";
        }
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(error, "No se pudo cargar el listado de marcas.");
      },
    });
  }

  private trimToNull(value: string | null | undefined): string | null {
    const normalized = String(value || "").trim();
    return normalized ? normalized : null;
  }
}
