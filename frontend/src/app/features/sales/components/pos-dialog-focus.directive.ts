import { AfterViewInit, Directive, ElementRef, EventEmitter, HostListener, OnDestroy, Output } from "@angular/core";
import { ConfirmDialogService } from "../../../shared/dialogs/confirm-dialog.service";

/** Local modal lifecycle for POS overlays; checkout retains its own financial-confirmation lifecycle. */
@Directive({ selector: "[appPosDialogFocus]" })
export class PosDialogFocusDirective implements AfterViewInit, OnDestroy {
  private static readonly stack: PosDialogFocusDirective[] = [];
  @Output() posDialogClose = new EventEmitter<void>();
  private previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  private background = new Map<HTMLElement, boolean>();
  private alive = true;
  constructor(private readonly host: ElementRef<HTMLElement>, private readonly confirmations: ConfirmDialogService) {}
  ngAfterViewInit(): void {
    PosDialogFocusDirective.stack.push(this);
    let branch = this.host.nativeElement;
    const shell = branch.closest(".layout-shell");
    while (branch.parentElement) {
      const parent = branch.parentElement;
      for (const sibling of Array.from(parent.children)) {
        if (sibling instanceof HTMLElement && sibling !== branch && !sibling.matches("app-confirm-dialog,script,style")) {
          this.background.set(sibling, sibling.inert); sibling.inert = true;
        }
      }
      if (parent === shell || parent === document.body) break;
      branch = parent;
    }
    queueMicrotask(() => { if (this.alive) this.controls()[0]?.focus(); });
  }
  private controls(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]'))
      .filter(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden");
  }
  @HostListener("document:keydown", ["$event"])
  keydown(event: KeyboardEvent): void {
    if (!this.topmost || this.confirmations.currentState) return;
    if (event.key === "Escape") { event.preventDefault(); this.posDialogClose.emit(); return; }
    if (event.key !== "Tab") return;
    const controls = this.controls(), first = controls[0], last = controls[controls.length - 1];
    if (!first || !last) { event.preventDefault(); return; }
    if (!controls.includes(document.activeElement as HTMLElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    }
  }
  @HostListener("document:focusin", ["$event"])
  focusin(event: FocusEvent): void {
    if (this.topmost && !this.confirmations.currentState && event.target instanceof Node && !this.host.nativeElement.contains(event.target)) this.controls()[0]?.focus();
  }
  private get topmost(): boolean { return this.alive && PosDialogFocusDirective.stack.at(-1) === this; }
  ngOnDestroy(): void {
    this.alive = false;
    const index = PosDialogFocusDirective.stack.indexOf(this);
    if (index >= 0) PosDialogFocusDirective.stack.splice(index, 1);
    for (const [el, inert] of this.background) el.inert = inert;
    this.background.clear();
    const previous = this.previous;
    queueMicrotask(() => { if (previous?.isConnected && !previous.closest("[inert]") && !previous.matches(":disabled")) previous.focus(); });
  }
}
