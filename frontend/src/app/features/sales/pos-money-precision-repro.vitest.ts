import { describe, expect, it, beforeEach, afterEach, vi, type Mocked } from "vitest";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideZoneChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { BillingSeriesService } from "../billing/data/billing-series.service";
import { ElectronicDocumentService } from "../billing/data/electronic-document.service";
import { WarehouseService } from "../inventory/data/warehouse.service";
import { CashRegisterService } from "./data/cash-register.service";
import { PosService } from "./data/pos.service";
import { PosStateService } from "./data/pos-state.service";
import { SalesService } from "./data/sales.service";
import { PosPageComponent } from "./pos-page.component";
import { calculatePosPaidTotal, calculatePosTotal } from "./utils/pos-calculations";

describe("MONEY-QA-0 POS decimal precision reproduction", () => {
  let fixture: ReturnType<typeof TestBed.createComponent<PosPageComponent>>;
  let component: PosPageComponent;
  let http: HttpTestingController;
  let sales: Mocked<Pick<SalesService, "create">>;
  let confirm: Mocked<Pick<ConfirmDialogService, "confirm">>;
  let documents: Mocked<Pick<ElectronicDocumentService, "createFromSale" | "generateXml" | "sign" | "send">>;

  beforeEach(async () => {
    sales = {
      create: vi.fn<SalesService["create"]>(),
    };
    sales.create.mockReturnValue(of());
    confirm = {
      confirm: vi.fn<ConfirmDialogService["confirm"]>(),
    };
    // Even if validation passes, never dispatch a sale: the synthetic confirmation is declined.
    confirm.confirm.mockReturnValue(Promise.resolve(false));
    documents = {
      createFromSale: vi.fn<ElectronicDocumentService["createFromSale"]>(),
      generateXml: vi.fn<ElectronicDocumentService["generateXml"]>(),
      sign: vi.fn<ElectronicDocumentService["sign"]>(),
      send: vi.fn<ElectronicDocumentService["send"]>(),
    };
    await TestBed.configureTestingModule({
      imports: [PosPageComponent],
      providers: [
        provideZoneChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => "synthetic-money-precision-credential",
          me: () => of({ id: "qa-money-precision", roles: ["CAJERO"] }) } },
        { provide: WarehouseService, useValue: { list: () => of([
          { id: 1, code: "QA", name: "Synthetic warehouse", type: "STORE", active: true },
        ]) } },
        { provide: CashRegisterService, useValue: { current: () => of({ id: 7, status: "OPEN" }) } },
        { provide: PosService, useValue: { search: () => of([]), lookup: () => of([]) } },
        { provide: PosStateService, useValue: { load: () => null, save: () => {}, clearAll: () => {} } },
        { provide: ConfirmDialogService, useValue: confirm },
        { provide: SalesService, useValue: sales },
        { provide: BillingSeriesService, useValue: { list: () => of([]) } },
        { provide: ElectronicDocumentService, useValue: documents },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PosPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    expect(sales.create).not.toHaveBeenCalled();
    expect(documents.createFromSale).not.toHaveBeenCalled();
    expect(documents.generateXml).not.toHaveBeenCalled();
    expect(documents.sign).not.toHaveBeenCalled();
    expect(documents.send).not.toHaveBeenCalled();
    http.expectNone(() => true, "MONEY-QA-0 must never call a backend");
    http.verify();
    fixture.destroy();
  });

  it("caseD accepts an exact 0.30 payment for three units priced at 0.10", async () => {
    component.addToCart({ productId: 101, sku: "QA-DECIMAL", barcode: null,
      name: "Synthetic decimal product", salePrice: 0.10, stockAvailable: 10, quantityPolicy: "WHOLE" });
    component.setQuantity(0, "3");
    component.setPaymentAmount(0, "0.30");
    component.openCheckoutModal();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const displayedTotal = (fixture.nativeElement as HTMLElement)
      .querySelector("app-pos-totals-summary .total-main strong")?.textContent?.trim();
    component.finalizeSale();
    await fixture.whenStable();
    console.log("MONEY-QA-0 D " + JSON.stringify({
      price: component.cart[0].salePrice,
      quantity: component.cart[0].quantity,
      internalTotal: component.total,
      functionTotal: calculatePosTotal(component.cart),
      paidTotal: calculatePosPaidTotal(component.payments),
      receivedLessThanTotal: component.paidTotal < component.total,
      internalDifference: component.total - component.paidTotal,
      displayedTotal,
      validationError: component.errorMessage,
      confirmationCalls: confirm.confirm.mock.calls.length,
      saleCalls: sales.create.mock.calls.length,
    }));

    expect(displayedTotal, "Presentation uses the real POS number pipe").toBe("S/ 0.30");
    expect(component.errorMessage, "Exact cent payment must not be falsely rejected").toBe("");
    expect(confirm.confirm, "Valid input must reach confirmation, without dispatching a sale")
      .toHaveBeenCalledTimes(1);
  });
});
