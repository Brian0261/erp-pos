import { HttpErrorResponse } from "@angular/common/http";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Observable, of, throwError } from "rxjs";

import { AuthService } from "../../core/auth/auth.service";
import { ConfirmDialogService } from "../../shared/dialogs/confirm-dialog.service";
import { BillingSeriesPageComponent } from "./billing-series-page.component";
import {
  BillingSeriesRequest,
  BillingSeriesResponse,
} from "./data/billing.models";
import { BillingSeriesService } from "./data/billing-series.service";

class FakeAuthService {
  me() {
    return of({
      id: "1",
      username: "admin",
      email: "admin@example.test",
      roles: ["ADMIN"],
    });
  }
}

class FakeConfirmDialogService {
  confirmCount = 0;

  confirm(): Promise<boolean> {
    this.confirmCount += 1;
    return Promise.resolve(true);
  }
}

class FakeBillingSeriesService {
  listCount = 0;
  updateCalls: Array<{
    id: number;
    payload: BillingSeriesRequest;
    ifMatch: string;
  }> = [];
  deactivateCalls: Array<{ id: number; ifMatch: string }> = [];
  updateErrorStatus: number | null = null;
  deactivateErrorStatus: number | null = null;

  constructor(private readonly rows: BillingSeriesResponse[]) {}

  list(): Observable<BillingSeriesResponse[]> {
    this.listCount += 1;
    return of(this.rows);
  }

  create() {
    return of(this.rows[0]);
  }

  update(id: number, payload: BillingSeriesRequest, ifMatch: string) {
    this.updateCalls.push({ id, payload, ifMatch });
    if (this.updateErrorStatus !== null) {
      return this.errorResponse(this.updateErrorStatus);
    }
    return of({ body: this.rows[0], etag: '"billing-series-7-v4"' });
  }

  deactivate(id: number, ifMatch: string) {
    this.deactivateCalls.push({ id, ifMatch });
    if (this.deactivateErrorStatus !== null) {
      return this.errorResponse(this.deactivateErrorStatus);
    }
    return of({ body: null, etag: '"billing-series-7-v4"' });
  }

  concurrencyToken(series: BillingSeriesResponse): string {
    return `"billing-series-${series.id}-v${series.version}"`;
  }

  private errorResponse(status: number) {
    const message = status === 409
      ? "Ya existe una serie activa"
      : status === 400
        ? "If-Match inválido"
        : status === 428
          ? "El header If-Match es obligatorio"
          : "stale series";
    return throwError(() => new HttpErrorResponse({
      status,
      error: { message },
    }));
  }
}

describe("BillingSeriesPageComponent concurrency failures", () => {
  let fixture: ComponentFixture<BillingSeriesPageComponent>;
  let component: BillingSeriesPageComponent;
  let seriesService: FakeBillingSeriesService;

  const activeSeries: BillingSeriesResponse = {
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
  const inactiveSeries: BillingSeriesResponse = {
    ...activeSeries,
    active: false,
  };

  beforeEach(async () => {
    seriesService = new FakeBillingSeriesService([activeSeries]);

    await TestBed.configureTestingModule({
      imports: [BillingSeriesPageComponent],
      providers: [
        { provide: AuthService, useValue: new FakeAuthService() },
        { provide: BillingSeriesService, useValue: seriesService },
        {
          provide: ConfirmDialogService,
          useValue: new FakeConfirmDialogService(),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BillingSeriesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  for (const status of [412, 428]) {
    it(`handles ${status} on update with one mutation and one reload`, async () => {
      seriesService.updateErrorStatus = status;
      component.edit(activeSeries);
      component.form.patchValue({ currentNumber: 15 });

      await component.submit();

      expect(seriesService.updateCalls.length).toBe(1);
      expect(seriesService.listCount).toBe(2);
      expect(component.loading).toBeFalse();
      expect(component.successMessage).toBe("");
      expect(component.showForm).toBeFalse();
      expect(component.editingId).toBeNull();
      expect(component.editingContext).toBeNull();
      expectConcurrencyMessage(status);
    });

    it(`handles ${status} on reactivate without retry or optimistic success`, async () => {
      seriesService.updateErrorStatus = status;

      await component.activate(inactiveSeries);

      expect(seriesService.updateCalls.length).toBe(1);
      expect(seriesService.listCount).toBe(2);
      expect(component.loading).toBeFalse();
      expect(component.successMessage).toBe("");
      expect(component.errorMessage).not.toBe("");
      expectConcurrencyMessage(status);
    });

    it(`handles ${status} on deactivate without retry or optimistic success`, async () => {
      seriesService.deactivateErrorStatus = status;

      await component.deactivate(activeSeries);

      expect(seriesService.deactivateCalls.length).toBe(1);
      expect(seriesService.listCount).toBe(2);
      expect(component.loading).toBeFalse();
      expect(component.successMessage).toBe("");
      expect(component.errorMessage).not.toBe("");
      expectConcurrencyMessage(status);
    });
  }

  for (const scenario of [
    { status: 400, expected: "Solicitud invalida" },
    { status: 409, expected: "Conflicto operativo" },
  ]) {
    it(`keeps ${scenario.status} separate from stale precondition handling`, async () => {
      seriesService.updateErrorStatus = scenario.status;
      component.edit(activeSeries);
      component.form.patchValue({ currentNumber: 15 });

      await component.submit();

      expect(seriesService.updateCalls.length).toBe(1);
      expect(seriesService.listCount).toBe(1);
      expect(component.loading).toBeFalse();
      expect(component.successMessage).toBe("");
      expect(component.showForm).toBeTrue();
      expect(component.errorMessage).toContain(scenario.expected);
      expect(component.errorMessage).not.toContain(
        "No se pudo verificar la versión vigente",
      );
      expect(component.errorMessage).not.toContain(
        "modificada por otro usuario",
      );
    });
  }

  function expectConcurrencyMessage(status: number): void {
    if (status === 428) {
      expect(component.errorMessage).toContain(
        "No se pudo verificar la versión vigente",
      );
      return;
    }
    expect(component.errorMessage).toContain("modificada por otro usuario");
  }
});
