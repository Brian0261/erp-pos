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
    <section class="card">
      <header class="header">
        <div>
          <h1>Detalle de evento outbox</h1>
          <p class="muted">Inspeccion y acciones administrativas del evento.</p>
        </div>
        <a class="link-btn" routerLink="/integraciones/eventos"
          >Volver al listado</a
        >
      </header>

      <p class="error" *ngIf="permissionMessage">{{ permissionMessage }}</p>
      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage">{{ successMessage }}</p>

      <section *ngIf="event" class="grid">
        <article>
          <h2>Evento</h2>
          <p><strong>ID:</strong> #{{ event.id }}</p>
          <p><strong>EventType:</strong> {{ event.eventType }}</p>
          <p><strong>Status:</strong> {{ event.status }}</p>
          <p>
            <strong>Aggregate:</strong> {{ event.aggregateType }}:{{
              event.aggregateId
            }}
          </p>
          <p><strong>Retries:</strong> {{ event.retryCount }}</p>
          <p>
            <strong>Creado:</strong>
            {{ event.createdAt | date: "yyyy-MM-dd HH:mm" }}
          </p>
          <p>
            <strong>Publicado:</strong>
            {{
              event.publishedAt
                ? (event.publishedAt | date: "yyyy-MM-dd HH:mm")
                : "-"
            }}
          </p>
          <p><strong>Last error:</strong> {{ event.lastError || "-" }}</p>
        </article>

        <article>
          <h2>Payload JSON</h2>
          <pre>{{ event.payloadJson }}</pre>
        </article>
      </section>

      <section *ngIf="event" class="actions">
        <button
          type="button"
          class="secondary"
          [disabled]="loading || event.status === 'PUBLISHED'"
          (click)="markPublished()"
        >
          Mark published
        </button>
        <button
          type="button"
          [disabled]="loading || event.status === 'PUBLISHED'"
          (click)="retry()"
        >
          Retry
        </button>
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
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
      }
      h1,
      h2 {
        margin: 0;
      }
      .muted {
        margin: 0.25rem 0 0;
        color: #6b7280;
      }
      .link-btn {
        text-decoration: none;
        border: 0;
        background: #374151;
        color: #fff;
        border-radius: 0.35rem;
        padding: 0.5rem 0.75rem;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }
      article {
        border: 1px solid #e5e7eb;
        border-radius: 0.45rem;
        padding: 0.75rem;
      }
      p {
        margin: 0.35rem 0;
      }
      pre {
        margin: 0.5rem 0 0;
        white-space: pre-wrap;
        word-break: break-word;
        background: #111827;
        color: #e5e7eb;
        border-radius: 0.4rem;
        padding: 0.75rem;
        max-height: 320px;
        overflow: auto;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
      }
      button {
        border: 0;
        background: #0f766e;
        color: #fff;
        cursor: pointer;
        border-radius: 0.35rem;
        padding: 0.55rem 0.8rem;
      }
      .secondary {
        background: #374151;
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
      @media (max-width: 640px) {
        .header {
          flex-direction: column;
          align-items: flex-start;
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
}
