import { CommonModule } from "@angular/common";
import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Subject, of } from "rxjs";
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  switchMap,
  takeUntil,
  tap,
} from "rxjs/operators";

import { ProductLookupResponse } from "../../../features/catalog/data/catalog.models";
import { ProductService } from "../../../features/catalog/data/product.service";

let productAutocompleteUid = 0;

@Component({
  selector: "app-product-autocomplete",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="product-autocomplete" [class.product-autocomplete--compact]="compact">
      <label class="product-autocomplete__field">
        <span class="product-autocomplete__label">Producto</span>

        <div class="product-autocomplete__control">
          <input
            #inputEl
            type="text"
            [formControl]="queryControl"
            [placeholder]="placeholder"
            autocomplete="off"
            [disabled]="disabled"
            role="combobox"
            aria-autocomplete="list"
            [attr.aria-expanded]="panelOpen"
            [attr.aria-controls]="listboxId"
            [attr.aria-activedescendant]="activeOptionId"
            (focus)="onFocus()"
            (blur)="onBlur()"
            (keydown)="onKeydown($event)"
          />

          <button
            *ngIf="allowClear && (queryControl.value.trim() || displaySelectedProduct)"
            type="button"
            class="product-autocomplete__clear"
            (mousedown)="$event.preventDefault()"
            (click)="clear()"
            [disabled]="disabled"
          >
            Limpiar
          </button>
        </div>
      </label>

      <div class="product-autocomplete__selected" *ngIf="displaySelectedProduct">
        <div class="product-autocomplete__selected-copy">
          <span class="product-autocomplete__selected-label">Producto seleccionado</span>
          <strong>{{ displaySelectedProduct.name }}</strong>
          <span>SKU: {{ displaySelectedProduct.sku }}</span>
          <span *ngIf="displaySelectedProduct.barcode">Código: {{ displaySelectedProduct.barcode }}</span>
        </div>

        <button
          *ngIf="allowClear"
          type="button"
          class="product-autocomplete__selected-clear ui-button ui-button--secondary"
          (click)="clear()"
          [disabled]="disabled"
        >
          Limpiar selección
        </button>
      </div>

      <div
        class="product-autocomplete__panel"
        *ngIf="panelOpen"
        [id]="listboxId"
        role="listbox"
      >
        <p class="product-autocomplete__state" *ngIf="loading">Buscando...</p>

        <p class="product-autocomplete__state product-autocomplete__state--error" *ngIf="!loading && errorMessage">
          {{ errorMessage }}
        </p>

        <p class="product-autocomplete__state" *ngIf="!loading && !errorMessage && queryControl.value.trim().length >= minChars && results.length === 0">
          Sin resultados.
        </p>

        <button
          #optionEl
          type="button"
          class="product-autocomplete__option"
          *ngFor="let product of results; let i = index"
          role="option"
          [attr.id]="optionId(i)"
          [attr.aria-selected]="i === activeIndex"
          [class.product-autocomplete__option--active]="i === activeIndex"
          (mouseenter)="setActiveIndex(i)"
          (mousedown)="selectProduct(product, $event)"
        >
          <strong>{{ product.name }}</strong>
          <span>{{ productSubtitle(product) }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .product-autocomplete {
        position: relative;
        display: grid;
        gap: var(--space-2);
        min-width: 0;
      }

      .product-autocomplete--compact {
        gap: var(--space-1);
      }

      .product-autocomplete__field {
        display: grid;
        gap: var(--space-1);
        align-content: start;
        min-width: 0;
      }

      .product-autocomplete__label {
        font-size: var(--font-size-sm);
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      .product-autocomplete__control {
        display: flex;
        gap: var(--space-2);
        min-width: 0;
      }

      .product-autocomplete input {
        flex: 1 1 auto;
        min-width: 0;
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
        box-sizing: border-box;
      }

      .product-autocomplete__clear {
        flex: 0 0 auto;
      }

      .product-autocomplete__panel {
        position: absolute;
        top: calc(100% + 0.35rem);
        left: 0;
        right: 0;
        z-index: 20;
        max-height: 18rem;
        overflow: auto;
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
        box-shadow: var(--shadow-md);
      }

      .product-autocomplete__state,
      .product-autocomplete__option {
        padding: var(--space-2) var(--space-3);
      }

      .product-autocomplete__state {
        margin: 0;
        color: var(--color-text-secondary);
      }

      .product-autocomplete__state--error {
        color: var(--color-danger);
      }

      .product-autocomplete__option {
        width: 100%;
        display: grid;
        gap: 0.15rem;
        border: 0;
        border-bottom: 1px solid var(--color-border-default);
        background: transparent;
        text-align: left;
        cursor: pointer;
      }

      .product-autocomplete__option:last-child {
        border-bottom: 0;
      }

      .product-autocomplete__option:hover,
      .product-autocomplete__option--active {
        background: color-mix(in srgb, var(--color-brand-primary) 9%, var(--color-bg-surface));
        box-shadow: inset 3px 0 0 var(--color-brand-primary);
      }

      .product-autocomplete__option strong {
        color: var(--color-text-primary);
      }

      .product-autocomplete__option span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-xs);
      }

      .product-autocomplete__selected {
        display: grid;
        gap: var(--space-2);
        padding: var(--space-3);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-surface);
      }

      .product-autocomplete__selected-copy {
        display: grid;
        gap: 0.15rem;
      }

      .product-autocomplete__selected-label {
        color: var(--color-brand-primary);
        font-size: var(--font-size-xs);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .product-autocomplete__selected strong {
        color: var(--color-text-primary);
      }

      .product-autocomplete__selected span {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }

      .product-autocomplete__selected-clear {
        justify-self: start;
      }

      @media (max-width: 1000px) {
        .product-autocomplete__control {
          flex-direction: column;
        }

        .product-autocomplete__clear,
        .product-autocomplete__selected-clear {
          width: 100%;
        }
      }
    `,
  ],
})
export class ProductAutocompleteComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly uid = ++productAutocompleteUid;
  private internalSelectedProduct: ProductLookupResponse | null = null;
  private scrollFrame = 0;
  private lastEmittedQuery = "";

  readonly queryControl = new FormControl("", { nonNullable: true });

  @Input() placeholder = "Buscar producto por nombre, SKU o codigo de barras";
  @Input() minChars = 2;
  @Input() limit = 10;
  @Input() activeOnly = true;
  @Input() disabled = false;
  @Input() compact = false;
  @Input() allowClear = true;
  @Input() selectedProduct: ProductLookupResponse | null = null;

  @Output() productSelected = new EventEmitter<ProductLookupResponse>();
  @Output() cleared = new EventEmitter<void>();
  @Output() queryChange = new EventEmitter<string>();
  @Output() focused = new EventEmitter<void>();
  @Output() blurred = new EventEmitter<void>();

  results: ProductLookupResponse[] = [];
  loading = false;
  errorMessage = "";
  panelOpen = false;
  activeIndex = -1;

  constructor(private readonly productService: ProductService) {}

  @HostBinding("class.product-autocomplete-host")
  readonly hostClass = true;

  get displaySelectedProduct(): ProductLookupResponse | null {
    return this.selectedProduct ?? this.internalSelectedProduct;
  }

  get listboxId(): string {
    return `product-autocomplete-listbox-${this.uid}`;
  }

  get activeOptionId(): string | null {
    return this.activeIndex >= 0 ? this.optionId(this.activeIndex) : null;
  }

  ngOnInit(): void {
    this.syncDisabledState();
    this.watchQuery();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.scrollFrame) {
      cancelAnimationFrame(this.scrollFrame);
    }
  }

  clear(): void {
    this.internalSelectedProduct = null;
    this.queryControl.setValue("", { emitEvent: false });
    this.results = [];
    this.errorMessage = "";
    this.loading = false;
    this.panelOpen = false;
    this.activeIndex = -1;
    this.lastEmittedQuery = "";
    this.cleared.emit();
    this.queryChange.emit("");
  }

  focusInput(): void {
    const input = this.findInput();
    input?.focus();
  }

  onFocus(): void {
    this.focused.emit();
    this.openPanelIfPossible();
  }

  onBlur(): void {
    this.panelOpen = false;
    this.blurred.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.moveActiveIndex(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        this.moveActiveIndex(-1);
        break;
      case "Enter":
        if (this.panelOpen && this.results.length > 0) {
          event.preventDefault();
          const index = this.activeIndex >= 0 ? this.activeIndex : 0;
          this.selectProduct(this.results[index], event);
        }
        break;
      case "Escape":
        event.preventDefault();
        this.panelOpen = false;
        this.activeIndex = -1;
        break;
    }
  }

  setActiveIndex(index: number): void {
    if (index < 0 || index >= this.results.length) {
      return;
    }

    this.activeIndex = index;
    this.scrollActiveOptionIntoView();
  }

  selectProduct(product: ProductLookupResponse, event?: Event): void {
    event?.preventDefault();
    this.internalSelectedProduct = product;
    this.queryControl.setValue(this.getProductLabel(product), { emitEvent: false });
    this.results = [];
    this.errorMessage = "";
    this.loading = false;
    this.panelOpen = false;
    this.activeIndex = -1;
    this.productSelected.emit(product);
    this.queryChange.emit(this.queryControl.value.trim());
  }

  productSubtitle(product: ProductLookupResponse): string {
    return `SKU: ${product.sku}${product.barcode ? ` · Código: ${product.barcode}` : ""}`;
  }

  optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }

  private watchQuery(): void {
    this.queryControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(250),
        map((value) => this.normalizeQuery(value)),
        distinctUntilChanged(),
        tap((query) => {
          this.queryChange.emit(query);
          this.handleSelectionMismatch(query);
        }),
        switchMap((query) => {
          if (query.length < this.minChars) {
            this.results = [];
            this.errorMessage = "";
            this.loading = false;
            this.panelOpen = false;
            this.activeIndex = -1;
            return of({ query, results: [] as ProductLookupResponse[] });
          }

          this.loading = true;
          this.errorMessage = "";
          this.panelOpen = true;

          return this.productService.lookup(query, this.activeOnly, this.limit).pipe(
            map((results) => ({ query, results })),
            catchError(() => {
              this.errorMessage = "No se pudieron cargar sugerencias de producto.";
              return of({ query, results: [] as ProductLookupResponse[] });
            }),
            finalize(() => {
              this.loading = false;
            }),
          );
        }),
      )
      .subscribe(({ query, results }) => {
        if (query.length >= this.minChars) {
          this.results = results;
          this.panelOpen = true;
          this.activeIndex = results.length > 0 ? 0 : -1;
          this.scrollActiveOptionIntoView();
        }
      });
  }

  private handleSelectionMismatch(query: string): void {
    const label = this.displaySelectedProduct ? this.getProductLabel(this.displaySelectedProduct) : "";
    if (this.displaySelectedProduct && query !== label) {
      this.internalSelectedProduct = null;
      this.cleared.emit();
    }
  }

  private moveActiveIndex(delta: number): void {
    if (!this.panelOpen) {
      this.openPanelIfPossible();
    }

    if (this.results.length === 0) {
      return;
    }

    const nextIndex = this.activeIndex < 0 ? 0 : Math.max(0, Math.min(this.results.length - 1, this.activeIndex + delta));
    this.activeIndex = nextIndex;
    this.scrollActiveOptionIntoView();
  }

  private openPanelIfPossible(): void {
    const query = this.normalizeQuery(this.queryControl.value);
    if (query.length >= this.minChars && !this.disabled) {
      this.panelOpen = true;
    }
  }

  private scrollActiveOptionIntoView(): void {
    if (this.scrollFrame) {
      cancelAnimationFrame(this.scrollFrame);
    }

    this.scrollFrame = requestAnimationFrame(() => {
      const element = document.getElementById(this.activeOptionId ?? "");
      element?.scrollIntoView({ block: "nearest" });
    });
  }

  private getProductLabel(product: ProductLookupResponse): string {
    return `${product.name} (SKU: ${product.sku})`;
  }

  private normalizeQuery(value: string): string {
    return (value ?? "").replace(/\s+/g, " ").trim();
  }

  private syncDisabledState(): void {
    if (this.disabled) {
      this.queryControl.disable({ emitEvent: false });
      this.panelOpen = false;
      this.activeIndex = -1;
      return;
    }

    this.queryControl.enable({ emitEvent: false });
  }

  private findInput(): HTMLInputElement | null {
    return document.querySelector<HTMLInputElement>(`#${this.listboxId}`)?.closest(".product-autocomplete")?.querySelector("input") ?? null;
  }
}
