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
    <section class="ui-card ui-module-page outbox-events-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Integraciones</p>
          <h1 class="ui-page-title">Outbox de eventos</h1>
          <p class="ui-page-description">
            Monitorea publicacion de eventos y ejecuta acciones administrativas.
          </p>
        </div>
      </header>

      <p class="ui-alert ui-alert--error" *ngIf="permissionMessage">
        {{ permissionMessage }}
      </p>
      <p class="ui-alert ui-alert--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>
      <p class="ui-alert ui-alert--success" *ngIf="successMessage">
        {{ successMessage }}
      </p>

      <section class="ui-module-section">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Filtros de eventos</h2>
        </header>

        <form
          class="ui-filter-grid outbox-filters"
          [formGroup]="filtersForm"
          (ngSubmit)="applyFilters()"
        >
          <label class="ui-field">
            <span>Status</span>
            <select formControlName="status">
              <option value="">Todos</option>
              <option *ngFor="let status of statuses" [value]="status">
                {{ status }}
              </option>
            </select>
          </label>

          <label class="ui-field">
            <span>EventType</span>
            <select formControlName="eventType">
              <option value="">Todos</option>
              <option *ngFor="let eventType of eventTypes" [value]="eventType">
                {{ eventType }}
              </option>
            </select>
          </label>

          <div class="ui-filter-actions outbox-actions">
            <button
              type="submit"
              class="ui-button ui-button--primary"
              [disabled]="loading || !canView"
            >
              Filtrar
            </button>
            <button
              type="button"
              class="ui-button ui-button--secondary"
              (click)="clearFilters()"
              [disabled]="loading || !canView"
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <section class="ui-kpi-grid" *ngIf="canView">
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Total eventos</p>
          <p class="ui-kpi-value">{{ events.length }}</p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">PENDING</p>
          <p class="ui-kpi-value">{{ countByStatus("PENDING") }}</p>
          <p class="kpi-chip">
            <span class="ui-chip ui-chip--warning">PENDING</span>
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">PUBLISHED</p>
          <p class="ui-kpi-value">{{ countByStatus("PUBLISHED") }}</p>
          <p class="kpi-chip">
            <span class="ui-chip ui-chip--success">PUBLISHED</span>
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">FAILED</p>
          <p class="ui-kpi-value">{{ countByStatus("FAILED") }}</p>
          <p class="kpi-chip">
            <span class="ui-chip ui-chip--danger">FAILED</span>
          </p>
        </article>
      </section>

      <section class="ui-module-section">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Listado de eventos</h2>
        </header>

        <div class="ui-table-wrapper">
          <table class="ui-table outbox-table">
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
                <td>
                  <span class="ui-chip" [ngClass]="statusChipClass(row.status)">
                    {{ row.status }}
                  </span>
                </td>
                <td>{{ row.retryCount }}</td>
                <td>{{ row.createdAt | date: "yyyy-MM-dd HH:mm" }}</td>
                <td>
                  {{
                    row.publishedAt
                      ? (row.publishedAt | date: "yyyy-MM-dd HH:mm")
                      : "-"
                  }}
                </td>
                <td>
                  <div class="ui-table-actions">
                    <a
                      class="ui-button ui-button--secondary outbox-action-btn"
                      [routerLink]="['/integraciones/eventos', row.id]"
                    >
                      Ver detalle
                    </a>
                    <button
                      type="button"
                      class="ui-button ui-button--secondary outbox-action-btn"
                      [disabled]="loading || row.status === 'PUBLISHED'"
                      (click)="markPublished(row)"
                    >
                      Mark published
                    </button>
                    <button
                      type="button"
                      class="ui-button ui-button--primary outbox-action-btn"
                      [disabled]="loading || row.status === 'PUBLISHED'"
                      (click)="retry(row)"
                    >
                      Retry
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!loading && events.length === 0">
                <td colspan="8" class="ui-table__empty">
                  <div class="ui-empty-state">
                    No hay eventos para los filtros seleccionados.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      .outbox-filters {
        grid-template-columns: minmax(180px, 220px) minmax(220px, 1fr) auto;
      }

      .outbox-actions {
        align-self: end;
      }

      .kpi-chip {
        margin: 0;
      }

      .outbox-table {
        min-width: 1260px;
      }

      .outbox-action-btn {
        width: 100%;
        font-size: var(--font-size-xs);
        padding: 0.45rem 0.65rem;
      }

      @media (max-width: 760px) {
        .outbox-filters {
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

  statusChipClass(status: OutboxEventStatus): string {
    if (status === "PUBLISHED") {
      return "ui-chip--success";
    }
    if (status === "FAILED") {
      return "ui-chip--danger";
    }
    return "ui-chip--warning";
  }

  countByStatus(status: OutboxEventStatus): number {
    return this.events.filter((event) => event.status === status).length;
  }
}
