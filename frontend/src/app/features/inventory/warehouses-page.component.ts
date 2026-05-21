import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  WarehouseCreateRequest,
  WarehouseResponse,
  WarehouseUpdateRequest,
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
            Lista, crea, edita y desactiva almacenes para controlar stock por
            ubicacion.
          </p>
        </div>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
        <span class="field-label">Codigo *</span>
        <span class="field-label">Nombre *</span>
        <span class="field-label">Tipo de almacén *</span>
        <span class="field-label field-label--placeholder" aria-hidden="true">&nbsp;</span>

        <input type="text" formControlName="code" placeholder="Ej. ALM-CEN" />
        <input
          type="text"
          formControlName="name"
          placeholder="Nombre operativo del almacen"
        />
        <select formControlName="type">
          <option [ngValue]="null">Selecciona un tipo</option>
          <option *ngFor="let type of warehouseTypes" [ngValue]="type">
            {{ warehouseTypeLabel(type) }}
          </option>
        </select>

        <div class="field-action">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving || !canManageWarehouses"
          >
            {{ submitButtonLabel }}
          </button>
          <button
            *ngIf="isEditing"
            type="button"
            class="ui-button ui-button--secondary"
            [disabled]="saving || !canManageWarehouses"
            (click)="cancelEdit()"
          >
            Cancelar
          </button>
        </div>

        <div class="field-feedback" aria-live="polite">
          <small class="field-error" [class.field-error--hidden]="!isInvalid('code')">Codigo es obligatorio.</small>
        </div>
        <div class="field-feedback" aria-live="polite">
          <small class="field-error" [class.field-error--hidden]="!isInvalid('name')">Nombre es obligatorio.</small>
        </div>
        <div class="field-feedback" aria-live="polite">
          <small class="field-error" [class.field-error--hidden]="!isInvalid('type')">Tipo es obligatorio.</small>
        </div>
        <div class="field-feedback field-feedback--placeholder" aria-hidden="true">
          <small class="field-placeholder">&nbsp;</small>
        </div>
      </form>

      <p class="ui-alert ui-alert--info" *ngIf="!canManageWarehouses">
        Tu rol puede consultar almacenes, pero no crear, editar ni desactivar.
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
              <th>Codigo</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let warehouse of warehouses">
              <td class="cell-code">{{ warehouse.code }}</td>
              <td>{{ warehouse.name }}</td>
              <td>
                  <span class="ui-badge">{{ warehouseTypeLabel(warehouse.type) }}</span>
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
                  class="ui-button ui-button--secondary"
                  [disabled]="saving || !canManageWarehouses"
                  (click)="editWarehouse(warehouse)"
                >
                  Editar
                </button>
                <button
                  *ngIf="warehouse.active"
                  type="button"
                  class="ui-button ui-button--danger"
                  [disabled]="saving || !canManageWarehouses"
                  (click)="changeStatus(warehouse, false)"
                >
                  Desactivar
                </button>
                <button
                  *ngIf="!warehouse.active"
                  type="button"
                  class="ui-button ui-button--secondary"
                  [disabled]="saving || !canManageWarehouses"
                  (click)="changeStatus(warehouse, true)"
                >
                  Reactivar
                </button>
              </td>
            </tr>
            <tr *ngIf="warehouses.length === 0">
              <td colspan="5" class="ui-table__empty">
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
        grid-template-rows: auto auto auto;
        gap: var(--space-3);
        align-items: start;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        padding: var(--space-3);
      }

      .form-grid > * {
        min-width: 0;
      }

      .field-label {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      .field-label--placeholder {
        visibility: hidden;
      }

      input,
      select {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        box-sizing: border-box;
        width: 100%;
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

      .field-action {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        justify-content: flex-end;
        align-self: stretch;
        align-items: center;
      }

      .field-action .ui-button {
        height: 100%;
        box-sizing: border-box;
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

      .actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-start;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .inventory-table {
        min-width: 860px;
      }

      .cell-code {
        white-space: nowrap;
      }

      @media (max-width: 1000px) {
        .inventory-page {
          padding: var(--space-4);
        }

        .form-grid {
          grid-template-columns: 1fr;
          grid-template-rows: auto;
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
  editingWarehouseId: number | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly warehouseService: WarehouseService,
    private readonly authService: AuthService,
    private readonly confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.resolvePermissions();
    this.loadWarehouses();
  }

  submit(): void {
    if (!this.canManageWarehouses) {
      this.errorMessage = this.isEditing
        ? "No tienes permisos para actualizar almacenes."
        : "No tienes permisos para crear almacenes.";
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    const isEditing = this.isEditing;

    const value = this.form.getRawValue();
    const updatePayload: WarehouseUpdateRequest = {
      code: (value.code ?? "").trim(),
      name: (value.name ?? "").trim(),
    };

    const createPayload: WarehouseCreateRequest = {
      code: updatePayload.code,
      name: updatePayload.name,
      type: value.type as WarehouseType,
    };

    const request$ = isEditing && this.editingWarehouseId !== null
      ? this.warehouseService.update(this.editingWarehouseId, updatePayload)
      : this.warehouseService.create(createPayload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = isEditing
          ? "Almacen actualizado correctamente."
          : "Almacen creado correctamente.";
        if (isEditing) {
          this.cancelEdit();
        } else {
          this.form.reset();
        }
        this.loadWarehouses();
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          isEditing ? "No se pudo actualizar el almacen." : "No se pudo crear el almacen.",
        );
      },
    });
  }

  editWarehouse(warehouse: WarehouseResponse): void {
    this.editingWarehouseId = warehouse.id;
    this.errorMessage = "";
    this.successMessage = "";
    this.form.patchValue({
      code: warehouse.code,
      name: warehouse.name,
      type: warehouse.type,
    });
    this.form.get("type")?.disable();
  }

  cancelEdit(): void {
    this.editingWarehouseId = null;
    this.form.reset({ code: "", name: "", type: null });
    this.form.get("type")?.enable();
  }

  async changeStatus(warehouse: WarehouseResponse, active: boolean): Promise<void> {
    if (!this.canManageWarehouses) {
      this.errorMessage = active
        ? "No tienes permisos para reactivar almacenes."
        : "No tienes permisos para desactivar almacenes.";
      return;
    }

    const accepted = await this.confirmDialog.confirm({
      title: active ? "Reactivar almacén" : "Desactivar almacén",
      description: active
        ? `Vas a reactivar el almacén ${warehouse.code} - ${warehouse.name}. Volverá a estar disponible para nuevas operaciones.`
        : `Vas a desactivar el almacén ${warehouse.code} - ${warehouse.name}. Dejará de estar disponible para nuevas operaciones.`,
      highlightText: warehouse.name,
      confirmText: active ? "Reactivar" : "Desactivar",
      cancelText: "Cancelar",
      variant: active ? "warning" : "danger",
    });

    if (!accepted) {
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.warehouseService.changeStatus(warehouse.id, { active }).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = active
          ? "Almacen reactivado correctamente."
          : "Almacen desactivado correctamente.";
        this.loadWarehouses();
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          active
            ? "No se pudo reactivar el almacen."
            : "No se pudo desactivar el almacen.",
        );
      },
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  warehouseTypeLabel(type: WarehouseType | null | undefined): string {
    switch (type) {
      case "STORE":
        return "Tienda";
      case "MAIN_WAREHOUSE":
        return "Almacén principal";
      case "VIRTUAL":
        return "Virtual";
      default:
        return "-";
    }
  }

  get isEditing(): boolean {
    return this.editingWarehouseId !== null;
  }

  get submitButtonLabel(): string {
    if (this.saving) {
      return this.isEditing ? "Actualizando..." : "Guardando...";
    }

    return this.isEditing ? "Actualizar almacen" : "Crear almacen";
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
