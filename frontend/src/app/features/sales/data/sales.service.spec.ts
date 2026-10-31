import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { createBoundAuthContext } from '../../../core/auth/bound-auth-context';
import { jwtInterceptor } from '../../../core/interceptors/jwt.interceptor';
import { SalesService } from './sales.service';
import { CreateSaleRequest } from './sales.models';

describe('SalesService optional bound HTTP context', () => {
  let service: SalesService; let http: HttpTestingController;
  const token = 'synthetic-service-credential';
  const payload: CreateSaleRequest = { operationId: '00000000-0000-4000-8000-000000000001', confirmedTotal: 10,
    warehouseId: 1, items: [{ productId: 1, quantity: 1, discountAmount: 0, confirmedUnitPrice: 10 }],
    payments: [{ paymentMethod: 'CASH', amount: 10 }] };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting(),
      { provide: AuthService, useValue: { getToken: () => token } }] });
    service = TestBed.inject(SalesService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('keeps list filters and bound authorization on a GET only', () => {
    const context = createBoundAuthContext(token);
    service.listItems({ status: 'VOIDED', cashRegisterSessionId: 7, createdBy: 'qa', from: '2026-10-01', to: '2026-10-31' }, context).subscribe();
    const request = http.expectOne(r => r.url.endsWith('/sales/list-items'));
    expect(request.request.method).toBe('GET'); expect(request.request.context).toBe(context);
    expect(request.request.headers.get('Authorization')).toBe('Bearer ' + token);
    expect(request.request.params.get('status')).toBe('VOIDED'); expect(request.request.params.get('cashRegisterSessionId')).toBe('7');
    expect(request.request.params.get('createdBy')).toBe('qa'); expect(request.request.params.get('from')).toBe('2026-10-01');
    expect(request.request.params.get('to')).toBe('2026-10-31'); request.flush([]);
  });
  for (const bound of [false, true]) {
    it('preserves the sale body and existing endpoint with bound=' + bound, () => {
      const context = bound ? createBoundAuthContext(token) : undefined;
      service.create(payload, context).subscribe();
      const request = http.expectOne(r => r.url.endsWith('/sales'));
      expect(request.request.method).toBe('POST'); expect(request.request.body).toBe(payload);
      expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      if (context) expect(request.request.context).toBe(context);
      expect(JSON.stringify(request.request.body)).not.toContain(token); request.flush({ id: 1 });
    });
  }
});
