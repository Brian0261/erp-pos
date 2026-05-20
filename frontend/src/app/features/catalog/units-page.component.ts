import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { Unit } from "./data/catalog.models";
import { toHttpErrorMessage } from "./data/http-error-message";
import { UnitService } from "./data/unit.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";

@Component({
  selector: "app-units-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="ui-card catalog-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Catalogo InkToy</p>
          <h1 class="ui-page-title">Unidades</h1>
            <p class="ui-page-description">
            Define unidades de medida estándar para ventas, compras e
            inventario.
          </p>
        </div>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
        <span class="field-label">Código *</span>
        <span class="field-label">Nombre *</span>
        <span class="field-label field-label--placeholder" aria-hidden="true">&nbsp;</span>

        <input type="text" formControlName="code" placeholder="Ej. UND" />
        <input type="text" formControlName="name" placeholder="Ej. Unidad" />
        <div class="form-action">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving"
          >
            {{ submitButtonLabel }}
          </button>
          <button
            type="button"
            class="ui-button ui-button--secondary"
            *ngIf="isEditing"
            [disabled]="saving"
            (click)="cancelEdit()"
          >
            Cancelar
          </button>
        </div>

        <div class="field-feedback" aria-live="polite">
          <small class="field-error" [class.field-error--hidden]="!isInvalid('code')">Código es obligatorio.</small>
        </div>
        <div class="field-feedback" aria-live="polite">
          <small class="field-error" [class.field-error--hidden]="!isInvalid('name')">Nombre es obligatorio.</small>
        </div>
        <div class="field-feedback field-feedback--placeholder" aria-hidden="true">
          <small class="field-placeholder">&nbsp;</small>
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
              <th>Código</th>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let unit of units">
              <td class="cell-code">{{ unit.code }}</td>
              <td>{{ unit.name }}</td>
              <td>
                <span
                  class="ui-badge"
                  [class.ui-badge--success]="unit.active"
                  [class.ui-badge--danger]="!unit.active"
                >
                  {{ unit.active ? "Activa" : "Inactiva" }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button
                    type="button"
                    class="ui-button ui-button--secondary"
                    [disabled]="saving"
                    (click)="editUnit(unit)"
                  >
                    Editar
                  </button>
                  <button
                    *ngIf="unit.active"
                    type="button"
                    class="ui-button ui-button--danger"
                    [disabled]="saving"
                    (click)="changeStatus(unit, false)"
                  >
                    Desactivar
                  </button>
                  <button
                    *ngIf="!unit.active"
                    type="button"
                    class="ui-button ui-button--secondary"
                    [disabled]="saving"
                    (click)="changeStatus(unit, true)"
                  >
                    Reactivar
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="units.length === 0">
              <td colspan="4" class="ui-table__empty">
                <div class="ui-empty-state">No hay unidades registradas.</div>
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
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      .field-label--placeholder {
        visibility: hidden;
      }

      input {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        box-sizing: border-box;
        width: 100%;
        height: 2.75rem;
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

      .field-feedback {
        min-height: 1rem;
      }

      .field-feedback--placeholder {
        justify-self: end;
      }

      .field-placeholder {
        visibility: hidden;
      }

      .form-action {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        justify-content: flex-end;
        align-self: stretch;
        align-items: stretch;
      }

      .form-action .ui-button {
        height: 100%;
        box-sizing: border-box;
      }

      .actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        align-items: center;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .cell-code {
        white-space: nowrap;
      }

      @media (max-width: 900px) {
        .catalog-page {
          padding: var(--space-4);
        }

        .form-grid {
          grid-template-columns: 1fr;
          grid-template-rows: auto;
        }

        .form-action {
          justify-content: flex-start;
        }

        .actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class UnitsPageComponent implements OnInit {
  readonly form = this.formBuilder.group({
    code: ["", [Validators.required, Validators.maxLength(20)]],
    name: ["", [Validators.required, Validators.maxLength(120)]],
  });

  units: Unit[] = [];
  saving = false;
  errorMessage = "";
  successMessage = "";
  editingUnitId: number | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly unitService: UnitService,
    private readonly confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.loadUnits();
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
    const payload = {
      code: (value.code ?? "").trim(),
      name: (value.name ?? "").trim(),
    };
    const request$ = this.editingUnitId === null
      ? this.unitService.create(payload)
      : this.unitService.update(this.editingUnitId, payload);

    request$
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = this.editingUnitId === null
            ? "Unidad creada correctamente."
            : "Unidad actualizada correctamente.";
          this.cancelEdit();
          this.loadUnits();
        },
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            this.editingUnitId === null
              ? "No se pudo crear la unidad."
              : "No se pudo actualizar la unidad.",
          );
        },
      });
  }

  editUnit(unit: Unit): void {
    this.editingUnitId = unit.id;
    this.errorMessage = "";
    this.successMessage = "";
    this.form.setValue({ code: unit.code, name: unit.name });
  }

  cancelEdit(): void {
    this.editingUnitId = null;
    this.form.reset();
  }

  async changeStatus(unit: Unit, active: boolean): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: active ? "Reactivar unidad" : "Desactivar unidad",
      description: active
        ? `Vas a reactivar la unidad ${unit.code}.`
        : `Vas a desactivar la unidad ${unit.code}.`,
      highlightText: unit.name,
      confirmText: active ? "Reactivar" : "Desactivar",
      cancelText: "Cancelar",
      variant: active ? "warning" : "danger",
    });

    if (!confirmed) {
      return;
    }

    this.saving = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.unitService.changeStatus(unit.id, { active }).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = active
          ? "Unidad reactivada correctamente."
          : "Unidad desactivada correctamente.";
        this.loadUnits();
      },
      error: (error: unknown) => {
        this.saving = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          active
            ? "No se pudo reactivar la unidad."
            : "No se pudo desactivar la unidad.",
        );
      },
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  get isEditing(): boolean {
    return this.editingUnitId !== null;
  }

  get submitButtonLabel(): string {
    if (this.saving) {
      return this.isEditing ? "Actualizando..." : "Creando...";
    }

    return this.isEditing ? "Actualizar unidad" : "Crear unidad";
  }

  private loadUnits(): void {
    this.unitService.list().subscribe({
      next: (units) => {
        this.units = units;
      },
      error: (error: unknown) => {
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudieron cargar las unidades.",
        );
      },
    });
  }
}
