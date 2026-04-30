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
    <section class="ui-card cash-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Operacion Comercial InkToy</p>
          <h1 class="ui-page-title">Caja</h1>
          <p class="ui-page-description">
            Gestiona apertura, consulta y cierre de caja manteniendo
            trazabilidad de montos operativos.
          </p>
        </div>

        <div class="head-actions">
          <span
            class="ui-badge"
            [class.ui-badge--success]="hasOpenSession"
            [class.ui-badge--warning]="!hasOpenSession"
          >
            {{ hasOpenSession ? "Sesion OPEN" : "Sin sesion OPEN" }}
          </span>
          <button
            type="button"
            class="ui-button ui-button--secondary"
            (click)="loadCurrentSession()"
          >
            Refrescar caja actual
          </button>
        </div>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <article class="panel">
        <header class="block-head">
          <h2>Caja actual</h2>
        </header>

        <ng-container *ngIf="currentSession; else noCurrentSession">
          <div class="session-grid">
            <p><strong>ID:</strong> #{{ currentSession.id }}</p>
            <p>
              <strong>Estado:</strong>
              <span
                class="ui-badge"
                [class.ui-badge--success]="currentSession.status === 'OPEN'"
                [class.ui-badge--danger]="currentSession.status !== 'OPEN'"
              >
                {{ currentSession.status }}
              </span>
            </p>
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
              {{
                currentSession.countedAmount !== null
                  ? (currentSession.countedAmount | number: "1.2-2")
                  : "-"
              }}
            </p>
            <p>
              <strong>Efectivo esperado:</strong>
              {{
                currentSession.expectedCashAmount !== null
                  ? (currentSession.expectedCashAmount | number: "1.2-2")
                  : "-"
              }}
            </p>
            <p>
              <strong>Diferencia:</strong>
              {{
                currentSession.differenceAmount !== null
                  ? (currentSession.differenceAmount | number: "1.2-2")
                  : "-"
              }}
            </p>
            <p class="full-width">
              <strong>Notas:</strong> {{ currentSession.notes || "-" }}
            </p>
          </div>
        </ng-container>
        <ng-template #noCurrentSession>
          <p class="ui-empty-state">
            No hay caja abierta para el usuario actual.
          </p>
        </ng-template>
      </article>

      <article class="panel">
        <header class="block-head">
          <h2>Abrir caja</h2>
        </header>

        <form
          [formGroup]="openForm"
          (ngSubmit)="openCashRegister()"
          class="form-grid"
        >
          <label class="field">
            <span>Monto inicial *</span>
            <input
              type="number"
              formControlName="openingAmount"
              min="0"
              step="0.01"
            />
          </label>

          <label class="field">
            <span>Notas</span>
            <textarea formControlName="notes" maxlength="400"></textarea>
          </label>

          <button
            type="submit"
            class="ui-button ui-button--primary"
            [disabled]="opening || hasOpenSession"
          >
            Abrir caja
          </button>
        </form>

        <p class="ui-alert ui-alert--info" *ngIf="hasOpenSession">
          Ya existe una caja abierta. Cierra la caja actual antes de abrir otra.
        </p>
      </article>

      <article class="panel" *ngIf="hasOpenSession">
        <header class="block-head">
          <h2>Cerrar caja</h2>
        </header>

        <form
          [formGroup]="closeForm"
          (ngSubmit)="closeCashRegister()"
          class="form-grid"
        >
          <label class="field">
            <span>Monto contado *</span>
            <input
              type="number"
              formControlName="countedAmount"
              min="0"
              step="0.01"
            />
          </label>

          <label class="field">
            <span>Notas</span>
            <textarea formControlName="notes" maxlength="400"></textarea>
          </label>

          <button
            type="submit"
            class="ui-button ui-button--danger"
            [disabled]="closing"
          >
            Cerrar caja
          </button>
        </form>
      </article>

      <article class="panel">
        <header class="block-head">
          <h2>Consultar caja por ID</h2>
        </header>

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
          <button type="submit" class="ui-button ui-button--secondary">
            Buscar
          </button>
        </form>

        <div *ngIf="lookupSession" class="session-grid lookup-grid">
          <p><strong>ID:</strong> #{{ lookupSession.id }}</p>
          <p>
            <strong>Estado:</strong>
            <span
              class="ui-badge"
              [class.ui-badge--success]="lookupSession.status === 'OPEN'"
              [class.ui-badge--danger]="lookupSession.status !== 'OPEN'"
            >
              {{ lookupSession.status }}
            </span>
          </p>
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
            {{
              lookupSession.countedAmount !== null
                ? (lookupSession.countedAmount | number: "1.2-2")
                : "-"
            }}
          </p>
          <p>
            <strong>Efectivo esperado:</strong>
            {{
              lookupSession.expectedCashAmount !== null
                ? (lookupSession.expectedCashAmount | number: "1.2-2")
                : "-"
            }}
          </p>
          <p>
            <strong>Diferencia:</strong>
            {{
              lookupSession.differenceAmount !== null
                ? (lookupSession.differenceAmount | number: "1.2-2")
                : "-"
            }}
          </p>
        </div>
      </article>
    </section>
  `,
  styles: [
    `
      .cash-page {
        padding: var(--space-5);
        display: grid;
        gap: var(--space-4);
      }

      .head-actions {
        display: flex;
        gap: var(--space-2);
        align-items: center;
        flex-wrap: wrap;
      }

      h1,
      h2 {
        margin: 0;
      }

      .panel {
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        background: var(--color-bg-surface);
        display: grid;
        gap: var(--space-3);
      }

      .block-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .form-grid {
        display: grid;
        gap: var(--space-3);
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

      input,
      textarea {
        padding: 0.6rem 0.7rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border-strong);
        background: var(--color-bg-surface);
      }

      textarea {
        min-height: 88px;
        resize: vertical;
      }

      .ui-button {
        width: fit-content;
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .lookup-row {
        display: grid;
        grid-template-columns: minmax(160px, 220px) auto;
        gap: var(--space-2);
        align-items: center;
      }

      .session-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        gap: var(--space-2) var(--space-4);
      }

      .session-grid p {
        margin: 0;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      .lookup-grid {
        border-top: 1px solid var(--color-border-default);
        padding-top: var(--space-3);
      }

      .ui-empty-state {
        text-align: left;
        padding: 0;
      }

      @media (max-width: 800px) {
        .cash-page {
          padding: var(--space-4);
        }

        .session-grid {
          grid-template-columns: 1fr;
        }

        .full-width {
          grid-column: auto;
        }

        .lookup-row {
          grid-template-columns: 1fr;
          align-items: stretch;
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
