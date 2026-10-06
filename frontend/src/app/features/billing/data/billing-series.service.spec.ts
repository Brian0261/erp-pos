import {
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../../environments/environment";
import { BillingSeriesRequest, BillingSeriesResponse } from "./billing.models";
import {
  BillingSeriesService,
  buildBillingSeriesEtag,
} from "./billing-series.service";

describe("BillingSeriesService concurrency contract", () => {
  let service: BillingSeriesService;
  let http: HttpTestingController;

  const endpoint = `${environment.apiUrl}/billing/series`;
  const series: BillingSeriesResponse = {
    id: 7,
    version: 3,
    documentType: "RECEIPT",
    series: "B001",
    currentNumber: 12,
    environment: "LOCAL",
    active: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
  const payload: BillingSeriesRequest = {
    documentType: "RECEIPT",
    series: "B001",
    currentNumber: 13,
    environment: "LOCAL",
    active: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BillingSeriesService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(BillingSeriesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it("preserves version, builds the exact token and captures an individual ETag", () => {
    let responseVersion: number | undefined;
    let responseEtag: string | null | undefined;

    service.getById(series.id).subscribe((response) => {
      responseVersion = response.body?.version;
      responseEtag = response.etag;
    });

    const request = http.expectOne(`${endpoint}/${series.id}`);
    expect(request.request.method).toBe("GET");
    request.flush(series, {
      headers: { ETag: '"billing-series-7-v3"' },
    });

    expect(responseVersion).toBe(3);
    expect(responseEtag).toBe('"billing-series-7-v3"');
    expect(service.concurrencyToken(series)).toBe('"billing-series-7-v3"');
    expect(buildBillingSeriesEtag(7, 3)).toBe('"billing-series-7-v3"');
  });

  it("updates once with If-Match and never serializes version in the body", () => {
    let responseEtag: string | null | undefined;

    service
      .update(series.id, payload, '"billing-series-7-v3"')
      .subscribe((response) => {
        responseEtag = response.etag;
      });

    const request = http.expectOne(`${endpoint}/${series.id}`);
    expect(request.request.method).toBe("PUT");
    expect(request.request.headers.get("If-Match")).toBe(
      '"billing-series-7-v3"',
    );
    expect(request.request.body).toEqual(payload);
    expect(request.request.body.version).toBeUndefined();
    request.flush({ ...series, currentNumber: 13, version: 4 }, {
      headers: { ETag: '"billing-series-7-v4"' },
    });

    expect(responseEtag).toBe('"billing-series-7-v4"');
    http.expectNone(`${endpoint}/${series.id}`);
  });

  it("reactivates once through update with the same If-Match contract", () => {
    const reactivatePayload = { ...payload, active: true };

    service
      .update(series.id, reactivatePayload, '"billing-series-7-v3"')
      .subscribe();

    const request = http.expectOne(`${endpoint}/${series.id}`);
    expect(request.request.method).toBe("PUT");
    expect(request.request.headers.get("If-Match")).toBe(
      '"billing-series-7-v3"',
    );
    expect(request.request.body).toEqual(reactivatePayload);
    request.flush({ ...series, active: true, version: 4 });

    http.expectNone(`${endpoint}/${series.id}`);
  });

  it("deactivates once with DELETE and If-Match", () => {
    service.deactivate(series.id, '"billing-series-7-v3"').subscribe();

    const request = http.expectOne(`${endpoint}/${series.id}`);
    expect(request.request.method).toBe("DELETE");
    expect(request.request.headers.get("If-Match")).toBe(
      '"billing-series-7-v3"',
    );
    request.flush(null);

    http.expectNone(`${endpoint}/${series.id}`);
  });

  it("does not retry an update after a stale response", () => {
    let status: number | undefined;

    service
      .update(series.id, payload, '"billing-series-7-v3"')
      .subscribe({
        error: (error) => {
          status = error.status;
        },
      });

    const request = http.expectOne(`${endpoint}/${series.id}`);
    request.flush(
      { message: "stale series" },
      { status: 412, statusText: "Precondition Failed" },
    );

    expect(status).toBe(412);
    http.expectNone(`${endpoint}/${series.id}`);
  });
});
