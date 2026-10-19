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
