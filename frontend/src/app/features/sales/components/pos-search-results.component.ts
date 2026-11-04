import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { PosProductResponse } from "../data/sales.models";

@Component({
    selector: "app-pos-search-results",
    imports: [CommonModule],
    template: `
    <section class="results-panel">
      <header class="panel-head">
        <div>
          <h2>Resultados de búsqueda</h2>
        </div>
        <span class="results-count">{{ loading ? "Buscando…" : failed ? "Consulta no disponible" : searchResults.length + " resultados" }}</span>
      </header>

      <p class="result-hint" *ngIf="searchResults.length > 1">
        Hay varias coincidencias. Revisa nombre, código, precio y stock antes de
        tocar Agregar.
      </p>

      <div class="empty-results" [attr.role]="loading || searched || failed ? 'status' : null" *ngIf="loading || failed || searchResults.length === 0">
        <strong>{{ loading ? "Buscando productos" : failed ? "No se pudo consultar" : searched ? "Sin coincidencias para la búsqueda" : "Busca o agrega un producto" }}</strong>
        <span>{{ failed ? "Reintenta la búsqueda; no se ha agregado ningún producto." : "Enter busca por nombre. Agregar por código usa el SKU o barcode exacto." }}</span>
      </div>

      <div class="results-grid" *ngIf="!loading && !failed && searchResults.length > 0">
        <article class="result-card" *ngFor="let result of searchResults">
          <div class="result-card__body">
            <h3>{{ result.name }}</h3>
            <p class="result-card__sku">{{ result.sku }}<span *ngIf="result.barcode"> · Cód. {{ result.barcode }}</span></p>
          </div>
          <span class="result-meta__stock">Stock: {{ result.stockAvailable | number:'1.0-3' }}</span>
          <div class="result-card__action">
            <p class="result-price">
              S/ {{ result.salePrice | number: "1.2-2" }}
            </p>
            <button
              type="button"
              class="ui-button ui-button--primary pos-button pos-button--add result-add-button"
              (click)="addProduct.emit(result)"
              [disabled]="result.stockAvailable <= 0"

            >
              {{ result.stockAvailable <= 0 ? "Sin stock" : "Agregar" }}
            </button>
          </div>
        </article>
      </div>
    </section>
  `,
    styles: [`
:host{display:block;min-width:0}.results-panel{border:1px solid var(--color-border-default);border-radius:var(--radius-lg);padding:.65rem;background:var(--color-bg-surface);min-width:0}.panel-head{display:flex;gap:.5rem;align-items:center;justify-content:space-between;margin-bottom:.55rem;flex-wrap:wrap}.panel-head h2{font-size:1rem;margin:0}.results-count{font-size:.8rem;color:var(--color-text-secondary)}.result-hint{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.results-grid{display:grid;gap:.35rem;max-height:55dvh;overflow:auto;scrollbar-gutter:stable;padding:.2rem;min-width:0}.result-card{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:.65rem;padding:.4rem .5rem;border:1px solid var(--color-border-default);border-radius:var(--radius-md);background:var(--color-bg-surface);min-height:60px;box-sizing:border-box}.result-card__body{min-width:0}.result-card h3{margin:0 0 .2rem;font-size:.95rem;line-height:1.25;overflow-wrap:anywhere}.result-card__sku{margin:0;color:var(--color-text-secondary);font-size:.75rem;line-height:1.25;overflow-wrap:anywhere}.result-meta__stock{font-size:.8rem;white-space:nowrap;color:var(--color-text-secondary)}.result-card__action{display:flex;align-items:center;gap:.6rem}.result-price{margin:0;font-size:1.05rem;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}.result-add-button{min-height:44px;min-width:88px;padding:.5rem .75rem;background:#B45A2D;color:#FFFFFF;font-size:.875rem}.result-add-button:disabled{background:var(--color-bg-soft);color:var(--color-text-secondary);opacity:1;border:1px solid var(--color-border-default)}.empty-results{min-height:8rem;display:grid;place-content:center;gap:.5rem;text-align:center;color:var(--color-text-secondary);padding:1rem}.empty-results strong{color:var(--color-text-primary)}
.result-add-button:enabled{filter:none;scroll-margin-block:5px}
.result-add-button:enabled:hover{background:#BC5925}
.result-add-button:enabled:active{background:#B05725}
.result-add-button:enabled:focus-visible{outline:3px solid #FFE3B4;outline-offset:2px}
:host-context(body[data-theme="light"]) .result-add-button:enabled:focus-visible{outline-color:#17335C}
@media(max-width:1150px) and (min-width:901px){.result-card{grid-template-columns:minmax(0,1fr) auto}.result-meta__stock{grid-column:1;grid-row:2}.result-card__action{grid-column:2;grid-row:1 / span 2}.result-card{row-gap:.2rem}}
@media(max-width:520px){.result-card{grid-template-columns:minmax(0,1fr) auto;gap:.25rem .6rem;padding:.5rem}.result-card__body{grid-column:1;grid-row:1}.result-meta__stock{grid-column:1;grid-row:2}.result-card__action{grid-column:2;grid-row:1 / span 2;display:grid;justify-items:end;gap:.35rem}.result-add-button{min-width:88px}.results-grid{max-height:50dvh}}

    `],
})
export class PosSearchResultsComponent {
  @Input() loading = false;
  @Input() searched = false;
  @Input() failed = false;
  @Input({ required: true }) searchResults: PosProductResponse[] = [];

  @Output() readonly addProduct = new EventEmitter<PosProductResponse>();
}
