import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { toHttpErrorMessage } from "./data/http-error-message";
import { CashRegisterService } from "./data/cash-register.service";
import { CashRegisterResponse } from "./data/sales.models";

@Component({
  selector: "app-cash-register-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card">
      <header>
        <h1>Caja</h1>
        <p class="muted">Apertura, consulta y cierre de caja.</p>
      </header>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <article class="panel">
        <h2>Caja actual</h2>
        <ng-container *ngIf="currentSession; else noCurrentSession">
          <div class="session-grid">
            <p><strong>ID:</strong> #{{ currentSession.id }}</p>
            <p><strong>Estado:</strong> {{ currentSession.status }}</p>
            <p>
              <strong>Apertura:</strong>
              {{ currentSession.openedAt | date: "yyyy-MM-dd HH:mm" }}
            </p>
            <p>
              <strong>Cierre:</strong>
              {{
                currentSession.closedAt
                  ? (currentSession.closedAt | date: "yyyy-MM-dd HH:mm")
                  : "-"
              }}
            </p>
            <p>
              <strong>Monto inicial:</strong>
              {{ currentSession.openingAmount | number: "1.2-2" }}
            </p>
            <p>
              <strong>Monto contado:</strong>
              {{ currentSession.countedAmount ?? "-" }}
            </p>
            <p>
              <strong>Efectivo esperado:</strong>
              {{ currentSession.expectedCashAmount ?? "-" }}
            </p>
            <p>
              <strong>Diferencia:</strong>
              {{ currentSession.differenceAmount ?? "-" }}
            </p>
            <p><strong>Notas:</strong> {{ currentSession.notes || "-" }}</p>
          </div>
        </ng-container>
        <ng-template #noCurrentSession>
          <p class="muted">No hay caja abierta para el usuario actual.</p>
        </ng-template>

        <button type="button" class="secondary" (click)="loadCurrentSession()">
          Refrescar caja actual
        </button>
      </article>

      <article class="panel">
        <h2>Abrir caja</h2>
        <form
          [formGroup]="openForm"
          (ngSubmit)="openCashRegister()"
          class="form-grid"
        >
          <label>
            Monto inicial *
            <input
              type="number"
              formControlName="openingAmount"
              min="0"
              step="0.01"
            />
          </label>

          <label>
            Notas
            <textarea formControlName="notes" maxlength="400"></textarea>
          </label>

          <button type="submit" [disabled]="opening || hasOpenSession">
            Abrir caja
          </button>
        </form>
        <p class="muted" *ngIf="hasOpenSession">
          Ya existe una caja abierta. Cierra la caja actual antes de abrir otra.
        </p>
      </article>

      <article class="panel" *ngIf="hasOpenSession">
        <h2>Cerrar caja</h2>
        <form
          [formGroup]="closeForm"
          (ngSubmit)="closeCashRegister()"
          class="form-grid"
        >
          <label>
            Monto contado *
            <input
              type="number"
              formControlName="countedAmount"
              min="0"
              step="0.01"
            />
          </label>

          <label>
            Notas
            <textarea formControlName="notes" maxlength="400"></textarea>
          </label>

          <button type="submit" [disabled]="closing">Cerrar caja</button>
        </form>
      </article>

      <article class="panel">
        <h2>Consultar caja por ID</h2>
        <form
          [formGroup]="lookupForm"
          (ngSubmit)="lookupById()"
          class="lookup-row"
        >
          <input
            type="number"
            formControlName="id"
            min="1"
            placeholder="ID de caja"
          />
          <button type="submit">Buscar</button>
        </form>

        <div *ngIf="lookupSession" class="session-grid">
          <p><strong>ID:</strong> #{{ lookupSession.id }}</p>
          <p><strong>Estado:</strong> {{ lookupSession.status }}</p>
          <p>
            <strong>Apertura:</strong>
            {{ lookupSession.openedAt | date: "yyyy-MM-dd HH:mm" }}
          </p>
          <p>
            <strong>Cierre:</strong>
            {{
              lookupSession.closedAt
                ? (lookupSession.closedAt | date: "yyyy-MM-dd HH:mm")
                : "-"
            }}
          </p>
          <p>
            <strong>Monto inicial:</strong>
            {{ lookupSession.openingAmount | number: "1.2-2" }}
          </p>
          <p>
            <strong>Monto contado:</strong>
            {{ lookupSession.countedAmount ?? "-" }}
          </p>
          <p>
            <strong>Efectivo esperado:</strong>
            {{ lookupSession.expectedCashAmount ?? "-" }}
          </p>
          <p>
            <strong>Diferencia:</strong>
            {{ lookupSession.differenceAmount ?? "-" }}
          </p>
        </div>
      </article>
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
      h1,
      h2 {
        margin: 0;
      }
      .panel {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 0.8rem;
        display: grid;
        gap: 0.75rem;
      }
      .form-grid {
        display: grid;
        gap: 0.6rem;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
      textarea,
      button {
        padding: 0.5rem 0.7rem;
        border-radius: 0.35rem;
        border: 1px solid #d1d5db;
      }
      textarea {
        min-height: 70px;
        resize: vertical;
      }
      button {
        border: 0;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
      }
      .secondary {
        background: #374151;
        width: fit-content;
      }
      .lookup-row {
        display: grid;
        grid-template-columns: 200px auto;
        gap: 0.5rem;
      }
      .session-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        gap: 0.45rem 0.8rem;
      }
      .session-grid p,
      .muted,
      .error,
      .success {
        margin: 0;
      }
      .muted {
        color: #6b7280;
      }
      .error {
        color: #b91c1c;
      }
      .success {
        color: #166534;
      }
      @media (max-width: 800px) {
        .session-grid {
          grid-template-columns: 1fr;
        }
        .lookup-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CashRegisterPageComponent implements OnInit {
  readonly openForm = this.formBuilder.group({
    openingAmount: [0, [Validators.required, Validators.min(0)]],
    notes: [""],
  });

  readonly closeForm = this.formBuilder.group({
    countedAmount: [0, [Validators.required, Validators.min(0)]],
    notes: [""],
  });

  readonly lookupForm = this.formBuilder.group({
    id: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  currentSession: CashRegisterResponse | null = null;
  lookupSession: CashRegisterResponse | null = null;

  opening = false;
  closing = false;

  errorMessage = "";
  successMessage = "";

  get hasOpenSession(): boolean {
    return this.currentSession?.status === "OPEN";
  }

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly cashRegisterService: CashRegisterService,
  ) {}

  ngOnInit(): void {
    this.loadCurrentSession();
  }

  loadCurrentSession(): void {
    this.errorMessage = "";
    this.successMessage = "";

    this.cashRegisterService.current().subscribe({
      next: (session) => {
        this.currentSession = session;
      },
      error: (error: unknown) => {
        this.currentSession = null;
        const message = toHttpErrorMessage(
          error,
          "No se pudo consultar la caja actual.",
        );

        if (message.startsWith("No encontrado:")) {
          return;
        }

        this.errorMessage = message;
      },
    });
  }

  openCashRegister(): void {
    if (this.hasOpenSession) {
      this.errorMessage =
        "No puedes abrir una segunda caja mientras exista una abierta.";
      return;
    }

    if (this.openForm.invalid) {
      this.openForm.markAllAsTouched();
      this.errorMessage =
        "openingAmount es requerido y debe ser mayor o igual a 0.";
      return;
    }

    this.opening = true;
    this.errorMessage = "";
    this.successMessage = "";

    const value = this.openForm.getRawValue();
    this.cashRegisterService
      .open({
        openingAmount: Number(value.openingAmount ?? 0),
        notes: value.notes?.trim() ? value.notes.trim() : null,
      })
      .subscribe({
        next: (session) => {
          this.opening = false;
          this.currentSession = session;
          this.successMessage = `Caja #${session.id} abierta correctamente.`;
        },
        error: (error: unknown) => {
          this.opening = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo abrir la caja.",
          );
        },
      });
  }

  closeCashRegister(): void {
    if (!this.currentSession || !this.hasOpenSession) {
      this.errorMessage = "No hay caja abierta para cerrar.";
      return;
    }

    if (this.closeForm.invalid) {
      this.closeForm.markAllAsTouched();
      this.errorMessage =
        "countedAmount es requerido y debe ser mayor o igual a 0.";
      return;
    }

    this.closing = true;
    this.errorMessage = "";
    this.successMessage = "";

    const value = this.closeForm.getRawValue();

    this.cashRegisterService
      .close(this.currentSession.id, {
        countedAmount: Number(value.countedAmount ?? 0),
        notes: value.notes?.trim() ? value.notes.trim() : null,
      })
      .subscribe({
        next: (session) => {
          this.closing = false;
          this.currentSession = session;
          this.successMessage = `Caja #${session.id} cerrada correctamente.`;
          this.loadCurrentSession();
        },
        error: (error: unknown) => {
          this.closing = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo cerrar la caja.",
          );
        },
      });
  }

  lookupById(): void {
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      this.errorMessage = "Ingresa un ID de caja valido.";
      return;
    }

    this.errorMessage = "";
    this.successMessage = "";

    const id = Number(this.lookupForm.value.id);
    this.cashRegisterService.getById(id).subscribe({
      next: (session) => {
        this.lookupSession = session;
      },
      error: (error: unknown) => {
        this.lookupSession = null;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo obtener la caja solicitada.",
        );
      },
    });
  }
}
