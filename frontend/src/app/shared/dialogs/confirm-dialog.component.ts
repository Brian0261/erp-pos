import { CommonModule } from "@angular/common";
import { Component, ElementRef, HostListener, ViewChild, inject } from "@angular/core";

import { ConfirmDialogService } from "./confirm-dialog.service";

@Component({
  selector: "app-confirm-dialog",
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="dialogService.state$ | async as state">
      <section
        class="confirm-dialog-backdrop"
        [class.confirm-dialog-backdrop--warning]="state.variant === 'warning'"
        [class.confirm-dialog-backdrop--danger]="state.variant === 'danger'"
        [class.confirm-dialog-backdrop--info]="state.variant === 'info'"
        (click)="onBackdropClick()"
      >
        <article
          #dialogPanel
          class="ui-card confirm-dialog"
          [class.confirm-dialog--warning]="state.variant === 'warning'"
          [class.confirm-dialog--danger]="state.variant === 'danger'"
          [class.confirm-dialog--info]="state.variant === 'info'"
          [attr.role]="state.variant === 'warning' || state.variant === 'danger' ? 'alertdialog' : 'dialog'"
          aria-modal="true"
          aria-labelledby="confirmDialogTitle"
          aria-describedby="confirmDialogDescription"
          (click)="$event.stopPropagation()"
        >
          <header class="confirm-dialog__header">
            <span class="ui-chip confirm-dialog__chip"
              [class.ui-chip--warning]="state.variant === 'warning'"
              [class.ui-chip--danger]="state.variant === 'danger'"
              [class.ui-chip--info]="state.variant === 'info'"
            >{{ chipLabel(state.variant) }}</span>
            <h2 id="confirmDialogTitle" class="confirm-dialog__title">{{ state.title }}</h2>
          </header>

          <strong class="confirm-dialog__highlight" *ngIf="state.highlightText">{{ state.highlightText }}</strong>

          <p id="confirmDialogDescription" class="confirm-dialog__description">{{ state.description }}</p>

          <footer class="confirm-dialog__actions">
            <button
              #cancelButton
              type="button"
              class="ui-button ui-button--secondary"
              (click)="dialogService.cancel()"
              [disabled]="state.loading"
            >
              {{ state.cancelText }}
            </button>
            <button
              type="button"
              class="ui-button"
              [class.ui-button--danger]="state.variant === 'danger' || state.variant === 'warning'"
              [class.ui-button--primary]="state.variant === 'info'"
              (click)="dialogService.confirmAction()"
              [disabled]="state.loading"
            >
              {{ state.confirmText }}
            </button>
          </footer>
        </article>
      </section>
    </ng-container>
  `,
  styles: [
    `
      .confirm-dialog-backdrop {
        position: fixed;
        inset: 0;
        z-index: 110;
        display: grid;
        place-items: center;
        padding: var(--space-4);
        background: rgba(16, 17, 20, 0.68);
        backdrop-filter: blur(4px);
      }

      .confirm-dialog {
        width: min(32rem, calc(100vw - 2rem));
        display: grid;
        gap: var(--space-4);
        padding: var(--space-5);
        border-radius: calc(var(--radius-lg) + 0.15rem);
        border-color: var(--color-border-default);
        box-shadow: 0 24px 80px rgba(16, 17, 20, 0.34);
      }

      .confirm-dialog--warning {
        border-color: color-mix(in srgb, var(--color-warning-text) 32%, var(--color-border-default));
      }

      .confirm-dialog--danger {
        border-color: color-mix(in srgb, var(--color-danger-text) 32%, var(--color-border-default));
      }

      .confirm-dialog--info {
        border-color: color-mix(in srgb, var(--color-info-text) 28%, var(--color-border-default));
      }

      .confirm-dialog__header {
        display: grid;
        gap: var(--space-2);
      }

      .confirm-dialog__chip {
        justify-self: start;
      }

      .confirm-dialog__title {
        margin: 0;
        font-family: var(--font-family-display);
        font-size: clamp(1.2rem, 1.5vw, 1.5rem);
        line-height: 1.15;
      }

      .confirm-dialog__description {
        margin: 0;
        color: var(--color-text-secondary);
        line-height: 1.5;
        white-space: pre-line;
      }

      .confirm-dialog__highlight {
        display: block;
        margin: -0.2rem 0 0;
        padding: var(--space-3);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        background: var(--color-bg-soft);
        color: var(--color-text-primary);
        font-size: var(--font-size-md);
        line-height: 1.35;
      }

      .confirm-dialog__actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        flex-wrap: wrap;
      }

      @media (max-width: 640px) {
        .confirm-dialog {
          padding: var(--space-4);
        }

        .confirm-dialog__actions {
          display: grid;
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  @ViewChild("cancelButton")
  set cancelButton(value: ElementRef<HTMLButtonElement> | undefined) {
    this.cancelButtonRef = value;
    if (value) {
      this.focusCancelButton();
    }
  }

  @ViewChild("dialogPanel") private dialogPanel?: ElementRef<HTMLElement>;

  readonly dialogService = inject(ConfirmDialogService);
  private cancelButtonRef?: ElementRef<HTMLButtonElement>;

  @HostListener("document:keydown.escape")
  onEscape(): void {
    const state = this.dialogService.currentState;
    if (!state || state.loading) {
      return;
    }

    this.dialogService.cancel();
  }

  @HostListener("document:keydown.tab", ["$event"])
  onTabKey(event: KeyboardEvent): void {
    if (!this.dialogService.currentState) {
      return;
    }

    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  onBackdropClick(): void {
    const state = this.dialogService.currentState;
    if (!state || state.loading || state.variant === "warning" || state.variant === "danger") {
      return;
    }

    this.dialogService.cancel();
  }

  chipLabel(variant: "warning" | "danger" | "info"): string {
    switch (variant) {
      case "warning":
        return "Confirmación";
      case "danger":
        return "Acción sensible";
      default:
        return "Información";
    }
  }

  private focusCancelButton(): void {
    queueMicrotask(() => {
      this.cancelButtonRef?.nativeElement.focus();
    });
  }

  private getFocusableElements(): HTMLElement[] {
    const panel = this.dialogPanel?.nativeElement;
    if (!panel) {
      return [];
    }

    return Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }
}
