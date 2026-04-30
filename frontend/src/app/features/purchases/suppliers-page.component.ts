import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

import { AuthService } from "../../core/auth/auth.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  SupplierCreateRequest,
  SupplierResponse,
  SupplierUpdateRequest,
} from "./data/purchases.models";
import { SupplierService } from "./data/supplier.service";

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
          <p class="ui-page-description">
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
          <button type="submit" class="ui-button ui-button--primary">
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

      <section class="supplier-panel" *ngIf="canManage">
        <header class="panel-head">
          <h2>Nuevo proveedor</h2>
        </header>

        <form [formGroup]="createForm" (ngSubmit)="create()" class="form-grid">
          <label class="field">
            <span>Documento</span>
            <input
              type="text"
              formControlName="documentNumber"
              maxlength="40"
            />
          </label>

          <label class="field">
            <span>Nombre *</span>
            <input type="text" formControlName="name" maxlength="180" />
            <small class="field-error" *ngIf="isCreateInvalid('name')"
              >Nombre es obligatorio.</small
            >
          </label>

          <label class="field">
            <span>Contacto</span>
            <input type="text" formControlName="contactName" maxlength="120" />
          </label>

          <label class="field">
            <span>Telefono</span>
            <input type="text" formControlName="phone" maxlength="40" />
          </label>

          <label class="field">
            <span>Email</span>
            <input type="email" formControlName="email" maxlength="160" />
            <small class="field-error" *ngIf="isCreateInvalid('email')"
              >Email invalido.</small
            >
          </label>

          <label class="field full">
            <span>Direccion</span>
            <textarea
              rows="2"
              formControlName="address"
              maxlength="300"
            ></textarea>
          </label>

          <div class="form-actions full">
            <button
              type="submit"
              class="ui-button ui-button--primary"
              [disabled]="savingCreate"
            >
              {{ savingCreate ? "Guardando..." : "Crear proveedor" }}
            </button>
          </div>
        </form>
      </section>

      <section
        class="supplier-panel"
        *ngIf="editingSupplierId !== null && canManage"
      >
        <header class="panel-head">
          <h2>Editar proveedor #{{ editingSupplierId }}</h2>
          <span class="ui-badge ui-badge--warning">Modo edicion</span>
        </header>

        <form [formGroup]="editForm" (ngSubmit)="update()" class="form-grid">
          <label class="field">
            <span>Documento</span>
            <input
              type="text"
              formControlName="documentNumber"
              maxlength="40"
            />
          </label>

          <label class="field">
            <span>Nombre *</span>
            <input type="text" formControlName="name" maxlength="180" />
            <small class="field-error" *ngIf="isEditInvalid('name')"
              >Nombre es obligatorio.</small
            >
          </label>

          <label class="field">
            <span>Contacto</span>
            <input type="text" formControlName="contactName" maxlength="120" />
          </label>

          <label class="field">
            <span>Telefono</span>
            <input type="text" formControlName="phone" maxlength="40" />
          </label>

          <label class="field">
            <span>Email</span>
            <input type="email" formControlName="email" maxlength="160" />
            <small class="field-error" *ngIf="isEditInvalid('email')"
              >Email invalido.</small
            >
          </label>

          <label class="field full">
            <span>Direccion</span>
            <textarea
              rows="2"
              formControlName="address"
              maxlength="300"
            ></textarea>
          </label>

          <label class="checkbox-field full">
            <input type="checkbox" formControlName="active" />
            Proveedor activo
          </label>

          <div class="form-actions full">
            <button
              type="submit"
              class="ui-button ui-button--primary"
              [disabled]="savingEdit"
            >
              {{ savingEdit ? "Actualizando..." : "Actualizar proveedor" }}
            </button>
            <button
              type="button"
              class="ui-button ui-button--secondary"
              (click)="cancelEdit()"
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>

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
              <th>ID</th>
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
              <td class="cell-id">{{ supplier.id }}</td>
              <td>{{ supplier.documentNumber || "-" }}</td>
              <td>{{ supplier.name }}</td>
              <td>{{ supplier.contactName || "-" }}</td>
              <td>{{ supplier.phone || "-" }}</td>
              <td>{{ supplier.email || "-" }}</td>
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
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="ui-button ui-button--danger"
                  (click)="deactivate(supplier)"
                  [disabled]="
                    !supplier.active || deactivatingId === supplier.id
                  "
                >
                  {{
                    deactivatingId === supplier.id
                      ? "Desactivando..."
                      : "Desactivar"
                  }}
                </button>
              </td>
            </tr>
            <tr *ngIf="suppliers.length === 0">
              <td [attr.colspan]="canManage ? 8 : 7" class="ui-table__empty">
                <div class="ui-empty-state">
                  No hay proveedores registrados.
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [
    `
      .suppliers-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .panel-head,
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
      }

      input,
      textarea,
      select {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
      }

      .supplier-panel {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        padding: var(--space-3);
        display: grid;
        gap: var(--space-3);
      }

      .panel-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
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

      .cell-id {
        white-space: nowrap;
      }

      .actions-col {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .field-error {
        margin: 0;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        font-weight: 700;
      }

      @media (max-width: 900px) {
        .suppliers-page {
          padding: var(--space-4);
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
      }
    `,
  ],
})
export class SuppliersPageComponent implements OnInit {
  readonly createForm = this.formBuilder.group({
    documentNumber: ["", [Validators.maxLength(40)]],
    name: ["", [Validators.required, Validators.maxLength(180)]],
    contactName: ["", [Validators.maxLength(120)]],
    phone: ["", [Validators.maxLength(40)]],
    email: ["", [Validators.email, Validators.maxLength(160)]],
    address: ["", [Validators.maxLength(300)]],
  });

  readonly editForm = this.formBuilder.group({
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
  savingCreate = false;
  savingEdit = false;
  deactivatingId: number | null = null;

  editingSupplierId: number | null = null;

  errorMessage = "";
  successMessage = "";
  canManage = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly supplierService: SupplierService,
    private readonly authService: AuthService,
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

  create(): void {
    if (!this.canManage) {
      return;
    }

    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.savingCreate = true;
    this.errorMessage = "";
    this.successMessage = "";

    const payload: SupplierCreateRequest = {
      documentNumber: this.normalizeOptional(
        this.createForm.controls.documentNumber.value,
      ),
      name: (this.createForm.controls.name.value ?? "").trim(),
      contactName: this.normalizeOptional(
        this.createForm.controls.contactName.value,
      ),
      phone: this.normalizeOptional(this.createForm.controls.phone.value),
      email: this.normalizeOptional(this.createForm.controls.email.value),
      address: this.normalizeOptional(this.createForm.controls.address.value),
    };

    this.supplierService.create(payload).subscribe({
      next: () => {
        this.savingCreate = false;
        this.successMessage = "Proveedor creado correctamente.";
        this.createForm.reset({
          documentNumber: "",
          name: "",
          contactName: "",
          phone: "",
          email: "",
          address: "",
        });
        this.loadSuppliers();
      },
      error: (error: unknown) => {
        this.savingCreate = false;
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
    this.editForm.reset({
      documentNumber: supplier.documentNumber ?? "",
      name: supplier.name,
      contactName: supplier.contactName ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      active: supplier.active,
    });
  }

  cancelEdit(): void {
    this.editingSupplierId = null;
    this.editForm.reset({ active: true });
  }

  update(): void {
    if (!this.canManage || this.editingSupplierId === null) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.savingEdit = true;
    this.errorMessage = "";
    this.successMessage = "";

    const payload: SupplierUpdateRequest = {
      documentNumber: this.normalizeOptional(
        this.editForm.controls.documentNumber.value,
      ),
      name: (this.editForm.controls.name.value ?? "").trim(),
      contactName: this.normalizeOptional(
        this.editForm.controls.contactName.value,
      ),
      phone: this.normalizeOptional(this.editForm.controls.phone.value),
      email: this.normalizeOptional(this.editForm.controls.email.value),
      address: this.normalizeOptional(this.editForm.controls.address.value),
      active: this.editForm.controls.active.value ?? true,
    };

    this.supplierService.update(this.editingSupplierId, payload).subscribe({
      next: () => {
        this.savingEdit = false;
        this.successMessage = "Proveedor actualizado correctamente.";
        this.cancelEdit();
        this.loadSuppliers();
      },
      error: (error: unknown) => {
        this.savingEdit = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo actualizar el proveedor.",
        );
      },
    });
  }

  deactivate(supplier: SupplierResponse): void {
    if (!this.canManage || !supplier.active) {
      return;
    }

    const confirmed = window.confirm(
      `Desactivar proveedor ${supplier.name}? Esta accion no elimina datos.`,
    );
    if (!confirmed) {
      return;
    }

    this.deactivatingId = supplier.id;
    this.errorMessage = "";
    this.successMessage = "";

    this.supplierService.deactivate(supplier.id).subscribe({
      next: () => {
        this.deactivatingId = null;
        this.successMessage = "Proveedor desactivado correctamente.";
        this.loadSuppliers();
      },
      error: (error: unknown) => {
        this.deactivatingId = null;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo desactivar el proveedor.",
        );
      },
    });
  }

  isCreateInvalid(controlName: string): boolean {
    const control = this.createForm.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  isEditInvalid(controlName: string): boolean {
    const control = this.editForm.get(controlName);
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
}
