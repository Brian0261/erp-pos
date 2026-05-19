import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

export type ConfirmDialogVariant = "warning" | "danger" | "info";

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  highlightText?: string;
  confirmText: string;
  cancelText: string;
  variant: ConfirmDialogVariant;
  loading?: boolean;
}

export interface ConfirmDialogState extends ConfirmDialogOptions {
  open: boolean;
}

@Injectable({ providedIn: "root" })
export class ConfirmDialogService {
  private readonly stateSubject = new BehaviorSubject<ConfirmDialogState | null>(null);
  private resolvePending: ((confirmed: boolean) => void) | null = null;
  private previousFocusTarget: HTMLElement | null = null;

  get state$(): Observable<ConfirmDialogState | null> {
    return this.stateSubject.asObservable();
  }

  get currentState(): ConfirmDialogState | null {
    return this.stateSubject.value;
  }

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    if (this.resolvePending) {
      return Promise.resolve(false);
    }

    const activeElement = document.activeElement;
    this.previousFocusTarget = activeElement instanceof HTMLElement ? activeElement : null;
    this.stateSubject.next({ ...options, loading: options.loading ?? false, open: true });

    return new Promise<boolean>((resolve) => {
      this.resolvePending = resolve;
    });
  }

  cancel(): void {
    this.close(false);
  }

  confirmAction(): void {
    this.close(true);
  }

  private close(result: boolean): void {
    if (!this.resolvePending) {
      return;
    }

    const resolve = this.resolvePending;
    this.resolvePending = null;
    this.stateSubject.next(null);
    resolve(result);

    queueMicrotask(() => {
      this.previousFocusTarget?.focus();
      this.previousFocusTarget = null;
    });
  }
}
