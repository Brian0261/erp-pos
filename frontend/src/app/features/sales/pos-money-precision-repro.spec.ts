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
  let sales: jasmine.SpyObj<SalesService>;
  let confirm: jasmine.SpyObj<ConfirmDialogService>;
  let documents: jasmine.SpyObj<ElectronicDocumentService>;

  beforeEach(async () => {
    sales = jasmine.createSpyObj<SalesService>("SalesService", ["create"]);
    sales.create.and.returnValue(of());
    confirm = jasmine.createSpyObj<ConfirmDialogService>("ConfirmDialogService", ["confirm"]);
    // Even if validation passes, never dispatch a sale: the synthetic confirmation is declined.
    confirm.confirm.and.returnValue(Promise.resolve(false));
    documents = jasmine.createSpyObj<ElectronicDocumentService>("ElectronicDocumentService",
      ["createFromSale", "generateXml", "sign", "send"]);
    await TestBed.configureTestingModule({
      imports: [PosPageComponent],
      providers: [
        provideZoneChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: { me: () => of({ id: "qa-money-precision", roles: ["CAJERO"] }) } },
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
      confirmationCalls: confirm.confirm.calls.count(),
      saleCalls: sales.create.calls.count(),
    }));

    expect(displayedTotal).withContext("Presentation uses the real POS number pipe").toBe("S/ 0.30");
    expect(component.errorMessage).withContext("Exact cent payment must not be falsely rejected").toBe("");
    expect(confirm.confirm).withContext("Valid input must reach confirmation, without dispatching a sale")
      .toHaveBeenCalledTimes(1);
  });
});
