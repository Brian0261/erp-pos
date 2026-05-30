import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import {
  EcommerceAdminOnlineCategoryRequest,
  EcommerceAdminOnlineCategoryResponse,
} from "./data/ecommerce-admin.models";
import { EcommerceAdminService } from "./data/ecommerce-admin.service";
import { toHttpErrorMessage } from "./data/http-error-message";

@Component({
  selector: "app-ecommerce-online-categories-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card ecommerce-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Catalogo online</p>
          <h1 class="ui-page-title">Categorías online</h1>
          <p class="ui-page-description">
            Administra categorías ecommerce con jerarquía opcional y estado operativo.
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
            Nueva categoría
          </button>

          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="loadCategories(true)"
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
      <p class="ui-alert ui-alert--info" *ngIf="loading">Cargando categorías online...</p>

      <section class="ui-module-section" *ngIf="showForm && canManage">
        <header class="section-head">
          <h2>{{ editingId ? "Editar categoría" : "Nueva categoría" }}</h2>
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

          <label class="field">
            <span>Categoría padre</span>
            <select formControlName="parentId">
              <option [ngValue]="null">Sin padre</option>
              <option *ngFor="let category of availableParentOptions" [ngValue]="category.id">
                {{ category.name }} (#{{ category.id }})
              </option>
            </select>
            <small class="field-help">Jerarquía opcional.</small>
          </label>

          <label class="field field--full">
            <span>Descripcion</span>
            <textarea formControlName="description" rows="3" maxlength="1000"></textarea>
          </label>

          <div class="form-actions">
            <button
              type="submit"
              class="ui-button ui-button--primary"
              [disabled]="saving"
            >
              {{ editingId ? "Guardar cambios" : "Crear categoría" }}
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
        Modo revision: SUPERVISOR puede consultar, pero solo ADMIN puede crear, editar o cambiar estado.
      </p>

      <div class="ui-table-wrapper" *ngIf="!loading && canView">
        <table class="ui-table categories-table" *ngIf="categories.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Slug</th>
              <th>Padre</th>
              <th>Descripcion</th>
              <th>Estado</th>
              <th>Actualizado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let category of categories">
              <td class="cell-code">#{{ category.id }}</td>
              <td>{{ category.name }}</td>
              <td class="cell-code">{{ category.slug }}</td>
              <td class="cell-code">{{ parentLabel(category.parentId) }}</td>
              <td class="cell-description">{{ category.description || "-" }}</td>
              <td>
                <span
                  class="ui-badge"
                  [class.ui-badge--success]="category.active"
                  [class.ui-badge--danger]="!category.active"
                >
                  {{ category.active ? "Activa" : "Inactiva" }}
                </span>
              </td>
              <td class="cell-date">{{ formatDateTime(category.updatedAt) }}</td>
              <td class="actions">
                <button
                  type="button"
                  class="ui-button ui-button--secondary"
                  (click)="edit(category)"
                  [disabled]="!canManage || saving || loading"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="ui-button"
                  [class.ui-button--danger]="category.active"
                  [class.ui-button--secondary]="!category.active"
                  (click)="toggleStatus(category)"
                  [disabled]="!canManage || saving || loading"
                >
                  {{ category.active ? "Desactivar" : "Activar" }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="ui-empty-state" *ngIf="categories.length === 0">
          No existen categorías online registradas.
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
      }

      .field--full {
        grid-column: 1 / -1;
      }

      .field-help {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }

      .form-actions {
        grid-column: 1 / -1;
        display: inline-flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .categories-table {
        min-width: 1020px;
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
export class EcommerceOnlineCategoriesPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    parentId: [null as number | null],
    name: ["", [Validators.required, Validators.maxLength(140)]],
    slug: ["", [Validators.maxLength(180)]],
    description: ["", [Validators.maxLength(1000)]],
  });

  categories: EcommerceAdminOnlineCategoryResponse[] = [];

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

  get availableParentOptions(): EcommerceAdminOnlineCategoryResponse[] {
    return this.categories.filter((category) => category.id !== this.editingId);
  }

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.canManage = user.roles.includes("ADMIN");
        this.canView = user.roles.some((role) => role === "ADMIN" || role === "SUPERVISOR");

        if (!this.canView) {
          this.permissionMessage =
            "No tienes permisos para revisar categorías online en esta pantalla.";
          return;
        }

        this.loadCategories();
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
      parentId: null,
      name: "",
      slug: "",
      description: "",
    });
  }

  edit(category: EcommerceAdminOnlineCategoryResponse): void {
    if (!this.canManage) {
      return;
    }

    this.showForm = true;
    this.editingId = category.id;
    this.form.reset({
      parentId: category.parentId,
      name: category.name,
      slug: category.slug,
      description: category.description || "",
    });
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form.reset({
      parentId: null,
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
    const payload: EcommerceAdminOnlineCategoryRequest = {
      parentId: raw.parentId ?? null,
      name: String(raw.name || "").trim(),
      slug: this.trimToNull(raw.slug),
      description: this.trimToNull(raw.description),
    };

    this.saving = true;
    const request$ = this.editingId
      ? this.ecommerceAdminService.updateOnlineCategory(this.editingId, payload)
      : this.ecommerceAdminService.createOnlineCategory(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = this.editingId
          ? "Categoría online actualizada correctamente."
          : "Categoría online creada correctamente.";
        this.cancelForm();
        this.loadCategories();
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo guardar la categoría online.",
        );
      },
    });
  }

  async toggleStatus(category: EcommerceAdminOnlineCategoryResponse): Promise<void> {
    if (!this.canManage) {
      return;
    }

    const nextStatus = !category.active;
    const confirmed = await this.confirmDialogService.confirm({
      title: nextStatus ? "Activar categoría online" : "Desactivar categoría online",
      description: nextStatus
        ? `La categoría ${category.name} quedara habilitada para perfiles online.`
        : `La categoría ${category.name} dejara de estar habilitada para nuevos cambios en perfiles online.`,
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

    this.ecommerceAdminService
      .changeOnlineCategoryStatus(category.id, { active: nextStatus })
      .subscribe({
        next: (updated) => {
          this.saving = false;
          this.categories = this.categories.map((item) =>
            item.id === updated.id ? updated : item,
          );
          this.successMessage = nextStatus
            ? `Categoría ${updated.name} activada correctamente.`
            : `Categoría ${updated.name} desactivada correctamente.`;
        },
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo cambiar el estado de la categoría online.",
          );
        },
      });
  }

  parentLabel(parentId: number | null): string {
    if (!parentId) {
      return "-";
    }

    const parent = this.categories.find((item) => item.id === parentId);
    return parent ? `${parent.name} (#${parent.id})` : `#${parentId}`;
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

  loadCategories(showSuccess = false): void {
    if (!this.canView) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    if (!showSuccess) {
      this.successMessage = "";
    }

    this.ecommerceAdminService.listOnlineCategories().subscribe({
      next: (categories) => {
        this.loading = false;
        this.categories = categories;
        if (showSuccess) {
          this.successMessage = "Listado de categorías online actualizado.";
        }
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar el listado de categorías online.",
        );
      },
    });
  }

  private trimToNull(value: string | null | undefined): string | null {
    const normalized = String(value || "").trim();
    return normalized ? normalized : null;
  }
}
