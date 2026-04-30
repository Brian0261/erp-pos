import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";

import { AuthService } from "../../core/auth/auth.service";
import { toHttpErrorMessage } from "./data/http-error-message";
import { OutboxEventResponse } from "./data/outbox.models";
import { OutboxService } from "./data/outbox.service";

@Component({
  selector: "app-outbox-event-detail-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="ui-card ui-module-page outbox-event-detail-page">
      <header class="ui-page-head">
        <div>
          <p class="ui-page-kicker">Integraciones</p>
          <h1 class="ui-page-title">Detalle de evento outbox</h1>
          <p class="ui-page-description">
            Inspeccion y acciones administrativas del evento.
          </p>
        </div>
        <a
          class="ui-button ui-button--secondary"
          routerLink="/integraciones/eventos"
        >
          Volver al listado
        </a>
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

      <section *ngIf="event" class="ui-kpi-grid">
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">ID</p>
          <p class="ui-kpi-value">#{{ event.id }}</p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Status</p>
          <p class="status-wrap">
            <span class="ui-chip" [ngClass]="statusChipClass(event.status)">
              {{ event.status }}
            </span>
          </p>
        </article>
        <article class="ui-kpi-card">
          <p class="ui-kpi-label">Retries</p>
          <p class="ui-kpi-value">{{ event.retryCount }}</p>
        </article>
      </section>

      <section *ngIf="event" class="detail-grid">
        <article class="ui-module-section">
          <header class="ui-module-section__head">
            <h2 class="ui-module-section__title">Metadatos del evento</h2>
          </header>

          <p class="meta-row">
            <span class="meta-label">EventType</span>{{ event.eventType }}
          </p>
          <p class="meta-row">
            <span class="meta-label">Aggregate</span
            >{{ event.aggregateType }}:{{ event.aggregateId }}
          </p>
          <p class="meta-row">
            <span class="meta-label">Creado</span
            >{{ event.createdAt | date: "yyyy-MM-dd HH:mm" }}
          </p>
          <p class="meta-row">
            <span class="meta-label">Publicado</span>
            {{
              event.publishedAt
                ? (event.publishedAt | date: "yyyy-MM-dd HH:mm")
                : "-"
            }}
          </p>
          <p class="meta-row meta-row--error">
            <span class="meta-label">Last error</span>
            {{ event.lastError || "-" }}
          </p>
        </article>

        <article class="ui-module-section payload-panel">
          <header class="ui-module-section__head">
            <h2 class="ui-module-section__title">Payload JSON</h2>
          </header>
          <pre class="payload-content">{{ event.payloadJson }}</pre>
        </article>
      </section>

      <section *ngIf="event" class="ui-module-section">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Acciones administrativas</h2>
        </header>

        <div class="detail-actions">
          <a
            class="ui-button ui-button--secondary"
            routerLink="/integraciones/eventos"
          >
            Volver al listado
          </a>
          <button
            type="button"
            class="ui-button ui-button--secondary"
            [disabled]="loading || event.status === 'PUBLISHED'"
            (click)="markPublished()"
          >
            Mark published
          </button>
          <button
            type="button"
            class="ui-button ui-button--primary"
            [disabled]="loading || event.status === 'PUBLISHED'"
            (click)="retry()"
          >
            Retry
          </button>
        </div>
      </section>

      <section *ngIf="event" class="ui-module-section">
        <header class="ui-module-section__head">
          <h2 class="ui-module-section__title">Operacion segura</h2>
        </header>
        <p class="operation-note">
          Mark published y Retry mantienen el contrato actual con backend.
          Ejecuta acciones solo cuando el contexto operativo lo permita.
        </p>
      </section>
    </section>
  `,
  styles: [
    `
      .detail-grid {
        display: flex;
        gap: var(--space-3);
        align-items: stretch;
      }

      .detail-grid > * {
        flex: 1;
      }

      .status-wrap {
        margin: 0;
      }

      .meta-row {
        margin: 0;
        display: grid;
        gap: 0.2rem;
      }

      .meta-label {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
      }

      .meta-row--error {
        color: var(--color-danger);
      }

      .payload-panel {
        min-width: 0;
      }

      .payload-content {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        background: #0f172a;
        color: #e2e8f0;
        border-radius: var(--radius-sm);
        padding: var(--space-3);
        max-height: 420px;
        overflow: auto;
      }

      .detail-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .operation-note {
        margin: 0;
        color: var(--color-text-secondary);
      }

      @media (max-width: 900px) {
        .detail-grid {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class OutboxEventDetailPageComponent implements OnInit {
  event: OutboxEventResponse | null = null;

  canView = false;
  loading = false;

  permissionMessage = "";
  errorMessage = "";
  successMessage = "";

  constructor(
    private readonly route: ActivatedRoute,
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

        this.loadEvent();
      },
      error: () => {
        this.permissionMessage = "No se pudo validar permisos del usuario.";
      },
    });
  }

  markPublished(): void {
    if (!this.event) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.outboxService.markPublished(this.event.id).subscribe({
      next: (updated) => {
        this.loading = false;
        this.event = updated;
        this.successMessage = `Evento #${updated.id} marcado como publicado.`;
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

  retry(): void {
    if (!this.event) {
      return;
    }

    this.loading = true;
    this.errorMessage = "";
    this.successMessage = "";

    this.outboxService.retry(this.event.id).subscribe({
      next: (updated) => {
        this.loading = false;
        this.event = updated;
        this.successMessage = `Retry ejecutado para evento #${updated.id}.`;
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

  private loadEvent(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));

    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage = "ID de evento invalido.";
      return;
    }

    this.loading = true;
    this.errorMessage = "";

    this.outboxService.getById(id).subscribe({
      next: (response) => {
        this.loading = false;
        this.event = response;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = toHttpErrorMessage(
          error,
          "No se pudo cargar el detalle del evento.",
        );
      },
    });
  }

  statusChipClass(status: string): string {
    if (status === "PUBLISHED") {
      return "ui-chip--success";
    }
    if (status === "FAILED") {
      return "ui-chip--danger";
    }
    return "ui-chip--warning";
  }
}
