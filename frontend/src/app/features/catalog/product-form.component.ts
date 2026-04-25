import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";

import {
  Category,
  ProductCreateRequest,
  ProductUpdateRequest,
  Unit,
} from "./data/catalog.models";
import { CategoryService } from "./data/category.service";
import { ProductService } from "./data/product.service";
import { UnitService } from "./data/unit.service";
import { toHttpErrorMessage } from "./data/http-error-message";

@Component({
  selector: "app-product-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card">
      <header class="header">
        <div>
          <h1>{{ isEditMode ? "Editar producto" : "Nuevo producto" }}</h1>
          <p class="muted">Completa los datos para guardar en catalogo.</p>
        </div>
        <a routerLink="/catalogo/productos" class="secondary"
          >Volver al listado</a
        >
      </header>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>
      <p class="muted" *ngIf="loading">Cargando datos...</p>

      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="grid"
        *ngIf="!loading"
      >
        <label>
          SKU *
          <input type="text" formControlName="sku" />
          <small class="error" *ngIf="isInvalid('sku')"
            >SKU es obligatorio.</small
          >
        </label>

        <label>
          Codigo de barras
          <input type="text" formControlName="barcode" />
        </label>

        <label>
          Nombre *
          <input type="text" formControlName="name" />
          <small class="error" *ngIf="isInvalid('name')"
            >Nombre es obligatorio.</small
          >
        </label>

        <label class="full">
          Descripcion
          <textarea rows="3" formControlName="description"></textarea>
        </label>

        <label>
          Categoria *
          <select formControlName="categoryId">
            <option [ngValue]="null">Selecciona una categoria</option>
            <option *ngFor="let category of categories" [ngValue]="category.id">
              {{ category.name }}
            </option>
          </select>
          <small class="error" *ngIf="isInvalid('categoryId')"
            >Categoria es obligatoria.</small
          >
        </label>

        <label>
          Unidad *
          <select formControlName="unitId">
            <option [ngValue]="null">Selecciona una unidad</option>
            <option *ngFor="let unit of units" [ngValue]="unit.id">
              {{ unit.name }} ({{ unit.code }})
            </option>
          </select>
          <small class="error" *ngIf="isInvalid('unitId')"
            >Unidad es obligatoria.</small
          >
        </label>

        <label>
          Precio de venta *
          <input
            type="number"
            min="0"
            step="0.01"
            formControlName="salePrice"
          />
          <small class="error" *ngIf="isInvalid('salePrice')">
            Precio de venta es obligatorio y debe ser mayor o igual a 0.
          </small>
        </label>

        <label class="checkbox" *ngIf="isEditMode">
          <input type="checkbox" formControlName="active" />
          Activo
        </label>

        <div class="actions full">
          <button type="submit" [disabled]="saving">
            {{
              saving
                ? "Guardando..."
                : isEditMode
                  ? "Actualizar producto"
                  : "Crear producto"
            }}
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
        gap: 1rem;
        align-items: flex-start;
      }
      .header h1 {
        margin: 0;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: 0.9rem;
      }
      .full {
        grid-column: 1 / -1;
      }
      label {
        display: grid;
        gap: 0.35rem;
        font-size: 0.92rem;
      }
      input,
      textarea,
      select {
        padding: 0.55rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
        font: inherit;
      }
      .checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .checkbox input {
        width: 16px;
        height: 16px;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
      }
      button,
      .secondary {
        border: 0;
        border-radius: 0.35rem;
        padding: 0.55rem 0.9rem;
        cursor: pointer;
        text-decoration: none;
      }
      button {
        background: #0f766e;
        color: #fff;
      }
      .secondary {
        background: #4b5563;
        color: #fff;
      }
      .muted {
        color: #6b7280;
        margin: 0;
      }
      .error {
        color: #b91c1c;
        margin: 0;
      }
      .success {
        color: #166534;
        margin: 0;
      }
      @media (max-width: 820px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ProductFormComponent implements OnInit {
  readonly form = this.formBuilder.group({
    sku: ["", [Validators.required, Validators.maxLength(60)]],
    barcode: ["", [Validators.maxLength(50)]],
    name: ["", [Validators.required, Validators.maxLength(180)]],
    description: ["", [Validators.maxLength(500)]],
    categoryId: [null as number | null, Validators.required],
    unitId: [null as number | null, Validators.required],
    salePrice: [
      null as number | null,
      [Validators.required, Validators.min(0)],
    ],
    active: [true],
  });

  categories: Category[] = [];
  units: Unit[] = [];
  isEditMode = false;
  loading = true;
  saving = false;
  errorMessage = "";
  successMessage = "";

  private productId: number | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly categoryService: CategoryService,
    private readonly unitService: UnitService,
    private readonly productService: ProductService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.resolveMode();
    this.loadLookups();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    if (this.isEditMode && this.productId !== null) {
      this.productService
        .update(this.productId, this.buildUpdatePayload())
        .subscribe({
          next: () => {
            this.saving = false;
            this.successMessage = "Producto actualizado correctamente.";
            this.router.navigate(["/catalogo/productos"]);
          },
          error: (error: unknown) => {
            this.saving = false;
            this.errorMessage = toHttpErrorMessage(
              error,
              "No se pudo actualizar el producto.",
            );
          },
        });
      return;
    }

    this.productService.create(this.buildCreatePayload()).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = "Producto creado correctamente.";
        this.router.navigate(["/catalogo/productos"]);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo crear el producto.",
        );
      },
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  private resolveMode(): void {
    const idValue = this.route.snapshot.paramMap.get("id");
    const numericId = idValue ? Number(idValue) : NaN;

    if (Number.isFinite(numericId) && numericId > 0) {
      this.productId = numericId;
      this.isEditMode = true;
    }
  }

  private loadLookups(): void {
    forkJoin({
      categories: this.categoryService.listActive(),
      units: this.unitService.listActive(),
    }).subscribe({
      next: ({ categories, units }) => {
        this.categories = categories;
        this.units = units;

        if (this.isEditMode && this.productId !== null) {
          this.loadProduct(this.productId);
          return;
        }

        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar categorias/unidades activas.",
        );
      },
    });
  }

  private loadProduct(id: number): void {
    this.productService.getById(id).subscribe({
      next: (product) => {
        this.form.patchValue({
          sku: product.sku,
          barcode: product.barcode ?? "",
          name: product.name,
          description: product.description ?? "",
          categoryId: product.categoryId,
          unitId: product.unitId,
          salePrice: Number(product.salePrice),
          active: product.active,
        });
        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar el producto a editar.",
        );
      },
    });
  }

  private buildCreatePayload(): ProductCreateRequest {
    const value = this.form.getRawValue();

    return {
      sku: (value.sku ?? "").trim(),
      barcode: this.cleanOptional(value.barcode),
      name: (value.name ?? "").trim(),
      description: this.cleanOptional(value.description),
      categoryId: Number(value.categoryId),
      unitId: Number(value.unitId),
      salePrice: Number(value.salePrice),
    };
  }

  private buildUpdatePayload(): ProductUpdateRequest {
    const value = this.form.getRawValue();

    return {
      sku: (value.sku ?? "").trim(),
      barcode: this.cleanOptional(value.barcode),
      name: (value.name ?? "").trim(),
      description: this.cleanOptional(value.description),
      categoryId: Number(value.categoryId),
      unitId: Number(value.unitId),
      salePrice: Number(value.salePrice),
      active: Boolean(value.active),
    };
  }

  private cleanOptional(value: string | null): string | null {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
