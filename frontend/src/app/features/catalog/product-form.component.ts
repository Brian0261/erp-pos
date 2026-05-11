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
    <section class="ui-card product-form-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Catalogo InkToy</p>
          <h1 class="ui-page-title">
            {{ isEditMode ? "Editar producto" : "Nuevo producto" }}
          </h1>
          <p class="ui-page-description">
            Completa los datos comerciales y de inventario para el catalogo.
          </p>
        </div>
        <a
          routerLink="/catalogo/productos"
          class="ui-button ui-button--secondary"
          >Volver al listado</a
        >
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="loading">Cargando datos...</p>

      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="form-layout"
        *ngIf="!loading"
      >
        <div class="form-row">
          <label class="field">
            <span>SKU *</span>
            <input
              type="text"
              formControlName="sku"
              placeholder="Ej. LAP-001"
            />
            <div class="field-feedback">
              <small class="ui-muted" *ngIf="!isInvalid('sku')"
                >Identificador interno unico para ventas e inventario.</small
              >
              <small class="field-error" *ngIf="isInvalid('sku')"
                >SKU es obligatorio.</small
              >
            </div>
          </label>

          <label class="field">
            <span>Codigo de barras</span>
            <input
              type="text"
              formControlName="barcode"
              placeholder="Opcional para escaneo"
            />
            <div class="field-feedback">
              <small class="ui-muted"
                >Se mantiene separado del SKU para no mezclar ambos
                identificadores.</small
              >
            </div>
          </label>
        </div>

        <div class="form-row form-row--single">
          <label class="field full">
            <span>Nombre *</span>
            <input
              type="text"
              formControlName="name"
              placeholder="Nombre comercial del producto"
            />
            <div class="field-feedback">
              <small class="field-error" *ngIf="isInvalid('name')"
                >Nombre es obligatorio.</small
              >
            </div>
          </label>
        </div>

        <div class="form-row form-row--single">
          <label class="field full">
            <span>Descripcion</span>
            <textarea
              rows="3"
              formControlName="description"
              placeholder="Caracteristicas principales, uso o notas comerciales"
            ></textarea>
            <div class="field-feedback"></div>
          </label>
        </div>

        <div class="form-row form-row--stable">
          <label class="field field--select field--floating-error">
            <span>Categoria *</span>
            <select formControlName="categoryId">
              <option [ngValue]="null">Selecciona una categoria</option>
              <option
                *ngFor="let category of categories"
                [ngValue]="category.id"
              >
                {{ category.name }}
              </option>
            </select>
            <div class="field-feedback field-feedback--floating">
              <small class="field-error" *ngIf="isInvalid('categoryId')"
                >Categoria es obligatoria.</small
              >
            </div>
          </label>

          <label class="field field--select">
            <span>Unidad *</span>
            <select formControlName="unitId">
              <option [ngValue]="null">Selecciona una unidad</option>
              <option *ngFor="let unit of units" [ngValue]="unit.id">
                {{ unit.name }} ({{ unit.code }})
              </option>
            </select>
            <div class="field-feedback">
              <small class="field-error" *ngIf="isInvalid('unitId')"
                >Unidad es obligatoria.</small
              >
            </div>
          </label>
        </div>

        <div class="form-row">
          <label class="field">
            <span>Precio de venta *</span>
            <input
              type="number"
              min="0"
              step="0.01"
              formControlName="salePrice"
              placeholder="0.00"
            />
            <div class="field-feedback">
              <small class="field-error" *ngIf="isInvalid('salePrice')">
                Precio de venta es obligatorio y debe ser mayor o igual a 0.
              </small>
            </div>
          </label>

          <div class="checkbox-slot" *ngIf="isEditMode">
            <label class="checkbox">
              <input type="checkbox" formControlName="active" />
              <span>Producto activo</span>
            </label>
          </div>
        </div>

        <div class="actions full">
          <a
            routerLink="/catalogo/productos"
            class="ui-button ui-button--secondary"
            >Cancelar</a
          >
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving"
          >
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
      .product-form-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .form-layout {
        display: grid;
        gap: var(--space-3);
      }

      .form-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(240px, 1fr));
        gap: var(--space-3);
        align-items: start;
      }

      .form-row--single {
        grid-template-columns: 1fr;
      }

      .form-row--stable {
        min-height: 4.8rem;
        padding-bottom: 0.35rem;
      }

      .field {
        display: grid;
        gap: var(--space-1);
      }

      .field-feedback {
        min-height: 1rem;
      }

      .field-feedback--floating {
        position: absolute;
        top: calc(100% - 0.55rem);
        left: 0;
        right: 0;
        min-height: 0;
        pointer-events: none;
      }

      .field--select {
        align-content: start;
      }

      .field--floating-error {
        position: relative;
        padding-bottom: 0.65rem;
      }

      .field > span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .full {
        grid-column: 1 / -1;
      }

      input,
      textarea,
      select {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
      }

      input:focus-visible,
      textarea:focus-visible,
      select:focus-visible {
        outline: none;
        border-color: var(--color-focus-ring);
        box-shadow: 0 0 0 2px
          color-mix(in srgb, var(--color-focus-ring) 28%, transparent);
      }

      textarea {
        resize: vertical;
        min-height: 96px;
      }

      .field-error {
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        line-height: 1rem;
      }

      .checkbox {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-sm);
        padding: 0.55rem 0.65rem;
        background: var(--color-bg-soft);
        min-height: 44px;
        align-self: start;
      }

      .checkbox-slot {
        align-self: start;
        padding-top: calc(var(--font-size-sm) * 1.45 + var(--space-1));
        min-height: 44px;
      }

      .checkbox input {
        width: 16px;
        height: 16px;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 820px) {
        .product-form-page {
          padding: var(--space-4);
        }

        .form-layout {
          grid-template-columns: 1fr;
        }

        .actions {
          justify-content: flex-start;
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
