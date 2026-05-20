import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { Category } from "./data/catalog.models";
import { CategoryService } from "./data/category.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";

@Component({
  selector: "app-categories-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card catalog-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Catalogo InkToy</p>
          <h1 class="ui-page-title">Categorias</h1>
          <p class="ui-page-description">
            Organiza productos por grupos comerciales para facilitar busquedas y
            reportes.
          </p>
        </div>
      </header>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
          <span class="field-label">Nombre *</span>
          <span class="field-label">Descripcion</span>
          <span class="field-label field-label--placeholder" aria-hidden="true"
            >&nbsp;</span
          >

          <input
            type="text"
            formControlName="name"
            placeholder="Ej. Cuadernos"
          />
          <input
            type="text"
            formControlName="description"
            placeholder="Descripcion breve para uso interno"
          />
          <div class="form-action">
            <button
              type="submit"
              class="ui-button ui-button--primary"
              [disabled]="saving"
            >
              {{ submitButtonLabel }}
            </button>
            <button
              type="button"
              class="ui-button ui-button--secondary"
              *ngIf="isEditing"
              [disabled]="saving"
              (click)="cancelEdit()"
            >
              Cancelar
            </button>
          </div>

          <div class="field-feedback" aria-live="polite">
            <small
              class="field-error"
              [class.field-error--hidden]="!isInvalid('name')"
              >Nombre es obligatorio.</small
            >
          </div>
          <div class="field-feedback" aria-hidden="true">
            <small class="field-placeholder">&nbsp;</small>
          </div>
          <div class="field-feedback field-feedback--placeholder" aria-hidden="true">
            <small class="field-placeholder">&nbsp;</small>
          </div>
        </form>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <div class="ui-table-wrapper">
        <table class="ui-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripcion</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let category of categories">
              <td>
                <div class="name-cell">
                  <span>{{ category.name }}</span>
                  <span *ngIf="isReservedCategory(category)" class="ui-chip ui-chip--neutral name-chip">Sistema</span>
                </div>
              </td>
              <td>{{ category.description || "-" }}</td>
              <td>
                <span
                  class="ui-badge"
                  [class.ui-badge--success]="category.active"
                  [class.ui-badge--danger]="!category.active"
                >
                  {{ category.active ? "Activa" : "Inactiva" }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <ng-container *ngIf="!isReservedCategory(category); else reservedCategory">
                    <button
                      type="button"
                      class="ui-button ui-button--secondary"
                      [disabled]="saving"
                      (click)="editCategory(category)"
                    >
                      Editar
                    </button>
                    <button
                      *ngIf="category.active"
                      type="button"
                      class="ui-button ui-button--danger"
                      [disabled]="saving"
                      (click)="changeStatus(category, false)"
                    >
                      Desactivar
                    </button>
                    <button
                      *ngIf="!category.active"
                      type="button"
                      class="ui-button ui-button--secondary"
                      [disabled]="saving"
                      (click)="changeStatus(category, true)"
                    >
                      Reactivar
                    </button>
                  </ng-container>
                  <ng-template #reservedCategory>
                    <span class="ui-chip ui-chip--neutral actions-chip">Reservada</span>
                  </ng-template>
                </div>
              </td>
            </tr>
            <tr *ngIf="categories.length === 0">
              <td colspan="4" class="ui-table__empty">
                <div class="ui-empty-state">No hay categorias registradas.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [
    `
      .catalog-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .form-grid {
        display: grid;
        grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr) auto;
        grid-template-rows: auto auto auto;
        gap: var(--space-3);
        align-items: start;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
      }

      .field-label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .field-label--placeholder {
        visibility: hidden;
      }

      input {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
      }

      .field-error {
        min-height: 1rem;
        line-height: 1rem;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
      }

      .field-error--hidden {
        visibility: hidden;
      }

      .field-feedback {
        min-height: 1rem;
      }

      .field-feedback--placeholder {
        justify-self: end;
      }

      .field-placeholder {
        visibility: hidden;
      }

      .form-action {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        justify-content: flex-end;
        align-self: stretch;
      }

      .actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        align-items: center;
      }

      .name-cell {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .name-chip,
      .actions-chip {
        white-space: nowrap;
      }

      .ui-table th,
      .ui-table td {
        vertical-align: middle;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 900px) {
        .catalog-page {
          padding: var(--space-4);
        }

        .form-grid {
          grid-template-columns: 1fr;
          grid-template-rows: auto;
        }

        .form-action {
          justify-content: flex-start;
        }

        .actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class CategoriesPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    name: ["", [Validators.required, Validators.maxLength(120)]],
    description: ["", [Validators.maxLength(400)]],
  });

  categories: Category[] = [];
  saving = false;
  errorMessage = "";
  successMessage = "";
  editingCategoryId: number | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly categoryService: CategoryService,
    private readonly confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    const value = this.form.getRawValue();
    const payload = {
      name: (value.name ?? "").trim(),
      description: this.cleanOptional(value.description),
    };

    const request$ = this.editingCategoryId === null
      ? this.categoryService.create(payload)
      : this.categoryService.update(this.editingCategoryId, payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = this.editingCategoryId === null
          ? "Categoria creada correctamente."
          : "Categoria actualizada correctamente.";
        this.cancelEdit();
        this.loadCategories();
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          this.editingCategoryId === null
            ? "No se pudo crear la categoria."
            : "No se pudo actualizar la categoria.",
        );
      },
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  get isEditing(): boolean {
    return this.editingCategoryId !== null;
  }

  get submitButtonLabel(): string {
    if (this.saving) {
      return this.isEditing ? "Actualizando..." : "Creando...";
    }

    return this.isEditing ? "Actualizar categoria" : "Crear categoria";
  }

  editCategory(category: Category): void {
    if (this.saving || this.isReservedCategory(category)) {
      return;
    }

    this.editingCategoryId = category.id;
    this.form.setValue({
      name: category.name,
      description: category.description ?? "",
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.errorMessage = "";
    this.successMessage = "";
  }

  cancelEdit(): void {
    this.editingCategoryId = null;
    this.form.reset({
      name: "",
      description: "",
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  async changeStatus(category: Category, active: boolean): Promise<void> {
    if (this.saving || this.isReservedCategory(category)) {
      return;
    }

    const accepted = await this.confirmDialog.confirm({
      title: active ? "Reactivar categoría" : "Desactivar categoría",
      description: active
        ? "La categoría volverá a estar disponible para nuevas operaciones del catálogo."
        : "La categoría se marcará como inactiva. Seguirá disponible en el historial, pero dejará de usarse en nuevas operaciones.",
      highlightText: category.name,
      confirmText: active ? "Reactivar categoría" : "Desactivar categoría",
      cancelText: "Cancelar",
      variant: active ? "info" : "warning",
    });

    if (!accepted) {
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.categoryService.changeStatus(category.id, { active }).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = active
          ? "Categoria reactivada correctamente."
          : "Categoria desactivada correctamente.";
        this.loadCategories();
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          active
            ? "No se pudo reactivar la categoria."
            : "No se pudo desactivar la categoria.",
        );
      },
    });
  }

  isReservedCategory(category: Category): boolean {
    return this.normalizeCategoryName(category.name) === "por clasificar";
  }

  private loadCategories(): void {
    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar las categorias.",
        );
      },
    });
  }

  private cleanOptional(value: string | null): string | null {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeCategoryName(value: string): string {
    return (value ?? "").trim().toLowerCase();
  }
}
