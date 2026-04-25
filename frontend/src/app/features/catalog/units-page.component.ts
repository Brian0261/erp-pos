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
    <section class="card">
      <h1>Catalogo - Unidades</h1>

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

        <button type="submit" [disabled]="saving">
          {{ saving ? "Creando..." : "Crear unidad" }}
        </button>
      </form>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <table>
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
            <td>{{ unit.id }}</td>
            <td>{{ unit.code }}</td>
            <td>{{ unit.name }}</td>
            <td>{{ unit.active ? "Activa" : "Inactiva" }}</td>
          </tr>
          <tr *ngIf="units.length === 0">
            <td colspan="4" class="empty">No hay unidades registradas.</td>
          </tr>
        </tbody>
      </table>
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
      h1 {
        margin: 0;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: 0.75rem;
        align-items: end;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input {
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
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 0.55rem;
        border-bottom: 1px solid #e5e7eb;
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
      @media (max-width: 900px) {
        .form-grid {
          grid-template-columns: 1fr;
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
