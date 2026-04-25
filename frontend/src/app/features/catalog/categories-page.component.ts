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
    <section class="card">
      <h1>Catalogo - Categorias</h1>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
        <label>
          Nombre *
          <input type="text" formControlName="name" />
          <small class="error" *ngIf="isInvalid('name')"
            >Nombre es obligatorio.</small
          >
        </label>

        <label>
          Descripcion
          <input type="text" formControlName="description" />
        </label>

        <button type="submit" [disabled]="saving">
          {{ saving ? "Creando..." : "Crear categoria" }}
        </button>
      </form>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <table>
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
            <td>{{ category.id }}</td>
            <td>{{ category.name }}</td>
            <td>{{ category.description || "-" }}</td>
            <td>{{ category.active ? "Activa" : "Inactiva" }}</td>
          </tr>
          <tr *ngIf="categories.length === 0">
            <td colspan="4" class="empty">No hay categorias registradas.</td>
          </tr>
        </tbody>
      </table>
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
      h1 {
        margin: 0;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: 0.75rem;
        align-items: end;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input {
        padding: 0.55rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
      }
      button {
        padding: 0.55rem 0.9rem;
        border: 0;
        border-radius: 0.35rem;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 0.55rem;
        border-bottom: 1px solid #e5e7eb;
      }
      .error {
        color: #b91c1c;
        margin: 0;
      }
      .success {
        color: #166534;
        margin: 0;
      }
      .empty {
        text-align: center;
        color: #6b7280;
      }
      @media (max-width: 900px) {
        .form-grid {
          grid-template-columns: 1fr;
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
