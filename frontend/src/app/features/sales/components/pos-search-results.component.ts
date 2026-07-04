import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { PosProductResponse } from "../data/sales.models";

@Component({
  selector: "app-pos-search-results",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="results-panel">
      <header class="panel-head">
        <div>
          <h2>Resultados de búsqueda</h2>
        </div>
        <span class="results-count">{{ searchResults.length }} resultados</span>
      </header>

      <p class="result-hint" *ngIf="searchResults.length > 1">
        Hay varias coincidencias. Revisa nombre, código, precio y stock antes de
        tocar Agregar.
      </p>

      <div class="empty-results" *ngIf="searchResults.length === 0">
        <strong>Sin resultados activos</strong>
        <span>Busca por nombre para elegir el producto antes de agregar.</span>
      </div>

      <div class="results-grid" *ngIf="searchResults.length > 0">
        <article class="result-card" *ngFor="let result of searchResults">
          <div class="result-card__body">
            <div class="result-card__meta-row">
              <p class="result-card__sku">{{ result.sku }}</p>
              <span class="result-card__meta-separator" aria-hidden="true">·</span>
              <div class="result-meta">
                 <span *ngIf="result.barcode" class="result-meta__code">
                   Cod. {{ result.barcode }}
                 </span>
                 <span
                   *ngIf="!result.barcode"
                   class="barcode-badge barcode-badge--missing"
                 >
                   Cod. no disponible
                 </span>
                <span class="result-meta__stock">
                  <span class="result-meta__label">Stock</span>
                  <span class="result-meta__value">{{
                    result.stockAvailable | number: "1.0-3"
                  }}</span>
                </span>
              </div>
            </div>
            <h3>{{ result.name }}</h3>
          </div>
          <div class="result-card__action">
            <p class="result-price">
              S/ {{ result.salePrice | number: "1.2-2" }}
            </p>
            <button
              type="button"
              class="ui-button ui-button--primary pos-button pos-button--add result-add-button"
              (click)="addProduct.emit(result)"
            >
              Agregar
            </button>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: grid;
        min-height: 0;
        min-width: 0;
      }

      .results-panel {
        grid-template-rows: auto minmax(0, 1fr);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        padding: var(--space-2);
        display: grid;
        gap: var(--space-2);
        min-height: 0;
        overflow: hidden;
      }

      .panel-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      .panel-head h2 {
        font-size: 1.05rem;
        line-height: 1.1;
      }

      .results-count {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        font-weight: 600;
      }

      .results-panel .result-hint {
        display: none;
      }

      .result-hint {
        margin: 0;
        color: var(--color-text-secondary);
        font-weight: 600;
        font-size: var(--font-size-xs);
      }

      .results-grid {
        grid-row: 2;
        display: grid;
        grid-template-columns: 1fr;
        align-content: start;
        gap: 0.25rem;
        min-height: 0;
        overflow: auto;
        padding-right: var(--space-1);
      }

      .empty-results {
        grid-row: 2;
        display: grid;
        place-items: center;
        gap: 0.28rem;
        align-content: center;
        min-height: 0;
        border: 1px dashed var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-soft);
        color: var(--color-text-secondary);
        text-align: center;
        padding: 0.95rem var(--space-4);
      }

      .empty-results strong {
        line-height: 1.15;
      }

      .empty-results strong,
      .empty-results span {
        max-width: 32rem;
      }

      .empty-results span {
        line-height: 1.35;
        white-space: nowrap;
      }

      .result-card {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(198px, auto);
        gap: 0.75rem;
        align-items: center;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
        padding: 0.6rem 0.7rem;
      }

      .result-card__body,
      .result-card__action {
        display: grid;
        gap: 0.2rem;
      }

      .result-card__body {
        min-width: 0;
      }

      .result-card__meta-row {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 0.38rem;
        min-width: 0;
        flex-wrap: wrap;
        opacity: 0.88;
      }

      .result-card h3 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        font-size: 1.02rem;
        font-weight: 700;
        line-height: 1.18;
        color: var(--color-text-primary);
      }

      .result-card__action {
        grid-template-columns: minmax(84px, auto) minmax(8rem, 1fr);
        align-items: center;
        align-content: center;
        gap: 0.5rem;
      }

      .result-add-button {
        width: 100%;
        min-width: 7.5rem;
        justify-self: stretch;
      }

      .result-card__sku {
        margin: 0;
        width: fit-content;
        border-radius: 0;
        background: transparent;
        color: var(--color-text-secondary);
        padding: 0;
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.03em;
      }

      .result-meta {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        gap: 0.4rem;
        min-width: 0;
        margin: 0;
      }

      .result-card__meta-separator {
        color: var(--color-text-secondary);
        font-weight: 700;
        font-size: 0.62rem;
        line-height: 1;
      }

      .result-meta__code,
      .result-meta__stock {
        display: inline-flex;
        align-items: center;
        gap: 0.22rem;
        border-radius: 0;
        background: transparent;
        padding: 0;
        white-space: nowrap;
        color: var(--color-text-secondary);
        font-size: 0.68rem;
        font-weight: 600;
      }

      .result-meta__label {
        color: var(--color-text-secondary);
        font-size: 0.62rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .result-meta__value {
        margin: 0;
        font-weight: 600;
      }

      .barcode-badge {
        display: inline-flex;
        width: fit-content;
        border-radius: 0;
        background: transparent;
        color: var(--color-text-secondary);
        padding: 0;
        font-size: 0.68rem;
        font-weight: 600;
      }

      .barcode-badge--missing {
        color: var(--color-text-secondary);
      }

      .result-price {
        margin: 0;
        color: var(--color-brand-primary);
        font-size: clamp(0.98rem, 1.35vw, 1.18rem);
        font-weight: 800;
        text-align: right;
        line-height: 1;
      }

      .pos-button {
        min-height: 2.55rem;
        border-radius: var(--radius-md);
        padding: 0.58rem var(--space-4);
        font-size: var(--font-size-md);
      }

      .pos-button--add {
        width: 100%;
        min-height: 2.65rem;
        background: var(--color-brand-accent);
        font-size: var(--font-size-md);
      }

      :host-context(body[data-theme="dark"]) .result-card {
        border-color: rgba(148, 163, 184, 0.22);
      }

      .results-grid::-webkit-scrollbar {
        width: 8px;
      }

      .results-grid::-webkit-scrollbar-track {
        background: var(--color-bg-soft);
        border-radius: var(--radius-pill);
      }

      .results-grid::-webkit-scrollbar-thumb {
        background: linear-gradient(
          180deg,
          var(--color-brand-highlight),
          var(--color-brand-accent)
        );
        border-radius: var(--radius-pill);
      }

      @media (max-width: 980px) {
        .results-grid {
          max-height: 18rem;
        }

        .empty-results span {
          white-space: normal;
        }

        .empty-results strong,
        .empty-results span {
          max-width: 18rem;
        }
      }

      @media (max-width: 760px) {
        .result-card {
          grid-template-columns: 1fr;
        }

        .result-price {
          text-align: left;
        }
      }
    `,
  ],
})
export class PosSearchResultsComponent {
  @Input({ required: true }) searchResults: PosProductResponse[] = [];

  @Output() readonly addProduct = new EventEmitter<PosProductResponse>();
}
