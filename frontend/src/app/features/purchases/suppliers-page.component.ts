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
    <section class="card">
      <header class="header">
        <div>
          <h1>Compras - Proveedores</h1>
          <p class="muted">Gestion de proveedores para ordenes de compra.</p>
        </div>
      </header>

      <form class="search-row" (ngSubmit)="search()">
        <input
          type="text"
          name="query"
          [(ngModel)]="query"
          [ngModelOptions]="{ standalone: true }"
          placeholder="Buscar por nombre, documento o contacto"
        />
        <button type="submit">Buscar</button>
        <button type="button" class="secondary" (click)="clearSearch()">
          Limpiar
        </button>
      </form>

      <section class="panel" *ngIf="canManage">
        <h2>Nuevo proveedor</h2>
        <form [formGroup]="createForm" (ngSubmit)="create()" class="grid">
          <label>
            Documento
            <input
              type="text"
              formControlName="documentNumber"
              maxlength="40"
            />
          </label>

          <label>
            Nombre *
            <input type="text" formControlName="name" maxlength="180" />
            <small class="error" *ngIf="isCreateInvalid('name')"
              >Nombre es obligatorio.</small
            >
          </label>

          <label>
            Contacto
            <input type="text" formControlName="contactName" maxlength="120" />
          </label>

          <label>
            Telefono
            <input type="text" formControlName="phone" maxlength="40" />
          </label>

          <label>
            Email
            <input type="email" formControlName="email" maxlength="160" />
            <small class="error" *ngIf="isCreateInvalid('email')"
              >Email invalido.</small
            >
          </label>

          <label class="full">
            Direccion
            <textarea
              rows="2"
              formControlName="address"
              maxlength="300"
            ></textarea>
          </label>

          <div class="actions full">
            <button type="submit" [disabled]="savingCreate">
              {{ savingCreate ? "Guardando..." : "Crear proveedor" }}
            </button>
          </div>
        </form>
      </section>

      <section class="panel" *ngIf="editingSupplierId !== null && canManage">
        <h2>Editar proveedor #{{ editingSupplierId }}</h2>
        <form [formGroup]="editForm" (ngSubmit)="update()" class="grid">
          <label>
            Documento
            <input
              type="text"
              formControlName="documentNumber"
              maxlength="40"
            />
          </label>

          <label>
            Nombre *
            <input type="text" formControlName="name" maxlength="180" />
            <small class="error" *ngIf="isEditInvalid('name')"
              >Nombre es obligatorio.</small
            >
          </label>

          <label>
            Contacto
            <input type="text" formControlName="contactName" maxlength="120" />
          </label>

          <label>
            Telefono
            <input type="text" formControlName="phone" maxlength="40" />
          </label>

          <label>
            Email
            <input type="email" formControlName="email" maxlength="160" />
            <small class="error" *ngIf="isEditInvalid('email')"
              >Email invalido.</small
            >
          </label>

          <label class="full">
            Direccion
            <textarea
              rows="2"
              formControlName="address"
              maxlength="300"
            ></textarea>
          </label>

          <label class="checkbox">
            <input type="checkbox" formControlName="active" />
            Proveedor activo
          </label>

          <div class="actions full">
            <button type="submit" [disabled]="savingEdit">
              {{ savingEdit ? "Actualizando..." : "Actualizar proveedor" }}
            </button>
            <button type="button" class="secondary" (click)="cancelEdit()">
              Cancelar
            </button>
          </div>
        </form>
      </section>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <section class="table-wrap">
        <table>
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
              <td>{{ supplier.id }}</td>
              <td>{{ supplier.documentNumber || "-" }}</td>
              <td>{{ supplier.name }}</td>
              <td>{{ supplier.contactName || "-" }}</td>
              <td>{{ supplier.phone || "-" }}</td>
              <td>{{ supplier.email || "-" }}</td>
              <td>
                <span
                  [class.ok]="supplier.active"
                  [class.bad]="!supplier.active"
                >
                  {{ supplier.active ? "Activo" : "Inactivo" }}
                </span>
              </td>
              <td *ngIf="canManage">
                <button
                  type="button"
                  class="secondary"
                  (click)="startEdit(supplier)"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="danger"
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
            <tr *ngIf="!loading && suppliers.length === 0">
              <td [attr.colspan]="canManage ? 8 : 7">
                No hay proveedores registrados.
              </td>
            </tr>
          </tbody>
        </table>
      </section>
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
      .header h1,
      h2 {
        margin: 0;
      }
      .muted {
        margin: 0.25rem 0 0;
        color: #4b5563;
      }
      .search-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
      }
      .search-row input {
        min-width: 280px;
        flex: 1;
      }
      .panel {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 0.85rem;
        display: grid;
        gap: 0.75rem;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: 0.65rem;
      }
      .full {
        grid-column: 1 / -1;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      .checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      input,
      textarea {
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
      }
      button {
        padding: 0.45rem 0.8rem;
        border: 0;
        border-radius: 0.35rem;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
      }
      .secondary {
        background: #374151;
      }
      .danger {
        background: #b91c1c;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
      .table-wrap {
        overflow: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        border-bottom: 1px solid #e5e7eb;
        padding: 0.5rem;
        text-align: left;
        vertical-align: top;
      }
      .ok {
        color: #166534;
        font-weight: 600;
      }
      .bad {
        color: #b91c1c;
        font-weight: 600;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      .success {
        margin: 0;
        color: #166534;
      }
      @media (max-width: 900px) {
        .grid {
          grid-template-columns: 1fr;
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
