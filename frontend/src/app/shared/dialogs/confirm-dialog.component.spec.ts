import { provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { ConfirmDialogComponent } from "./confirm-dialog.component";
import { ConfirmDialogService } from "./confirm-dialog.service";

describe("ConfirmDialogComponent keyboard boundary", () => {
  it("preserves Tab wrapping, normal navigation, disabled filtering and dialog ARIA", async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [provideZoneChangeDetection()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    const service = TestBed.inject(ConfirmDialogService);
    const handler = spyOn(fixture.componentInstance, "onTabKey").and.callThrough();
    try {
      fixture.detectChanges();
      const result = service.confirm({
        title: "Keyboard QA",
        description: "Synthetic, non-transactional confirmation",
        confirmText: "Confirm",
        cancelText: "Cancel",
        variant: "info",
      });
      fixture.detectChanges();
      await fixture.whenStable();
      const host: HTMLElement = fixture.nativeElement;
      const panel = host.querySelector<HTMLElement>('[role="dialog"]')!;
      const buttons = panel.querySelectorAll<HTMLButtonElement>("button");
      const first = buttons[0];
      const last = buttons[1];
      expect(panel.getAttribute("aria-modal")).toBe("true");
      expect(panel.getAttribute("aria-labelledby")).toBe("confirmDialogTitle");
      expect(panel.getAttribute("aria-describedby")).toBe("confirmDialogDescription");
      expect(document.activeElement).toBe(first);

      const tab = (shiftKey = false): KeyboardEvent => {
        const previousCalls = handler.calls.count();
        const event = new KeyboardEvent("keydown", {
          key: "Tab", shiftKey, bubbles: true, cancelable: true,
        });
        document.dispatchEvent(event);
        expect(handler.calls.count()).toBe(previousCalls + 1);
        return event;
      };
      last.focus();
      expect(tab().defaultPrevented).toBeTrue();
      expect(document.activeElement).toBe(first);
      expect(tab(true).defaultPrevented).toBeTrue();
      expect(document.activeElement).toBe(last);

      const middle = document.createElement("input");
      last.before(middle);
      middle.focus();
      expect(tab().defaultPrevented).toBeFalse();
      expect(document.activeElement).toBe(middle);
      expect(tab(true).defaultPrevented).toBeFalse();

      const disabled = document.createElement("button");
      disabled.disabled = true;
      last.after(disabled);
      last.focus();
      expect(tab().defaultPrevented).toBeTrue();
      expect(document.activeElement).toBe(first);

      const unrelated = new Event("keydown", { cancelable: true });
      fixture.componentInstance.onTabKey(unrelated);
      expect(unrelated.defaultPrevented).toBeFalse();
      expect(document.activeElement).toBe(first);
      middle.focus();
      const previousCalls = handler.calls.count();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      expect(handler.calls.count()).toBe(previousCalls);
      expect(document.activeElement).toBe(middle);

      service.cancel();
      expect(await result).toBeFalse();
      const closedTab = tab();
      expect(closedTab.defaultPrevented).toBeFalse();
    } finally {
      service.cancel();
      fixture.destroy();
    }
  });
});

describe("ConfirmDialogComponent bounded content and focus", () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ConfirmDialogComponent>>;
  let service: ConfirmDialogService;
  const lines = (count: number) => Array.from({ length: count }, (_, i) =>
    `Producto sintético ${i + 1}: precio S/ 10.00 → S/ 12.00; cantidad y descuento conservados.`).join('\n');
  const open = async (description: string) => {
    void service.confirm({ title: 'Los precios de esta venta cambiaron', description,
      confirmText: 'Aceptar nuevos precios', cancelText: 'Mantener carrito', variant: 'warning' });
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
  };
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ConfirmDialogComponent],
      providers: [provideZoneChangeDetection()] }).compileComponents();
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    service = TestBed.inject(ConfirmDialogService);
    fixture.detectChanges();
  });
  afterEach(() => { service.cancel(); fixture.destroy(); });

  for (const count of [1, 5, 100]) {
    it(`preserves all ${count} product comparisons and explicit decision labels`, async () => {
      await open(lines(count));
      const host: HTMLElement = fixture.nativeElement;
      const body = host.querySelector<HTMLElement>('.confirm-dialog__body')!;
      expect(body.textContent).toContain(`Producto sintético ${count}:`);
      expect(host.querySelector('header')?.textContent).toContain('Los precios de esta venta cambiaron');
      expect(host.querySelector('footer')?.textContent).toContain('Mantener carrito');
      expect(host.querySelector('footer')?.textContent).toContain('Aceptar nuevos precios');
      const panel = host.querySelector<HTMLElement>('[aria-modal="true"]')!;
      if (count === 100) {
        expect(panel.hasAttribute('aria-describedby')).toBeFalse();
        expect(document.activeElement).toBe(host.querySelector('h2'));
        expect(body.tabIndex).toBe(0);
        expect(body.querySelectorAll('p').length).toBe(count);
      } else if (count === 1) {
        expect(panel.getAttribute('aria-describedby')).toBe('confirmDialogDescription');
        expect(document.activeElement).toBe(host.querySelector('button'));
      }
    });
  }

  it('contains keyboard focus for long content, safely cancels with Escape and restores the invoker', async () => {
    const invoker = document.createElement('button'); document.body.append(invoker); invoker.focus();
    try {
      await open(lines(100));
      const host: HTMLElement = fixture.nativeElement;
      const body = host.querySelector<HTMLElement>('.confirm-dialog__body')!;
      const buttons = host.querySelectorAll<HTMLButtonElement>('button');
      const tab = (shiftKey = false) => document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Tab', shiftKey, bubbles: true, cancelable: true,
      }));
      tab(); expect(document.activeElement).toBe(body);
      tab(true); expect(document.activeElement).toBe(buttons[1]);
      tab(); expect(document.activeElement).toBe(body);
      buttons[0].focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges(); await fixture.whenStable();
      expect(service.currentState).toBeNull(); expect(document.activeElement).toBe(invoker);
    } finally { invoker.remove(); }
  });

  for (const [width, height] of [[1366, 768], [1024, 768], [390, 844], [683, 384]]) {
    it(`keeps header/actions in the ${width}x${height} viewport while only long content scrolls`, async () => {
      await open(lines(100) + '\n' + 'LongToken'.repeat(80));
      const frame = document.createElement('iframe');
      frame.title = 'Synthetic dialog viewport QA';
      frame.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:${height}px;border:0;`;
      document.body.append(frame);
      try {
        const doc = frame.contentDocument!;
        const stylesLoaded: Promise<void>[] = [];
        for (const style of Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))) {
          const clone = style.cloneNode(true);
          if (clone instanceof HTMLLinkElement) {
            clone.href = (style as HTMLLinkElement).href;
            stylesLoaded.push(new Promise<void>((resolve, reject) => {
              clone.onload = () => resolve();
              clone.onerror = () => reject(new Error('Viewport QA stylesheet failed to load'));
            }));
          }
          doc.head.append(clone);
        }
        await Promise.all(stylesLoaded);
        const reset = doc.createElement('style');
        reset.textContent = 'html, body { margin: 0; width: 100%; height: 100%; }'; doc.head.append(reset);
        doc.body.append(fixture.nativeElement);
        await new Promise<void>(resolve => frame.contentWindow!.requestAnimationFrame(() => resolve()));
        const panel = doc.querySelector<HTMLElement>('.confirm-dialog')!;
        const header = doc.querySelector<HTMLElement>('.confirm-dialog__header')!;
        const footer = doc.querySelector<HTMLElement>('.confirm-dialog__actions')!;
        const body = doc.querySelector<HTMLElement>('.confirm-dialog__body')!;
        expect(frame.contentWindow!.getComputedStyle(panel).maxHeight).not.toBe('none');
        const visible = (el: HTMLElement) => {
          const rect = el.getBoundingClientRect();
          expect(rect.top).toBeGreaterThanOrEqual(0); expect(rect.bottom).toBeLessThanOrEqual(height);
          expect(rect.left).toBeGreaterThanOrEqual(0); expect(rect.right).toBeLessThanOrEqual(width);
          expect(rect.height).toBeGreaterThan(0);
        };
        visible(panel); visible(header); visible(footer);
        for (const button of Array.from(footer.querySelectorAll<HTMLButtonElement>('button'))) visible(button);
        expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
        expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);
        const headerTop = header.getBoundingClientRect().top, footerBottom = footer.getBoundingClientRect().bottom;
        body.scrollTop = body.scrollHeight;
        expect(body.scrollTop).toBeGreaterThan(0);
        expect(header.getBoundingClientRect().top).toBe(headerTop);
        expect(footer.getBoundingClientRect().bottom).toBe(footerBottom);
        expect(body.querySelector('p:last-child')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(footer.getBoundingClientRect().top);
      } finally { frame.remove(); }
    });
  }

  it('preserves existing short-dialog labels, highlight, variants and confirmation result', async () => {
    const result = service.confirm({ title: 'Existing consumer', description: 'Short description', highlightText: 'Existing highlight',
      confirmText: 'Continue', cancelText: 'Cancel', variant: 'info' });
    fixture.detectChanges(); await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(host.querySelector('.confirm-dialog__highlight')?.textContent).toBe('Existing highlight');
    expect(host.querySelectorAll('button')[0].textContent?.trim()).toBe('Cancel');
    host.querySelectorAll('button')[1].click();
    expect(await result).toBeTrue();
  });
});
