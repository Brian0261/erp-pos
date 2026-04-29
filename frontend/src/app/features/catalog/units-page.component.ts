import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { Unit } from "./data/catalog.models";
import { toHttpErrorMessage } from "./data/http-error-message";
import { UnitService } from "./data/unit.service";

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
            Define unidades de medida estandar para ventas, compras e
            inventario.
          </p>
        </div>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
        <label class="field">
          <span>Codigo *</span>
          <input type="text" formControlName="code" placeholder="Ej. UND" />
          <small class="field-error" *ngIf="isInvalid('code')"
            >Codigo es obligatorio.</small
          >
        </label>

        <label class="field">
          <span>Nombre *</span>
          <input type="text" formControlName="name" placeholder="Ej. Unidad" />
          <small class="field-error" *ngIf="isInvalid('name')"
            >Nombre es obligatorio.</small
          >
        </label>

        <div class="form-action">
          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="saving"
          >
            {{ saving ? "Creando..." : "Crear unidad" }}
          </button>
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
              <th>ID</th>
              <th>Codigo</th>
              <th>Nombre</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let unit of units">
              <td class="cell-id">{{ unit.id }}</td>
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
        color: var(--color-text-secondary);
        font-weight: 700;
      }

      input {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
      }

      .field-error {
        color: var(--color-danger);
        font-size: var(--font-size-xs);
      }

      .form-action {
        display: flex;
        justify-content: flex-end;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .cell-id,
      .cell-code {
        white-space: nowrap;
      }

      @media (max-width: 900px) {
        .catalog-page {
          padding: var(--space-4);
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .form-action {
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

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly unitService: UnitService,
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
    this.unitService
      .create({
        code: (value.code ?? "").trim(),
        name: (value.name ?? "").trim(),
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = "Unidad creada correctamente.";
          this.form.reset();
          this.loadUnits();
        },
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo crear la unidad.",
          );
        },
      });
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
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
