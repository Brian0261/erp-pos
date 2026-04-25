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
    <section class="card">
      <header class="header">
        <div>
          <h1>Inventario - Almacenes</h1>
          <p class="muted">Lista, crea y desactiva almacenes del sistema.</p>
        </div>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
        <label>
          Codigo *
          <input type="text" formControlName="code" />
          <small class="error" *ngIf="isInvalid('code')"
            >Codigo es obligatorio.</small
          >
        </label>

        <label>
          Nombre *
          <input type="text" formControlName="name" />
          <small class="error" *ngIf="isInvalid('name')"
            >Nombre es obligatorio.</small
          >
        </label>

        <label>
          Tipo *
          <select formControlName="type">
            <option [ngValue]="null">Selecciona un tipo</option>
            <option *ngFor="let type of warehouseTypes" [ngValue]="type">
              {{ type }}
            </option>
          </select>
          <small class="error" *ngIf="isInvalid('type')"
            >Tipo es obligatorio.</small
          >
        </label>

        <button type="submit" [disabled]="saving || !canManageWarehouses">
          {{ saving ? "Guardando..." : "Crear almacen" }}
        </button>
      </form>

      <p class="muted" *ngIf="!canManageWarehouses">
        Tu rol puede consultar almacenes, pero no crear ni desactivar.
      </p>
      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Codigo</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let warehouse of warehouses">
              <td>{{ warehouse.id }}</td>
              <td>{{ warehouse.code }}</td>
              <td>{{ warehouse.name }}</td>
              <td>{{ warehouse.type }}</td>
              <td>{{ warehouse.active ? "Si" : "No" }}</td>
              <td>
                <button
                  type="button"
                  class="danger"
                  [disabled]="!warehouse.active || !canManageWarehouses"
                  (click)="deactivate(warehouse)"
                >
                  Desactivar
                </button>
              </td>
            </tr>
            <tr *ngIf="warehouses.length === 0">
              <td colspan="6" class="empty">No hay almacenes registrados.</td>
            </tr>
          </tbody>
        </table>
      </div>
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
      .header h1 {
        margin: 0;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
        gap: 0.75rem;
        align-items: end;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
      select {
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
      .danger {
        background: #b91c1c;
      }
      .table-wrapper {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 820px;
      }
      th,
      td {
        text-align: left;
        padding: 0.55rem;
        border-bottom: 1px solid #e5e7eb;
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
      .empty {
        text-align: center;
        color: #6b7280;
      }
      @media (max-width: 1000px) {
        .form-grid {
          grid-template-columns: 1fr;
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
