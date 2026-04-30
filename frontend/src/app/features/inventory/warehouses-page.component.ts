import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  WarehouseCreateRequest,
  WarehouseResponse,
  WarehouseType,
} from "./data/inventory.models";
import { WarehouseService } from "./data/warehouse.service";

@Component({
  selector: "app-warehouses-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card inventory-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Inventario InkToy</p>
          <h1 class="ui-page-title">Almacenes</h1>
          <p class="ui-page-description">
            Lista, crea y desactiva almacenes para controlar stock por
            ubicacion.
          </p>
        </div>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
        <label class="field">
          <span>Codigo *</span>
          <input type="text" formControlName="code" placeholder="Ej. ALM-CEN" />
          <small class="field-error" *ngIf="isInvalid('code')"
            >Codigo es obligatorio.</small
          >
        </label>

        <label class="field">
          <span>Nombre *</span>
          <input
            type="text"
            formControlName="name"
            placeholder="Nombre operativo del almacen"
          />
          <small class="field-error" *ngIf="isInvalid('name')"
            >Nombre es obligatorio.</small
          >
        </label>

        <label class="field">
          <span>Tipo *</span>
          <select formControlName="type">
            <option [ngValue]="null">Selecciona un tipo</option>
            <option *ngFor="let type of warehouseTypes" [ngValue]="type">
              {{ type }}
            </option>
          </select>
          <small class="field-error" *ngIf="isInvalid('type')"
            >Tipo es obligatorio.</small
          >
        </label>

        <div class="field-action">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving || !canManageWarehouses"
          >
            {{ saving ? "Guardando..." : "Crear almacen" }}
          </button>
        </div>
      </form>

      <p class="ui-alert ui-alert--info" *ngIf="!canManageWarehouses">
        Tu rol puede consultar almacenes, pero no crear ni desactivar.
      </p>
      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <div class="ui-table-wrapper">
        <table class="ui-table inventory-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Codigo</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let warehouse of warehouses">
              <td class="cell-id">{{ warehouse.id }}</td>
              <td class="cell-code">{{ warehouse.code }}</td>
              <td>{{ warehouse.name }}</td>
              <td>
                <span class="ui-badge">{{ warehouse.type }}</span>
              </td>
              <td>
                <span
                  class="ui-badge"
                  [class.ui-badge--success]="warehouse.active"
                  [class.ui-badge--danger]="!warehouse.active"
                >
                  {{ warehouse.active ? "Activa" : "Inactiva" }}
                </span>
              </td>
              <td class="actions">
                <button
                  type="button"
                  class="ui-button ui-button--danger"
                  [disabled]="!warehouse.active || !canManageWarehouses"
                  (click)="deactivate(warehouse)"
                >
                  Desactivar
                </button>
              </td>
            </tr>
            <tr *ngIf="warehouses.length === 0">
              <td colspan="6" class="ui-table__empty">
                <div class="ui-empty-state">No hay almacenes registrados.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [
    `
      .inventory-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
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
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      input,
      select {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
      }

      .field-error {
        color: var(--color-danger);
        font-size: var(--font-size-xs);
      }

      .field-action {
        display: flex;
        justify-content: flex-end;
      }

      .actions {
        display: flex;
        justify-content: flex-start;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .inventory-table {
        min-width: 860px;
      }

      .cell-id,
      .cell-code {
        white-space: nowrap;
      }

      @media (max-width: 1000px) {
        .inventory-page {
          padding: var(--space-4);
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .field-action {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class WarehousesPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    code: ["", [Validators.required, Validators.maxLength(30)]],
    name: ["", [Validators.required, Validators.maxLength(140)]],
    type: [null as WarehouseType | null, Validators.required],
  });

  readonly warehouseTypes: WarehouseType[] = [
    "STORE",
    "MAIN_WAREHOUSE",
    "VIRTUAL",
  ];

  warehouses: WarehouseResponse[] = [];
  saving = false;
  errorMessage = "";
  successMessage = "";
  canManageWarehouses = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly warehouseService: WarehouseService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.resolvePermissions();
    this.loadWarehouses();
  }

  submit(): void {
    if (!this.canManageWarehouses) {
      this.errorMessage = "No tienes permisos para crear almacenes.";
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    const value = this.form.getRawValue();
    const payload: WarehouseCreateRequest = {
      code: (value.code ?? "").trim(),
      name: (value.name ?? "").trim(),
      type: value.type as WarehouseType,
    };

    this.warehouseService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = "Almacen creado correctamente.";
        this.form.reset();
        this.loadWarehouses();
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo crear el almacen.",
        );
      },
    });
  }

  deactivate(warehouse: WarehouseResponse): void {
    if (!this.canManageWarehouses) {
      this.errorMessage = "No tienes permisos para desactivar almacenes.";
      return;
    }

    const accepted = window.confirm(
      `Desactivar almacen ${warehouse.code} - ${warehouse.name}?`,
    );
    if (!accepted) {
      return;
    }

    this.errorMessage = "";
    this.successMessage = "";

    this.warehouseService.deactivate(warehouse.id).subscribe({
      next: () => {
        this.successMessage = "Almacen desactivado correctamente.";
        this.loadWarehouses();
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo desactivar el almacen.",
        );
      },
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private resolvePermissions(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.canManageWarehouses = user.roles.some(
          (role) => role === "ADMIN" || role === "ALMACENERO",
        );
      },
      error: () => {
        this.canManageWarehouses = false;
      },
    });
  }

  private loadWarehouses(): void {
    this.warehouseService.list().subscribe({
      next: (warehouses) => {
        this.warehouses = warehouses;
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar los almacenes.",
        );
      },
    });
  }
}
