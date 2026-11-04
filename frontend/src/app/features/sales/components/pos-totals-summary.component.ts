import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

@Component({
    selector: "app-pos-totals-summary",
    imports: [CommonModule],
    template: `
    <section class="total-board" aria-label="Totales de venta">
      <article class="total-main">
        <span>Total a cobrar</span>
        <strong>S/ {{ (total | number: "1.2-2") ?? '—' }}</strong>
      </article>

      <div class="total-grid">
        <article>
          <span>Subtotal</span>
          <strong>S/ {{ (subtotal | number: "1.2-2") ?? '—' }}</strong>
        </article>
        <article>
          <span>Descuento</span>
          <strong>S/ {{ (discountTotal | number: "1.2-2") ?? '—' }}</strong>
        </article>
        <article *ngIf="showSettlement">
          <span>Pagado</span>
          <strong>S/ {{ (paidTotal | number: "1.2-2") ?? '—' }}</strong>
        </article>
        <article class="total-change" *ngIf="showSettlement">
          <span>Vuelto</span>
          <strong>S/ {{ (change | number: "1.2-2") ?? '—' }}</strong>
        </article>
      </div>
    </section>
  `,
    styles: [`
.total-board{display:flex;flex-direction:column-reverse;gap:.55rem;min-width:0}.total-grid{display:grid;gap:.25rem;padding:.55rem .7rem;border:1px solid var(--color-border-default);border-radius:var(--radius-md);background:var(--color-bg-soft)}.total-grid article{display:flex;gap:.6rem;justify-content:space-between;align-items:center;min-width:0;font-size:.875rem;line-height:1.5}.total-grid strong{font-variant-numeric:tabular-nums;white-space:nowrap}.total-change strong{color:var(--color-text-primary)}.total-main{display:flex;gap:.75rem;align-items:center;justify-content:space-between;min-width:0;border-radius:var(--radius-lg);padding:.9rem 1rem;background:var(--color-brand-primary);color:var(--color-text-on-dark)}.total-main span{font-size:1rem;font-weight:600}.total-main strong{font-size:clamp(1.5rem,2.5vw,2rem);font-variant-numeric:tabular-nums;white-space:nowrap;line-height:1.2}
@media(max-width:360px){.total-main{padding:.75rem;flex-wrap:wrap}.total-main strong{font-size:1.65rem}}

    `],
})
export class PosTotalsSummaryComponent {
  @Input() showSettlement = true;
  @Input({ required: true }) total = 0;
  @Input({ required: true }) subtotal = 0;
  @Input({ required: true }) discountTotal = 0;
  @Input({ required: true }) paidTotal = 0;
  @Input({ required: true }) change = 0;
}
