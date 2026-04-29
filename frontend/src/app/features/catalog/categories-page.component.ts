import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { Category } from "./data/catalog.models";
import { CategoryService } from "./data/category.service";
import { toHttpErrorMessage } from "./data/http-error-message";

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
        <label class="field">
          <span>Nombre *</span>
          <input
            type="text"
            formControlName="name"
            placeholder="Ej. Cuadernos"
          />
          <small class="field-error" *ngIf="isInvalid('name')"
            >Nombre es obligatorio.</small
          >
        </label>

        <label class="field">
          <span>Descripcion</span>
          <input
            type="text"
            formControlName="description"
            placeholder="Descripcion breve para uso interno"
          />
        </label>

        <div class="form-action">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving"
          >
            {{ saving ? "Creando..." : "Crear categoria" }}
          </button>
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
              <th>ID</th>
              <th>Nombre</th>
              <th>Descripcion</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let category of categories">
              <td class="cell-id">{{ category.id }}</td>
              <td>{{ category.name }}</td>
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
        gap: var(--space-3);
        align-items: end;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
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

      input {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
      }

      .field-error {
        color: var(--color-danger);
        font-size: var(--font-size-xs);
      }

      .form-action {
        display: flex;
        justify-content: flex-end;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .cell-id {
        white-space: nowrap;
      }

      @media (max-width: 900px) {
        .catalog-page {
          padding: var(--space-4);
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .form-action {
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

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly categoryService: CategoryService,
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
    this.categoryService
      .create({
        name: (value.name ?? "").trim(),
        description: this.cleanOptional(value.description),
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = "Categoria creada correctamente.";
          this.form.reset();
          this.loadCategories();
        },
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo crear la categoria.",
          );
        },
      });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
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
}
