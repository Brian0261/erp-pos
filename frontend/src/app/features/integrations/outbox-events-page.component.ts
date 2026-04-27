import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import {
  OUTBOX_EVENT_STATUSES,
  OUTBOX_EVENT_TYPES,
  OutboxEventResponse,
  OutboxEventStatus,
  OutboxEventType,
} from "./data/outbox.models";
import { OutboxService } from "./data/outbox.service";

@Component({
  selector: "app-outbox-events-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card">
      <header>
        <h1>Integraciones - Outbox eventos</h1>
        <p class="muted">Listado y gestion de eventos pendientes/publicados.</p>
      </header>

      <p class="error" *ngIf="permissionMessage">{{ permissionMessage }}</p>
      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <form
        class="filters"
        [formGroup]="filtersForm"
        (ngSubmit)="applyFilters()"
      >
        <label>
          Status
          <select formControlName="status">
            <option value="">Todos</option>
            <option *ngFor="let status of statuses" [value]="status">
              {{ status }}
            </option>
          </select>
        </label>

        <label>
          EventType
          <select formControlName="eventType">
            <option value="">Todos</option>
            <option *ngFor="let eventType of eventTypes" [value]="eventType">
              {{ eventType }}
            </option>
          </select>
        </label>

        <div class="actions">
          <button type="submit" [disabled]="loading || !canView">
            Filtrar
          </button>
          <button
            type="button"
            class="secondary"
            (click)="clearFilters()"
            [disabled]="loading || !canView"
          >
            Limpiar
          </button>
        </div>
      </form>

      <section class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Evento</th>
              <th>Aggregate</th>
              <th>Status</th>
              <th>Retries</th>
              <th>Creado</th>
              <th>Publicado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of events">
              <td>{{ row.id }}</td>
              <td>{{ row.eventType }}</td>
              <td>{{ row.aggregateType }}:{{ row.aggregateId }}</td>
              <td>{{ row.status }}</td>
              <td>{{ row.retryCount }}</td>
              <td>{{ row.createdAt | date: "yyyy-MM-dd HH:mm" }}</td>
              <td>
                {{
                  row.publishedAt
                    ? (row.publishedAt | date: "yyyy-MM-dd HH:mm")
                    : "-"
                }}
              </td>
              <td class="row-actions">
                <a
                  class="link-btn"
                  [routerLink]="['/integraciones/eventos', row.id]"
                >
                  Ver detalle
                </a>
                <button
                  type="button"
                  class="secondary"
                  [disabled]="loading || row.status === 'PUBLISHED'"
                  (click)="markPublished(row)"
                >
                  Mark published
                </button>
                <button
                  type="button"
                  [disabled]="loading || row.status === 'PUBLISHED'"
                  (click)="retry(row)"
                >
                  Retry
                </button>
              </td>
            </tr>
            <tr *ngIf="!loading && events.length === 0">
              <td colspan="8" class="empty">
                No hay eventos para los filtros seleccionados.
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
      h1 {
        margin: 0;
      }
      .muted {
        margin: 0.25rem 0 0;
        color: #6b7280;
      }
      .filters {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: 0.6rem;
        align-items: end;
      }
      label {
        display: grid;
        gap: 0.35rem;
      }
      input,
      select,
      button {
        padding: 0.5rem 0.7rem;
        border: 1px solid #d1d5db;
        border-radius: 0.35rem;
      }
      button {
        border: 0;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
      }
      .secondary {
        background: #374151;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
      }
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 0.45rem;
        border-bottom: 1px solid #e5e7eb;
        vertical-align: top;
      }
      .row-actions {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
      }
      .link-btn {
        text-decoration: none;
        border: 0;
        background: #1f2937;
        color: #fff;
        border-radius: 0.35rem;
        padding: 0.45rem 0.7rem;
        font-size: 0.9rem;
      }
      .empty {
        text-align: center;
        color: #6b7280;
      }
      .error {
        margin: 0;
        color: #b91c1c;
      }
      .success {
        margin: 0;
        color: #166534;
      }
      @media (max-width: 980px) {
        .filters {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 640px) {
        .filters {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class OutboxEventsPageComponent implements OnInit {
  readonly statuses = OUTBOX_EVENT_STATUSES;
  readonly eventTypes = OUTBOX_EVENT_TYPES;

  readonly filtersForm = this.formBuilder.group({
    status: [""],
    eventType: [""],
  });

  canView = false;
  loading = false;

  events: OutboxEventResponse[] = [];

  permissionMessage = "";
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly outboxService: OutboxService,
  ) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.canView = user.roles.includes("ADMIN");

        if (!this.canView) {
          this.permissionMessage =
            "No tienes permisos para consultar eventos de integraciones.";
          return;
        }

        this.loadEvents();
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
      },
    });
  }

  applyFilters(): void {
    this.loadEvents();
  }

  clearFilters(): void {
    this.filtersForm.reset({
      status: "",
      eventType: "",
    });
    this.loadEvents();
  }

  markPublished(event: OutboxEventResponse): void {
    this.errorMessage = "";
    this.successMessage = "";
    this.loading = true;

    this.outboxService.markPublished(event.id).subscribe({
      next: (updated) => {
        this.loading = false;
        this.successMessage = `Evento #${updated.id} marcado como publicado.`;
        this.patchRow(updated);
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo marcar el evento como publicado.",
        );
      },
    });
  }

  retry(event: OutboxEventResponse): void {
    this.errorMessage = "";
    this.successMessage = "";
    this.loading = true;

    this.outboxService.retry(event.id).subscribe({
      next: (updated) => {
        this.loading = false;
        this.successMessage = `Retry ejecutado para evento #${updated.id}.`;
        this.patchRow(updated);
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo reintentar el evento.",
        );
      },
    });
  }

  private loadEvents(): void {
    if (!this.canView) {
      return;
    }

    const raw = this.filtersForm.getRawValue();

    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.outboxService
      .list({
        status: raw.status ? (raw.status as OutboxEventStatus) : null,
        eventType: raw.eventType ? (raw.eventType as OutboxEventType) : null,
      })
      .subscribe({
        next: (rows) => {
          this.loading = false;
          this.events = rows;
        },
        error: (error: unknown) => {
          this.loading = false;
          this.errorMessage = toHttpErrorMessage(
            error,
            "No se pudo cargar el listado de eventos.",
          );
        },
      });
  }

  private patchRow(updated: OutboxEventResponse): void {
    this.events = this.events.map((row) =>
      row.id === updated.id ? updated : row,
    );
  }
}
