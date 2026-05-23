import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  SupplierCreateRequest,
  SupplierResponse,
  SupplierUpdateRequest,
} from "./data/purchases.models";
import { SupplierService } from "./data/supplier.service";

type SupplierFormMode = "create" | "edit";

@Component({
  selector: "app-suppliers-page",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <section class="ui-card suppliers-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Compras InkToy</p>
          <h1 class="ui-page-title">Proveedores</h1>
          <p class="ui-page-description suppliers-page__description">
            Gestiona proveedores para ordenar compras, editar datos de contacto
            y controlar su estado operativo.
          </p>
        </div>
        <span class="ui-badge">{{ suppliers.length }} registros</span>
      </header>

      <form class="search-panel" (ngSubmit)="search()">
        <label class="field field--grow">
          <span>Busqueda rapida</span>
          <input
            type="text"
            name="query"
            [(ngModel)]="query"
            [ngModelOptions]="{ standalone: true }"
            placeholder="Buscar por nombre, documento o contacto"
          />
        </label>

        <div class="search-actions">
          <button
            *ngIf="canManage"
            type="button"
            class="ui-button ui-button--primary"
            (click)="openCreatePanel()"
          >
            Nuevo proveedor
          </button>
          <button type="submit" class="ui-button ui-button--secondary">
            Buscar
          </button>
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="clearSearch()"
          >
            Limpiar
          </button>
        </div>
      </form>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>
      <p class="ui-alert ui-alert--info" *ngIf="loading">
        Cargando proveedores...
      </p>

      <div class="ui-table-wrapper" *ngIf="!loading">
        <table class="ui-table suppliers-table">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Nombre</th>
              <th>Contacto</th>
              <th>Telefono</th>
              <th>Email</th>
              <th>Estado</th>
              <th *ngIf="canManage">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let supplier of suppliers">
              <td class="cell-ellipsis" [title]="supplier.documentNumber || '-'">{{ supplier.documentNumber || "-" }}</td>
              <td class="cell-ellipsis cell-name" [title]="supplier.name">{{ supplier.name }}</td>
              <td class="cell-ellipsis" [title]="supplier.contactName || '-'">{{ supplier.contactName || "-" }}</td>
              <td class="cell-ellipsis" [title]="supplier.phone || '-'">{{ supplier.phone || "-" }}</td>
              <td class="cell-ellipsis" [title]="supplier.email || '-'">{{ supplier.email || "-" }}</td>
              <td>
                <span
                  class="ui-badge"
                  [class.ui-badge--success]="supplier.active"
                  [class.ui-badge--danger]="!supplier.active"
                >
                  {{ supplier.active ? "Activo" : "Inactivo" }}
                </span>
              </td>
              <td *ngIf="canManage" class="actions-col">
                <button
                  type="button"
                  class="ui-button ui-button--secondary"
                  (click)="startEdit(supplier)"
                  [disabled]="saving"
                >
                  Editar
                </button>
                <button
                  *ngIf="supplier.active"
                  type="button"
                  class="ui-button ui-button--danger"
                  (click)="changeStatus(supplier, false)"
                  [disabled]="statusChangingId === supplier.id"
                >
                  {{
                    statusChangingId === supplier.id
                      ? "Desactivando..."
                      : "Desactivar"
                  }}
                </button>
                <button
                  *ngIf="!supplier.active"
                  type="button"
                  class="ui-button ui-button--secondary"
                  (click)="changeStatus(supplier, true)"
                  [disabled]="statusChangingId === supplier.id"
                >
                  {{
                    statusChangingId === supplier.id
                      ? "Reactivando..."
                      : "Reactivar"
                  }}
                </button>
              </td>
            </tr>
            <tr *ngIf="suppliers.length === 0">
              <td [attr.colspan]="canManage ? 7 : 6" class="ui-table__empty">
                <div class="ui-empty-state">
                  No hay proveedores registrados.
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <section
        class="supplier-drawer-backdrop"
        *ngIf="panelOpen && canManage"
        (click)="closePanel()"
      >
        <article
          class="ui-card supplier-drawer"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'supplier-drawer-title'"
          (click)="$event.stopPropagation()"
        >
          <header class="supplier-drawer__head">
            <div>
              <span class="ui-chip ui-chip--warning" *ngIf="isEditing">Edicion</span>
              <h2 id="supplier-drawer-title">{{ panelTitle }}</h2>
              <p>{{ panelDescription }}</p>
            </div>
            <button
              type="button"
              class="ui-button ui-button--secondary"
              (click)="closePanel()"
              [disabled]="saving"
            >
              Cerrar
            </button>
          </header>

          <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
            <label class="field">
              <span>Documento</span>
              <input type="text" formControlName="documentNumber" maxlength="40" />
              <small class="field-error field-error--hidden" aria-hidden="true">&nbsp;</small>
            </label>

            <label class="field">
              <span>Nombre *</span>
              <input type="text" formControlName="name" maxlength="180" />
              <small class="field-error" [class.field-error--hidden]="!isInvalid('name')">Nombre es obligatorio.</small>
            </label>

            <label class="field">
              <span>Contacto</span>
              <input type="text" formControlName="contactName" maxlength="120" />
              <small class="field-error field-error--hidden" aria-hidden="true">&nbsp;</small>
            </label>

            <label class="field">
              <span>Telefono</span>
              <input type="text" formControlName="phone" maxlength="40" />
              <small class="field-error field-error--hidden" aria-hidden="true">&nbsp;</small>
            </label>

            <label class="field">
              <span>Email</span>
              <input type="email" formControlName="email" maxlength="160" />
              <small class="field-error" [class.field-error--hidden]="!isInvalid('email')">Email invalido.</small>
            </label>

            <label class="field full">
              <span>Direccion</span>
              <textarea rows="3" formControlName="address" maxlength="300"></textarea>
              <small class="field-error field-error--hidden" aria-hidden="true">&nbsp;</small>
            </label>

            <label class="checkbox-field full" *ngIf="isEditing">
              <input type="checkbox" formControlName="active" />
              Proveedor activo
            </label>

            <div class="form-actions full">
              <button
                type="button"
                class="ui-button ui-button--secondary"
                (click)="closePanel()"
                [disabled]="saving"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="ui-button ui-button--primary"
                [disabled]="saving"
              >
                {{ saving ? savingLabel : submitButtonLabel }}
              </button>
            </div>
          </form>
        </article>
      </section>
    </section>
  `,
  styles: [
    `
      .suppliers-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .suppliers-page__description {
        white-space: nowrap;
      }

      h2 {
        margin: 0;
      }

      .search-panel {
        display: grid;
        grid-template-columns: minmax(280px, 1fr) auto;
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

      .field span {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .field--grow {
        min-width: 0;
      }

      .search-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
      }

      input,
      textarea,
      select {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: var(--space-3);
      }

      .full {
        grid-column: 1 / -1;
      }

      .checkbox-field {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--font-size-sm);
        font-weight: 700;
      }

      .checkbox-field input {
        width: auto;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .suppliers-table {
        min-width: 980px;
      }

      .cell-name {
        max-width: 18rem;
      }

      .cell-ellipsis {
        max-width: 12rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .actions-col {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        align-items: stretch;
      }

      .actions-col .ui-button {
        min-width: 7.75rem;
      }

      .field-error {
        margin: 0;
        min-height: 1rem;
        line-height: 1rem;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        font-weight: 700;
      }

      .field-error--hidden {
        visibility: hidden;
      }

      .supplier-drawer-backdrop {
        position: fixed;
        inset: 0;
        z-index: 120;
        display: flex;
        justify-content: flex-end;
        background: rgba(16, 17, 20, 0.6);
        backdrop-filter: blur(4px);
        padding: var(--space-4);
      }

      .supplier-drawer {
        width: min(42rem, 100%);
        height: 100%;
        max-height: calc(100vh - 2rem);
        overflow: auto;
        display: grid;
        align-content: start;
        gap: var(--space-4);
        padding: var(--space-4);
        border-radius: var(--radius-lg);
        box-shadow: 0 24px 80px rgba(16, 17, 20, 0.34);
      }

      .supplier-drawer__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-3);
      }

      .supplier-drawer__head div {
        display: grid;
        gap: var(--space-2);
      }

      .supplier-drawer__head h2,
      .supplier-drawer__head p {
        margin: 0;
      }

      .supplier-drawer__head p {
        color: var(--color-text-secondary);
      }

      @media (max-width: 900px) {
        .suppliers-page {
          padding: var(--space-4);
        }

        .suppliers-page__description {
          white-space: normal;
        }

        .search-panel {
          grid-template-columns: 1fr;
        }

        .search-actions {
          justify-content: flex-start;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .form-actions {
          justify-content: flex-start;
        }

        .supplier-drawer-backdrop {
          padding: 0;
        }

        .supplier-drawer {
          width: 100%;
          max-height: 100vh;
          border-radius: 0;
        }
      }
    `,
  ],
})
export class SuppliersPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    documentNumber: ["", [Validators.maxLength(40)]],
    name: ["", [Validators.required, Validators.maxLength(180)]],
    contactName: ["", [Validators.maxLength(120)]],
    phone: ["", [Validators.maxLength(40)]],
    email: ["", [Validators.email, Validators.maxLength(160)]],
    address: ["", [Validators.maxLength(300)]],
    active: [true],
  });

  suppliers: SupplierResponse[] = [];
  query = "";

  loading = false;
  saving = false;
  statusChangingId: number | null = null;

  panelOpen = false;
  formMode: SupplierFormMode = "create";
  editingSupplierId: number | null = null;

  errorMessage = "";
  successMessage = "";
  canManage = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly supplierService: SupplierService,
    private readonly authService: AuthService,
    private readonly confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.loadPermissions();
    this.loadSuppliers();
  }

  search(): void {
    this.loadSuppliers();
  }

  clearSearch(): void {
    this.query = "";
    this.loadSuppliers();
  }

  get isEditing(): boolean {
    return this.formMode === "edit" && this.editingSupplierId !== null;
  }

  get panelTitle(): string {
    return this.isEditing ? "Editar proveedor" : "Nuevo proveedor";
  }

  get panelDescription(): string {
    return this.isEditing
      ? "Actualiza datos de contacto y disponibilidad operativa sin salir del listado."
      : "Registra un proveedor nuevo manteniendo la tabla principal visible en segundo plano.";
  }

  get submitButtonLabel(): string {
    return this.isEditing ? "Guardar cambios" : "Crear proveedor";
  }

  get savingLabel(): string {
    return this.isEditing ? "Guardando..." : "Creando...";
  }

  openCreatePanel(): void {
    if (!this.canManage) {
      return;
    }

    this.formMode = "create";
    this.panelOpen = true;
    this.editingSupplierId = null;
    this.errorMessage = "";
    this.form.reset(this.emptyFormValue());
  }

  submit(): void {
    if (!this.canManage) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    if (this.isEditing) {
      this.update();
      return;
    }

    const payload: SupplierCreateRequest = {
      documentNumber: this.normalizeOptional(
        this.form.controls.documentNumber.value,
      ),
      name: (this.form.controls.name.value ?? "").trim(),
      contactName: this.normalizeOptional(
        this.form.controls.contactName.value,
      ),
      phone: this.normalizeOptional(this.form.controls.phone.value),
      email: this.normalizeOptional(this.form.controls.email.value),
      address: this.normalizeOptional(this.form.controls.address.value),
    };

    this.supplierService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = "Proveedor creado correctamente.";
        this.closePanel();
        this.loadSuppliers();
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo crear el proveedor.",
        );
      },
    });
  }

  startEdit(supplier: SupplierResponse): void {
    if (!this.canManage) {
      return;
    }

    this.editingSupplierId = supplier.id;
    this.formMode = "edit";
    this.panelOpen = true;
    this.form.reset({
      documentNumber: supplier.documentNumber ?? "",
      name: supplier.name,
      contactName: supplier.contactName ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      active: supplier.active,
    });
  }

  closePanel(): void {
    if (this.saving) {
      return;
    }

    this.editingSupplierId = null;
    this.panelOpen = false;
    this.formMode = "create";
    this.form.reset(this.emptyFormValue());
  }

  update(): void {
    if (!this.canManage || this.editingSupplierId === null) {
      return;
    }

    const payload: SupplierUpdateRequest = {
      documentNumber: this.normalizeOptional(
        this.form.controls.documentNumber.value,
      ),
      name: (this.form.controls.name.value ?? "").trim(),
      contactName: this.normalizeOptional(
        this.form.controls.contactName.value,
      ),
      phone: this.normalizeOptional(this.form.controls.phone.value),
      email: this.normalizeOptional(this.form.controls.email.value),
      address: this.normalizeOptional(this.form.controls.address.value),
      active: this.form.controls.active.value ?? true,
    };

    this.supplierService.update(this.editingSupplierId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = "Proveedor actualizado correctamente.";
        this.closePanel();
        this.loadSuppliers();
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo actualizar el proveedor.",
        );
      },
    });
  }

  async changeStatus(supplier: SupplierResponse, active: boolean): Promise<void> {
    if (!this.canManage || this.statusChangingId !== null) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: active ? "Reactivar proveedor" : "Desactivar proveedor",
      description: active
        ? "El proveedor volvera a estar disponible para operaciones de compra."
        : "El proveedor se marcara como inactivo. Su historial se conserva y podras reactivarlo luego.",
      highlightText: supplier.name,
      confirmText: active ? "Reactivar proveedor" : "Desactivar proveedor",
      cancelText: "Cancelar",
      variant: active ? "info" : "warning",
    });
    if (!confirmed) {
      return;
    }

    this.statusChangingId = supplier.id;
    this.errorMessage = "";
    this.successMessage = "";

    if (active) {
      this.supplierService
        .update(supplier.id, {
          documentNumber: supplier.documentNumber,
          name: supplier.name,
          contactName: supplier.contactName,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          active: true,
        })
        .subscribe({
          next: () => {
            this.statusChangingId = null;
            this.successMessage = "Proveedor reactivado correctamente.";
            this.loadSuppliers();
          },
          error: (error: unknown) => {
            this.statusChangingId = null;
            this.errorMessage = toHttpErrorMessage(
              error,
              "No se pudo reactivar el proveedor.",
            );
          },
        });
      return;
    }

    this.supplierService.deactivate(supplier.id).subscribe({
      next: () => {
        this.statusChangingId = null;
        this.successMessage = "Proveedor desactivado correctamente.";
        this.loadSuppliers();
      },
      error: (error: unknown) => {
        this.statusChangingId = null;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo desactivar el proveedor.",
        );
      },
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private loadPermissions(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.canManage = user.roles.some((role) =>
          ["ADMIN", "ALMACENERO"].includes(role),
        );
      },
      error: () => {
        this.canManage = false;
      },
    });
  }

  private loadSuppliers(): void {
    this.loading = true;
    this.errorMessage = "";

    this.supplierService.list(this.query).subscribe({
      next: (suppliers) => {
        this.loading = false;
        this.suppliers = suppliers;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar la lista de proveedores.",
        );
      },
    });
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private emptyFormValue() {
    return {
      documentNumber: "",
      name: "",
      contactName: "",
      phone: "",
      email: "",
      address: "",
      active: true,
    };
  }
}
