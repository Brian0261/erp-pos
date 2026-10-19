import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { PosService } from "./pos.service";

describe("POS batch snapshot read contract", () => {
  let service: PosService; let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PosService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it("reads product and warehouse IDs without dispatching a write", () => {
    service.snapshot([1, 2, 2], 7).subscribe(result => expect(result).toEqual([]));
    const request = http.expectOne(r => r.url.endsWith("/pos/products/snapshot"));
    expect(request.request.method).toBe("GET");
    expect(request.request.params.get("productIds")).toBe("1,2");
    expect(request.request.params.get("warehouseId")).toBe("7"); request.flush([]);
  });
  it("chunks long carts without omitting lines", () => {
    service.snapshot(Array.from({ length: 201 }, (_, i) => i + 1), 7).subscribe(result => expect(result.length).toBe(2));
    const requests = http.match(r => r.url.endsWith("/pos/products/snapshot"));
    expect(requests.length).toBe(2);
    expect(requests[0].request.params.get("productIds")!.split(",").length).toBe(200);
    expect(requests[1].request.params.get("productIds")).toBe("201");
    requests[0].flush([{ productId: 1 }]); requests[1].flush([{ productId: 201 }]);
  });
  it("does not send a request for an empty cart", () => {
    service.snapshot([], 7).subscribe(result => expect(result).toEqual([]));
    http.expectNone(() => true);
  });
});
