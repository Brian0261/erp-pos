import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormGroup, ReactiveFormsModule } from "@angular/forms";

import { WarehouseResponse } from "../../inventory/data/inventory.models";

@Component({
  selector: "app-pos-search-panel",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="saleForm" class="pos-command" (ngSubmit)="search.emit()">
      <label class="field field--warehouse">
        <span>Almacen de salida *</span>
        <select formControlName="warehouseId" [title]="selectedWarehouseLabel">
          <option [ngValue]="null">Selecciona almacen</option>
          <option
            *ngFor="let warehouse of warehouses"
            [ngValue]="warehouse.id"
            [title]="warehouse.code + ' - ' + warehouse.name"
          >
            {{ getWarehouseDisplayLabel(warehouse) }}
          </option>
        </select>
      </label>

      <section class="scan-card" aria-label="Busqueda unificada POS">
        <label class="scan-field">
          <span class="scan-label">Buscar o escanear producto</span>
          <div class="scan-input-wrap">
            <input
              #searchInput
              class="scan-input"
              type="text"
              formControlName="code"
              placeholder="Escanea barcode/SKU o busca producto..."
              autocomplete="off"
              (keydown.escape)="handleEscape($event, searchInput)"
            />
            <button
              *ngIf="showClearSearch"
              type="button"
              class="scan-clear-button"
              aria-label="Limpiar búsqueda"
              title="Limpiar búsqueda"
              (click)="clearSearch.emit(searchInput)"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </label>

        <div class="scan-actions">
          <button
            type="button"
            class="ui-button ui-button--primary pos-button pos-button--scan"
            (click)="exactLookup.emit()"
            [disabled]="loadingLookup"
          >
            {{ loadingLookup ? "Agregando..." : "Agregar codigo" }}
          </button>
          <button
            type="button"
            class="ui-button ui-button--secondary pos-button pos-button--quiet"
            (click)="search.emit()"
            [disabled]="loadingSearch"
          >
            {{ loadingSearch ? "Buscando..." : "Buscar" }}
          </button>
        </div>
      </section>

      <section
        class="quick-search"
        aria-label="Busquedas rapidas para productos sin barcode"
      >
        <span>BÚSQUEDAS RÁPIDAS</span>
        <div class="quick-search__buttons">
          <button
            type="button"
            class="ui-button quick-search__button"
            *ngFor="let term of quickSearchTerms"
            (click)="quickSearch.emit(term)"
            [disabled]="loadingSearch"
          >
            {{ term }}
          </button>
        </div>
      </section>
    </form>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .pos-command {
        display: grid;
        grid-template-columns: minmax(240px, 0.34fr) minmax(0, 1fr);
        gap: var(--space-2);
        padding: var(--space-2);
        align-items: end;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        background: var(--color-bg-surface);
      }

      .field,
      .scan-field {
        display: grid;
        gap: var(--space-1);
      }

      .field > span,
      .scan-label {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      .field--warehouse {
        grid-column: 1;
        grid-row: 2;
        max-width: none;
      }

      .field--warehouse select {
        min-width: 0;
      }

      input,
      select {
        width: 100%;
        min-height: 2.55rem;
        padding: 0.58rem 0.72rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border-default);
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
      }

      .scan-card {
        grid-column: 1 / -1;
        grid-row: 1;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        gap: var(--space-2);
        border-radius: calc(var(--radius-lg) + 0.2rem);
        border: 1px solid rgba(18, 23, 184, 0.22);
        background:
          linear-gradient(
            135deg,
            rgba(18, 23, 184, 0.08),
            rgba(34, 197, 246, 0.04)
          ),
          var(--color-bg-soft);
        padding: 0.75rem;
      }

      .scan-label {
        color: var(--color-text-primary);
      }

      .scan-input {
        min-height: 3rem;
        border-width: 1px;
        border-color: rgba(18, 23, 184, 0.24);
        border-radius: var(--radius-lg);
        font-size: clamp(1rem, 1.35vw, 1.2rem);
        font-weight: 700;
        letter-spacing: 0.01em;
      }

      .scan-input-wrap {
        position: relative;
      }

      .scan-input-wrap .scan-input {
        padding-right: 2.85rem;
      }

      .scan-clear-button {
        position: absolute;
        top: 50%;
        right: 0.55rem;
        transform: translateY(-50%);
        width: 1.8rem;
        height: 1.8rem;
        border: 1px solid var(--color-border-default);
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-bg-surface) 88%, transparent);
        color: var(--color-text-secondary);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        cursor: pointer;
      }

      .scan-clear-button:hover,
      .scan-clear-button:focus-visible {
        background: var(--color-bg-soft);
        color: var(--color-text-primary);
      }

      .scan-clear-button span {
        font-size: 1rem;
        line-height: 1;
      }

      .scan-actions {
        display: grid;
        grid-template-columns: repeat(2, max-content);
        gap: var(--space-2);
        justify-content: start;
      }

      .quick-search {
        grid-column: 2;
        grid-row: 2;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--space-2);
        align-items: center;
        min-width: 0;
      }

      .quick-search > span {
        display: block;
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .quick-search__buttons {
        display: flex;
        gap: var(--space-1);
        overflow-x: auto;
        padding-bottom: 0.05rem;
      }

      .quick-search__button {
        min-height: 2.2rem;
        flex: 0 0 auto;
        border: 1px solid var(--color-border-default);
        background: color-mix(in srgb, var(--color-bg-soft) 78%, var(--color-bg-surface));
        color: var(--color-text-primary);
        padding: 0.35rem 0.7rem;
        font-size: var(--font-size-sm);
        font-weight: 600;
        white-space: nowrap;
      }

      .pos-button {
        min-height: 2.55rem;
        border-radius: var(--radius-md);
        padding: 0.58rem var(--space-4);
        font-size: var(--font-size-md);
      }

      .pos-button--scan {
        min-height: 3rem;
        background: var(--color-brand-accent);
        font-size: var(--font-size-md);
        letter-spacing: 0.01em;
      }

      .pos-button--quiet {
        background: color-mix(in srgb, var(--color-text-primary) 16%, var(--color-bg-soft));
        color: var(--color-text-primary);
      }

      .ui-button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      :host-context(body[data-theme="dark"]) .scan-card {
        border-color: rgba(96, 165, 250, 0.46);
        background:
          linear-gradient(
            135deg,
            rgba(18, 23, 184, 0.34),
            rgba(56, 189, 248, 0.16)
          ),
          var(--color-bg-soft);
      }

      @media (max-height: 820px) and (min-width: 981px) {
        .quick-search > span {
          display: block;
        }

        .quick-search {
          grid-template-columns: 1fr;
        }

        .quick-search__button {
          min-height: 2rem;
          padding: 0.24rem 0.56rem;
          font-size: var(--font-size-xs);
        }

        .scan-input {
          min-height: 2.85rem;
        }
      }

      @media (max-width: 760px) {
        .pos-command,
        .scan-card,
        .scan-actions,
        .quick-search {
          grid-template-columns: 1fr;
        }

        .scan-card,
        .field--warehouse,
        .quick-search {
          grid-column: 1;
          grid-row: auto;
        }

        .pos-button {
          width: 100%;
        }
      }
    `,
  ],
})
export class PosSearchPanelComponent {
  @Input({ required: true }) saleForm!: FormGroup;
  @Input({ required: true }) warehouses: WarehouseResponse[] = [];
  @Input({ required: true }) selectedWarehouseLabel = "Selecciona almacen";
  @Input({ required: true }) quickSearchTerms: string[] = [];
  @Input({ required: true }) loadingLookup = false;
  @Input({ required: true }) loadingSearch = false;
  @Input({ required: true }) showClearSearch = false;

  @Output() readonly search = new EventEmitter<void>();
  @Output() readonly exactLookup = new EventEmitter<void>();
  @Output() readonly quickSearch = new EventEmitter<string>();
  @Output() readonly clearSearch = new EventEmitter<HTMLInputElement>();

  handleEscape(event: Event, input: HTMLInputElement): void {
    event.preventDefault();
    event.stopPropagation();
    this.clearSearch.emit(input);
  }

  getWarehouseDisplayLabel(warehouse: WarehouseResponse): string {
    return warehouse.name?.trim() || warehouse.code?.trim() || "Selecciona almacen";
  }
}
