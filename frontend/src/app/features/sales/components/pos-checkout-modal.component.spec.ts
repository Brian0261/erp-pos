import { ElementRef, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog.component';
import { ConfirmDialogService } from '../../../shared/dialogs/confirm-dialog.service';
import { PosCheckoutModalComponent } from './pos-checkout-modal.component';

describe('POS checkout modal presentation and focus isolation', () => {
  let fixture: ComponentFixture<PosCheckoutModalComponent>;
  let shell: HTMLElement, sidebar: HTMLButtonElement, trigger: HTMLButtonElement, confirmations: HTMLElement;
  let utility: HTMLElement, posShell: HTMLElement, recovery: HTMLButtonElement;
  let previousOverflow: string;
  const open = async () => {
    trigger.focus(); fixture.componentRef.setInput('isOpen', true); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
  };
  const panel = () => fixture.nativeElement.querySelector('.checkout-modal') as HTMLElement;
  const controls = () => panel().querySelectorAll<HTMLButtonElement>('button');
  const close = async () => {
    fixture.componentRef.setInput('isOpen', false); fixture.detectChanges(); await fixture.whenStable();
  };
  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [PosCheckoutModalComponent, ConfirmDialogComponent],
      providers: [provideZoneChangeDetection()]}).compileComponents();
    fixture = TestBed.createComponent(PosCheckoutModalComponent);
    previousOverflow = document.body.style.overflow;
    shell = document.createElement('div'); shell.className = 'layout-shell';
    sidebar = document.createElement('button'); sidebar.textContent = 'Synthetic sidebar';
    trigger = document.createElement('button'); trigger.textContent = 'Synthetic checkout launcher';
    confirmations = document.createElement('app-confirm-dialog');
    const workspace = document.createElement('section'); workspace.className = 'workspace';
    const page = document.createElement('section'); page.className = 'ui-card pos-page';
    utility = document.createElement('div'); utility.className = 'pos-utility-header';
    recovery = document.createElement('button'); recovery.textContent = 'Recuperar operaciones';
    posShell = document.createElement('div'); posShell.className = 'pos-shell';
    utility.append(recovery); page.append(utility, posShell, trigger, fixture.nativeElement);
    workspace.append(page); shell.append(sidebar, workspace, confirmations); document.body.append(shell);
  });
  afterEach(() => {
    TestBed.inject(ConfirmDialogService).cancel();
    if (!fixture.componentRef.hostView.destroyed) fixture.destroy();
    shell.remove(); document.body.style.overflow = previousOverflow;
  });

  it('elevates the ancestor context, isolates background and focuses the visible close action', async () => {
    await open();
    expect(shell.classList.contains('has-checkout-modal')).toBeTrue();
    expect(sidebar.inert).toBeTrue(); expect(trigger.inert).toBeTrue(); expect(confirmations.inert).toBeFalse();
    expect(document.body.style.overflow).toBe('hidden');
    expect(fixture.nativeElement.querySelector('[role="dialog"]').getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(panel().querySelector('.checkout-modal__close'));
  });

  it('wraps Tab and Shift+Tab without leaving the checkout', async () => {
    await open(); const buttons = controls(), first = buttons[0], last = buttons[buttons.length - 1];
    first.focus(); const backwards = new KeyboardEvent('keydown', {key: 'Tab', shiftKey: true, cancelable: true});
    fixture.componentInstance.onDialogKeydown(backwards); expect(backwards.defaultPrevented).toBeTrue(); expect(document.activeElement).toBe(last);
    const forwards = new KeyboardEvent('keydown', {key: 'Tab', cancelable: true});
    fixture.componentInstance.onDialogKeydown(forwards); expect(forwards.defaultPrevented).toBeTrue(); expect(document.activeElement).toBe(first);
  });

  it('prevents programmatic sidebar focus while open', async () => {
    await open(); const before = document.activeElement; sidebar.focus(); expect(document.activeElement).toBe(before);
  });

  it('restores the original inert flags, scroll and launcher focus on close', async () => {
    sidebar.inert = true; await open(); fixture.componentRef.setInput('isOpen', false); fixture.detectChanges(); await fixture.whenStable();
    expect(shell.classList.contains('has-checkout-modal')).toBeFalse(); expect(sidebar.inert).toBeTrue(); expect(trigger.inert).toBeFalse();
    expect(document.body.style.overflow).toBe(previousOverflow); expect(document.activeElement).toBe(trigger);
  });

  it('yields keyboard and focus ownership to the existing confirmation overlay', async () => {
    await open(); const service = TestBed.inject(ConfirmDialogService);
    const pending = service.confirm({title: 'Synthetic confirmation', description: 'No commercial operation', confirmText: 'Confirm', cancelText: 'Cancel', variant: 'warning'});
    const action = document.createElement('button'); confirmations.append(action); action.focus();
    const event = new KeyboardEvent('keydown', {key: 'Tab', cancelable: true}); fixture.componentInstance.onDialogKeydown(event);
    expect(event.defaultPrevented).toBeFalse(); expect(document.activeElement).toBe(action);
    service.cancel(); expect(await pending).toBeFalse();
  });

  it('announces and focuses uncertainty inside the modal without changing the recovery action', async () => {
    await open(); fixture.componentRef.setInput('errorMessage', 'Synthetic response lost');
    fixture.componentRef.setInput('recoveryMessage', 'Conserva la operación y consulta su resultado.');
    fixture.componentRef.setInput('checkoutButtonLabel', 'RECUPERAR COBRO'); fixture.detectChanges(); await fixture.whenStable();
    expect(panel().querySelector('[role="alert"]')?.textContent).toContain('Synthetic response lost');
    expect(panel().querySelector('[role="status"]')?.textContent).toContain('Conserva la operación');
    expect(document.activeElement).toBe(panel().querySelector('.checkout-modal__notice'));
    expect(panel().querySelector('.checkout-modal__action--primary')?.textContent).toContain('RECUPERAR COBRO');
  });

  it('preserves close/finalize outputs and receipt validation', async () => {
    await open(); const close = spyOn(fixture.componentInstance.close, 'emit'), finalize = spyOn(fixture.componentInstance.finalize, 'emit');
    fixture.componentRef.setInput('receiptType', 'INVOICE'); fixture.componentRef.setInput('invoiceRucInvalid', true);
    fixture.componentRef.setInput('receiptValidationError', 'RUC requerido'); fixture.detectChanges();
    fixture.componentInstance.handleFinalize(); fixture.detectChanges(); expect(finalize).toHaveBeenCalledTimes(1);
    expect(panel().textContent).toContain('Completa los datos requeridos para emitir factura.');
    fixture.componentInstance.handleClose(); expect(close).toHaveBeenCalledTimes(1);
  });

  it('releases presentation ownership on destruction without removing a pre-existing shell marker', async () => {
    shell.classList.add('has-checkout-modal'); await open(); fixture.componentInstance.ngOnDestroy();
    expect(shell.classList.contains('has-checkout-modal')).toBeTrue(); expect(sidebar.inert).toBeFalse();
    expect(document.body.style.overflow).toBe(previousOverflow);
  });

  it('does not recapture originals when the query supplies the same panel repeatedly', async () => {
    document.body.style.overflow = 'auto'; sidebar.inert = true; await open();
    const originalPanel = panel();
    for (let i = 0; i < 3; i++) fixture.componentInstance.checkoutPanel = new ElementRef(originalPanel);
    expect(utility.inert).toBeTrue(); expect(posShell.inert).toBeTrue(); expect(confirmations.inert).toBeFalse();
    expect(document.body.style.overflow).toBe('hidden');
    await close();
    expect(utility.inert).toBeFalse(); expect(posShell.inert).toBeFalse(); expect(trigger.inert).toBeFalse();
    expect(sidebar.inert).toBeTrue(); expect(document.body.style.overflow).toBe('auto');
    expect(shell.classList.contains('has-checkout-modal')).toBeFalse(); expect(document.activeElement).toBe(trigger);
  });

  it('restores normal recovery hit-testing and focus after the uncertainty notice re-renders the open panel', async () => {
    await open(); const originalPanel = panel();
    const setter = spyOnProperty(fixture.componentInstance, 'checkoutPanel', 'set').and.callThrough();
    const finalize = spyOn(fixture.componentInstance.finalize, 'emit');
    fixture.componentRef.setInput('errorMessage', 'Synthetic response lost');
    fixture.componentRef.setInput('recoveryMessage', 'Conserva la operación y consulta su resultado.');
    fixture.componentRef.setInput('checkoutButtonLabel', 'RECUPERAR COBRO');
    fixture.detectChanges(); await fixture.whenStable();
    expect(setter.calls.allArgs().some(([ref]) => ref?.nativeElement === originalPanel)).toBeTrue();
    expect(panel()).toBe(originalPanel); expect(document.activeElement).toBe(panel().querySelector('.checkout-modal__notice'));
    expect(utility.inert).toBeTrue(); expect(posShell.inert).toBeTrue();
    const subscription = fixture.componentInstance.close.subscribe(() => fixture.componentRef.setInput('isOpen', false));
    try {
      panel().querySelector<HTMLButtonElement>('.checkout-modal__close')!.click();
      fixture.detectChanges(); await fixture.whenStable();
      expect(fixture.componentInstance.isOpen).toBeFalse(); expect(fixture.nativeElement.querySelector('[aria-modal="true"]')).toBeNull();
      expect(utility.inert).toBeFalse(); expect(posShell.inert).toBeFalse(); expect(sidebar.inert).toBeFalse();
      expect(document.body.style.overflow).toBe(previousOverflow); expect(shell.classList.contains('has-checkout-modal')).toBeFalse();
      expect(document.activeElement).toBe(trigger);
      const rect = recovery.getBoundingClientRect();
      expect(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)).toBe(recovery);
      recovery.focus(); expect(document.activeElement).toBe(recovery); expect(finalize).not.toHaveBeenCalled();
    } finally { subscription.unsubscribe(); }
  });

  it('preserves shared confirmation ownership and then restores the checkout invoker on close', async () => {
    const modalParent = fixture.nativeElement.parentElement as HTMLElement;
    const shared = TestBed.createComponent(ConfirmDialogComponent);
    // TestBed removes earlier root elements when adding a fixture; restore both real hosts.
    modalParent.append(fixture.nativeElement); confirmations.append(shared.nativeElement);
    const service = TestBed.inject(ConfirmDialogService);
    try {
      shared.detectChanges(); await open();
      expect(document.activeElement).withContext('checkout owns focus before shared confirmation opens').toBe(panel().querySelector('.checkout-modal__close'));
      const pending = service.confirm({title: 'Synthetic confirmation', description: 'No commercial operation',
        confirmText: 'Confirm', cancelText: 'Cancel', variant: 'warning'});
      shared.detectChanges(); await shared.whenStable();
      const buttons = shared.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
      expect(document.activeElement).toBe(buttons[0]); expect(confirmations.inert).toBeFalse();
      fixture.componentInstance.checkoutPanel = new ElementRef(panel()); await fixture.whenStable();
      expect(document.activeElement).toBe(buttons[0]);
      buttons[1].click(); shared.detectChanges(); expect(await pending).toBeTrue();
      await fixture.whenStable(); expect(document.activeElement).toBe(panel().querySelector('.checkout-modal__close'));
      fixture.componentRef.setInput('errorMessage', 'Synthetic response lost'); fixture.detectChanges(); await fixture.whenStable();
      expect(document.activeElement).toBe(panel().querySelector('.checkout-modal__notice'));
      await close();
      expect(document.activeElement).toBe(trigger); expect(utility.inert).toBeFalse();
      expect(document.body.style.overflow).toBe(previousOverflow); expect(shell.classList.contains('has-checkout-modal')).toBeFalse();
    } finally { service.cancel(); shared.destroy(); }
  });

  it('captures fresh original state on a later opening without losing pre-existing isolation or layout state', async () => {
    await open(); await close();
    sidebar.inert = true; shell.classList.add('has-checkout-modal'); document.body.style.overflow = 'scroll';
    await open();
    fixture.componentRef.setInput('errorMessage', 'Synthetic second-cycle notice'); fixture.detectChanges(); await fixture.whenStable();
    await close();
    expect(sidebar.inert).toBeTrue(); expect(utility.inert).toBeFalse(); expect(posShell.inert).toBeFalse();
    expect(shell.classList.contains('has-checkout-modal')).toBeTrue(); expect(document.body.style.overflow).toBe('scroll');
    expect(document.activeElement).toBe(trigger);
  });

  it('releases a genuinely replaced panel without letting old focus restoration interrupt the new cycle', async () => {
    await open(); const originalPanel = panel();
    const replacement = originalPanel.cloneNode(true) as HTMLElement;
    const triggerFocus = spyOn(trigger, 'focus').and.callThrough();
    originalPanel.replaceWith(replacement); fixture.componentInstance.checkoutPanel = new ElementRef(replacement);
    await fixture.whenStable();
    expect(originalPanel.isConnected).toBeFalse(); expect(replacement.isConnected).toBeTrue();
    expect(triggerFocus).not.toHaveBeenCalled(); expect(document.activeElement).toBe(replacement.querySelector('.checkout-modal__close'));
    expect(utility.inert).toBeTrue(); expect(posShell.inert).toBeTrue(); expect(sidebar.inert).toBeTrue();
    expect(shell.classList.contains('has-checkout-modal')).toBeTrue(); expect(document.body.style.overflow).toBe('hidden');
    fixture.componentInstance.checkoutPanel = undefined; await Promise.resolve();
    expect(triggerFocus).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(trigger);
    expect(utility.inert).toBeFalse(); expect(sidebar.inert).toBeFalse(); expect(document.body.style.overflow).toBe(previousOverflow);
    expect(shell.classList.contains('has-checkout-modal')).toBeFalse();
  });

  it('ignores queued notice and close focus work after an immediate close and reopening', async () => {
    await open(); fixture.componentRef.setInput('errorMessage', 'Synthetic queued notice'); fixture.detectChanges();
    const oldNotice = panel().querySelector<HTMLElement>('.checkout-modal__notice')!;
    const oldNoticeFocus = spyOn(oldNotice, 'focus').and.callThrough();
    const triggerFocus = spyOn(trigger, 'focus').and.callThrough();
    fixture.componentRef.setInput('isOpen', false); fixture.detectChanges();
    fixture.componentRef.setInput('errorMessage', ''); fixture.componentRef.setInput('isOpen', true); fixture.detectChanges();
    await fixture.whenStable();
    expect(oldNoticeFocus).not.toHaveBeenCalled(); expect(triggerFocus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(panel().querySelector('.checkout-modal__close')); expect(utility.inert).toBeTrue();
    await close(); expect(triggerFocus).toHaveBeenCalledTimes(1); expect(utility.inert).toBeFalse();
  });

  it('restores all originals on destruction and never focuses a queued detached notice', async () => {
    sidebar.inert = true; document.body.style.overflow = 'auto'; shell.classList.add('has-checkout-modal'); await open();
    fixture.componentRef.setInput('errorMessage', 'Synthetic notice before destruction'); fixture.detectChanges();
    const noticeFocus = spyOn(panel().querySelector<HTMLElement>('.checkout-modal__notice')!, 'focus').and.callThrough();
    fixture.destroy(); await Promise.resolve();
    expect(noticeFocus).not.toHaveBeenCalled(); expect(sidebar.inert).toBeTrue(); expect(utility.inert).toBeFalse();
    expect(posShell.inert).toBeFalse(); expect(document.body.style.overflow).toBe('auto');
    expect(shell.classList.contains('has-checkout-modal')).toBeTrue(); expect(document.activeElement).toBe(trigger);
  });

  it('preserves Escape output rules during submitting and shared confirmation', async () => {
    await open(); const emit = spyOn(fixture.componentInstance.close, 'emit');
    const escape = () => fixture.componentInstance.onDialogKeydown(new KeyboardEvent('keydown', {key: 'Escape', cancelable: true}));
    fixture.componentRef.setInput('submitting', true); fixture.detectChanges(); escape(); expect(emit).not.toHaveBeenCalled();
    fixture.componentRef.setInput('submitting', false); fixture.detectChanges();
    const service = TestBed.inject(ConfirmDialogService);
    const pending = service.confirm({title: 'Synthetic confirmation', description: 'No commercial operation',
      confirmText: 'Confirm', cancelText: 'Cancel', variant: 'warning'});
    escape(); expect(emit).not.toHaveBeenCalled(); service.cancel(); expect(await pending).toBeFalse();
    escape(); expect(emit).toHaveBeenCalledTimes(1);
  });
});
