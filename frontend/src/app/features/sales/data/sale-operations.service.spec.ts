import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideHttpClient } from "@angular/common/http";
import { TestBed } from "@angular/core/testing";
import { createBoundAuthContext } from "../../../core/auth/bound-auth-context";
import { PrepareSaleOperationRequest, SaleOperationsService } from "./sale-operations.service";

describe("A recovery REST transport", () => {
  let operations: SaleOperationsService, http: HttpTestingController;
  const context = createBoundAuthContext("synthetic-operation-credential");
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); operations = TestBed.inject(SaleOperationsService); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it("uses the approved methods, pagination and bound context without persisting a credential in payload", () => {
    const body: PrepareSaleOperationRequest = { protocolVersion: 1, origin: "QUOTE", operationId: "00000000-0000-4000-8000-000000000001", command: null,
      quoteId: 9, quoteCommand: { operationId: "00000000-0000-4000-8000-000000000001", warehouseId: 1, comment: null, confirmedTotal: 10,
        items: [{ quoteItemId: 1, quantity: 1, discountAmount: 0, confirmedUnitPrice: 10 }], payments: [{ paymentMethod: "CASH", amount: 10 }] }, receiptIntent: null };
    operations.prepare(body, context).subscribe(); const prepare = http.expectOne("/api/v1/sales/operations");
    expect(prepare.request.method).toBe("POST"); expect(prepare.request.body).toEqual(body); expect(prepare.request.context).toBe(context);
    expect(JSON.stringify(prepare.request.body)).not.toContain("synthetic-operation-credential"); prepare.flush({});
    operations.list(2, context, "PREPARED").subscribe(); const list = http.expectOne(r => r.url.endsWith("/sales/operations"));
    expect(list.request.method).toBe("GET"); expect(list.request.params.get("page")).toBe("2"); expect(list.request.params.get("size")).toBe("10"); expect(list.request.params.get("state")).toBe("PREPARED"); list.flush({});
    operations.get(body.operationId, context).subscribe(); const get = http.expectOne(`/api/v1/sales/operations/${body.operationId}`); expect(get.request.method).toBe("GET"); get.flush({});
    operations.cancel(body.operationId, context).subscribe(); const cancel = http.expectOne(`/api/v1/sales/operations/${body.operationId}/cancel`); expect(cancel.request.method).toBe("POST"); expect(cancel.request.context).toBe(context); cancel.flush({});
  });
});
