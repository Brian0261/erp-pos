import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { BoundAuthSessionError, createBoundAuthContext } from './bound-auth-context';
import { jwtInterceptor } from '../interceptors/jwt.interceptor';
import { SalesService } from '../../features/sales/data/sales.service';
import { CreateSaleRequest } from '../../features/sales/data/sales.models';

describe('AuthService credential-bound verification', () => {
  let auth: AuthService; let http: HttpTestingController;
  let token: string;
  const original = 'synthetic-original-credential', renewed = 'synthetic-renewed-credential';
  const user = { id: 'synthetic-owner', username: 'qa', email: 'qa@example.test', roles: ['CAJERO'] };
  const payload: CreateSaleRequest = { operationId: '00000000-0000-4000-8000-000000000001', warehouseId: 1,
    confirmedTotal: 10, items: [{ productId: 1, quantity: 1, confirmedUnitPrice: 10, discountAmount: 0 }],
    payments: [{ paymentMethod: 'CASH', amount: 10 }] };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService); http = TestBed.inject(HttpTestingController);
    token = original; spyOn(auth, 'getToken').and.callFake(() => token);
  });
  afterEach(() => http.verify());
  it('uses the captured credential and same HTTP context for verification and a sale POST', () => {
    const context = createBoundAuthContext(auth.getToken());
    auth.me(context).subscribe(profile => {
      expect(profile.id).toBe(user.id); TestBed.inject(SalesService).create(payload, context).subscribe();
    });
    const verification = http.expectOne(r => r.url.endsWith('/auth/me'));
    expect(verification.request.headers.get('Authorization')).toBe(`Bearer ${original}`);
    expect(verification.request.context).toBe(context); verification.flush(user);
    const sale = http.expectOne(r => r.url.endsWith('/sales'));
    expect(sale.request.context).toBe(context);
    expect(sale.request.headers.get('Authorization')).toBe(verification.request.headers.get('Authorization'));
    expect(sale.request.body).toEqual(payload); expect(JSON.stringify(sale.request.body)).not.toContain(original);
    sale.flush({ id: 1 });
  });
  it('blocks the POST if credentials change after verification was dispatched', () => {
    const context = createBoundAuthContext(auth.getToken()); let failure: unknown;
    auth.me(context).subscribe(() => TestBed.inject(SalesService).create(payload, context).subscribe({ error: error => failure = error }));
    const verification = http.expectOne(r => r.url.endsWith('/auth/me'));
    token = renewed; verification.flush(user);
    http.expectNone(r => r.url.endsWith('/sales')); expect(failure instanceof BoundAuthSessionError).toBeTrue();
  });
  it('allows a renewed credential only after a new bound verification', () => {
    token = renewed; const context = createBoundAuthContext(auth.getToken());
    auth.me(context).subscribe(profile => {
      expect(profile.id).toBe(user.id); TestBed.inject(SalesService).create(payload, context).subscribe();
    });
    const verification = http.expectOne(r => r.url.endsWith('/auth/me'));
    expect(verification.request.headers.get('Authorization')).toBe(`Bearer ${renewed}`); verification.flush(user);
    const sale = http.expectOne(r => r.url.endsWith('/sales'));
    expect(sale.request.headers.get('Authorization')).toBe(`Bearer ${renewed}`); sale.flush({ id: 1 });
  });
  it('retains the existing me() contract for ordinary consumers', () => {
    auth.me().subscribe(profile => expect(profile).toEqual(user));
    const request = http.expectOne(r => r.url.endsWith('/auth/me'));
    expect(request.request.method).toBe('GET'); request.flush(user);
  });
});
