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
