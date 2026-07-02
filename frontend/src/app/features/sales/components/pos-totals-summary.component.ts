import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

@Component({
  selector: "app-pos-totals-summary",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="total-board" aria-label="Totales de venta">
      <article class="total-main">
        <span>Total a cobrar</span>
        <strong>S/ {{ total | number: "1.2-2" }}</strong>
      </article>

      <div class="total-grid">
        <article>
          <span>Subtotal</span>
          <strong>S/ {{ subtotal | number: "1.2-2" }}</strong>
        </article>
        <article>
          <span>Descuento</span>
          <strong>S/ {{ discountTotal | number: "1.2-2" }}</strong>
        </article>
        <article>
          <span>Pagado</span>
          <strong>S/ {{ paidTotal | number: "1.2-2" }}</strong>
        </article>
        <article class="total-change">
          <span>Vuelto</span>
          <strong>S/ {{ change | number: "1.2-2" }}</strong>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
      .total-board {
        border: 1px solid rgba(18, 23, 184, 0.18);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        display: grid;
        gap: var(--space-2);
        min-height: 0;
        overflow: hidden;
        grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
        align-items: stretch;
        min-height: 4.15rem;
        padding: 0.35rem;
      }

      .total-main {
        display: grid;
        gap: 0.18rem;
        border-radius: var(--radius-lg);
        background:
          linear-gradient(135deg, var(--color-brand-primary), rgba(15, 23, 42, 0.94)),
          var(--color-brand-primary);
        color: var(--color-text-on-dark);
        padding: 0.55rem var(--space-2);
      }

      .total-main span {
        color: rgba(255, 255, 255, 0.78);
      }

      .total-grid span,
      .total-main span {
        font-size: 0.56rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .total-main strong {
        font-size: clamp(1.42rem, 2vw, 1.82rem);
        line-height: 1;
      }

      .total-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-1);
      }

      .total-grid article {
        display: grid;
        gap: 0.08rem;
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--color-bg-soft) 82%, var(--color-bg-surface));
        padding: 0.35rem var(--space-1);
      }

      .total-grid strong {
        font-size: var(--font-size-sm);
        font-weight: 700;
      }

      .total-change strong {
        color: var(--color-success);
      }

      @media (max-width: 760px) {
        .total-board,
        .total-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PosTotalsSummaryComponent {
  @Input({ required: true }) total = 0;
  @Input({ required: true }) subtotal = 0;
  @Input({ required: true }) discountTotal = 0;
  @Input({ required: true }) paidTotal = 0;
  @Input({ required: true }) change = 0;
}
