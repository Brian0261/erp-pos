import { CommonModule } from "@angular/common";
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { FormGroup, ReactiveFormsModule } from "@angular/forms";

import { WarehouseResponse } from "../../inventory/data/inventory.models";

@Component({
    selector: "app-pos-search-panel",
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <form [formGroup]="saleForm" class="pos-command" (ngSubmit)="search.emit()">
      <section class="scan-card" aria-label="Búsqueda unificada POS">
        <label class="scan-field">
          <span class="scan-label">Buscar producto por nombre, SKU o código</span>
          <div class="scan-input-wrap">
            <input
              #searchInput
              aria-label="Buscar producto por nombre, SKU o código"
              class="scan-input"
              type="text"
              formControlName="code"
              placeholder="Nombre, SKU o código de barras"
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
            class="ui-button ui-button--secondary pos-button pos-button--scan"
            (click)="exactLookup.emit()"
            [disabled]="loadingLookup"
          >
            {{ loadingLookup ? "Agregando..." : "Agregar por código" }}
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
        aria-label="Búsquedas rápidas para productos sin barcode"
      >
        <span>Búsquedas rápidas</span>
        <div class="quick-search__buttons">
          <button
            type="button"
            class="ui-button quick-search__button"
            *ngFor="let term of quickSearchTerms.slice(0, 3)"
            (click)="chooseQuickSearch(term)"
            [disabled]="loadingSearch"
          >
            {{ term }}
          </button>
        </div>
        <details #moreSearches class="more-searches" *ngIf="quickSearchTerms.length > 3" (keydown.escape)="closeMore($event, moreSearches)">
          <summary aria-label="Más búsquedas"><span class="more-full">Más búsquedas</span><span class="more-short" aria-hidden="true">Más</span></summary>
          <div class="more-searches-list">
            <button type="button" class="ui-button quick-search__button" *ngFor="let term of quickSearchTerms.slice(3)" [disabled]="loadingSearch" (click)="chooseQuickSearch(term, moreSearches)">{{ term }}</button>
          </div>
        </details>
      </section>
    </form>
  `,
    styles: [`
:host{display:block;min-width:0}.pos-command{display:grid;gap:.65rem;border:1px solid var(--color-border-default);border-radius:var(--radius-lg);padding:.75rem;background:var(--color-bg-surface)}
.scan-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:.55rem}.scan-field{display:grid;gap:.45rem;min-width:0}.scan-label{font-size:.875rem;font-weight:600}.scan-input-wrap{position:relative;min-width:0}.scan-input{width:100%;min-width:0;min-height:44px;border:1px solid var(--color-border-strong,var(--color-border-default));border-radius:var(--radius-md);background:var(--color-bg-canvas);color:var(--color-text-primary);padding:.6rem 3rem .6rem .75rem;font-size:1rem;box-sizing:border-box;scroll-margin-block:5rem}
.scan-clear-button{position:absolute;right:0;top:0;width:44px;height:44px;background:transparent;border:0;color:var(--color-text-secondary);border-radius:var(--radius-md);font-size:1.2rem;cursor:pointer}.scan-actions{display:flex;gap:.4rem}.scan-actions .ui-button{min-height:44px;padding:.55rem .65rem;font-size:.875rem;white-space:nowrap}.pos-button--scan{background:transparent;color:var(--color-text-primary);border:1px solid var(--color-border-strong,var(--color-border-default));box-shadow:none}
.quick-search{position:relative;display:flex;gap:.45rem;align-items:center;flex-wrap:wrap}.quick-search>span{font-size:.8rem;color:var(--color-text-secondary)}.quick-search__buttons{display:contents}.quick-search__button,summary{min-height:44px;padding:.5rem .65rem;font-size:.8rem;border:1px solid var(--color-border-default);border-radius:var(--radius-md);background:var(--color-bg-soft);color:var(--color-text-primary);cursor:pointer}.more-searches{position:static}summary{display:flex;align-items:center;gap:.45rem;list-style:none}summary::-webkit-details-marker{display:none}summary:after{content:'⌄'}details[open] summary:after{content:'⌃'}.more-searches-list{position:absolute;inset-block-start:calc(100% + .4rem);right:0;z-index:4;width:240px;max-width:calc(100vw - 3rem);padding:.6rem;display:grid;grid-template-columns:1fr 1fr;gap:.4rem;background:var(--color-bg-surface);border:1px solid var(--color-border-default);border-radius:var(--radius-md);box-shadow:var(--shadow-md)}
@media(max-width:1150px) and (min-width:901px){.scan-card{grid-template-columns:1fr}.scan-actions{justify-content:flex-end}}
@media(max-width:520px){.scan-card{grid-template-columns:1fr}.scan-actions>*{flex:1}.scan-label{font-size:.875rem}.quick-search{gap:.3rem}.quick-search>span{flex-basis:100%}.quick-search__button,summary{padding:.4rem .5rem}}

 .more-short{display:none}
@media(max-width:520px){.quick-search>span{display:none}.quick-search__button,summary{padding:.4rem .35rem}.more-full{display:none}.more-short{display:inline}}
@media(max-width:360px){.pos-command{padding:.5rem}.quick-search{gap:.2rem}.quick-search__button,summary{padding-inline:.25rem;min-width:44px}summary{justify-content:center}summary:after{display:none}}
    `],
})
export class PosSearchPanelComponent {
  @ViewChild("searchInput") private searchInput?: ElementRef<HTMLInputElement>;
  focusSearch(): void { this.searchInput?.nativeElement.focus(); this.searchInput?.nativeElement.scrollIntoView({block:"center",behavior:"auto"}); }
  @Input({ required: true }) saleForm!: FormGroup;
  @Input({ required: true }) warehouses: WarehouseResponse[] = [];
  @Input({ required: true }) selectedWarehouseLabel = "Selecciona almacén";
  @Input({ required: true }) quickSearchTerms: string[] = [];
  @Input({ required: true }) loadingLookup = false;
  @Input({ required: true }) loadingSearch = false;
  @Input({ required: true }) showClearSearch = false;

  @Output() readonly search = new EventEmitter<void>();
  @Output() readonly exactLookup = new EventEmitter<void>();
  @Output() readonly quickSearch = new EventEmitter<string>();
  @Output() readonly clearSearch = new EventEmitter<HTMLInputElement>();

  chooseQuickSearch(term: string, details?: HTMLDetailsElement): void {
    if (details) details.open = false;
    this.quickSearch.emit(term); this.focusSearch();
  }
  closeMore(event: Event, details: HTMLDetailsElement): void {
    event.preventDefault(); event.stopPropagation(); details.open = false;
    details.querySelector("summary")?.focus();
  }
  handleEscape(event: Event, input: HTMLInputElement): void {
    event.preventDefault();
    event.stopPropagation();
    this.clearSearch.emit(input);
  }

  getWarehouseDisplayLabel(warehouse: WarehouseResponse): string {
    return warehouse.name?.trim() || warehouse.code?.trim() || "Selecciona almacén";
  }
}
