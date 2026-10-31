import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { createBoundAuthContext } from '../../../core/auth/bound-auth-context';
import { jwtInterceptor } from '../../../core/interceptors/jwt.interceptor';
import { ElectronicDocumentService } from './electronic-document.service';
import { CreateElectronicDocumentFromSaleRequest } from './billing.models';

describe('ElectronicDocumentService optional bound HTTP context', () => {
  let service: ElectronicDocumentService; let http: HttpTestingController;
  const token = 'synthetic-document-credential';
  const payload: CreateElectronicDocumentFromSaleRequest = { documentType: 'INVOICE', billingSeriesId: 21,
    customerName: 'Cliente sintético', customerDocument: '20123456789' };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting(),
      { provide: AuthService, useValue: { getToken: () => token } }] });
    service = TestBed.inject(ElectronicDocumentService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  for (const payload of [null, {}, { content: null }, { content: [], items: [{ id: 9, saleId: 77 }] }, [{ id: 9 }], [{ id: 9, saleId: 78 }]]) {
    it('rejects an unverified sale-document response: ' + JSON.stringify(payload), () => {
      let failed = false;
      service.listBySaleId(77, createBoundAuthContext(token)).subscribe({ next: () => fail('Must not certify absence'), error: () => failed = true });
      const request = http.expectOne(r => r.url.endsWith('/billing/documents'));
      expect(request.request.method).toBe('GET'); request.flush(payload); expect(failed).toBeTrue();
    });
  }
  for (const payload of [[], { content: [] }, { items: [] }, { data: [] }]) {
    it('accepts a successful supported empty list: ' + JSON.stringify(payload), () => {
      let result: unknown;
      service.listBySaleId(77).subscribe(rows => result = rows);
      http.expectOne(r => r.url.endsWith('/billing/documents')).flush(payload); expect(result).toEqual([]);
    });
  }
  for (const bound of [false, true]) {
    it('preserves document creation without changing its contract, bound=' + bound, () => {
      const context = bound ? createBoundAuthContext(token) : undefined;
      service.createFromSale(77, payload, context).subscribe();
      const request = http.expectOne(r => r.url.endsWith('/billing/documents/from-sale/77'));
      expect(request.request.method).toBe('POST'); expect(request.request.body).toBe(payload);
      expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      if (context) expect(request.request.context).toBe(context);
      expect(JSON.stringify(request.request.body)).not.toContain(token); request.flush({ id: 901 });
    });
    it('propagates the recovery context through listBySaleId and filters without a POST, bound=' + bound, () => {
      const context = bound ? createBoundAuthContext(token) : undefined;
      service.listBySaleId(77, context).subscribe(rows => expect(rows.map(row => row.id)).toEqual([901]));
      const request = http.expectOne(r => r.url.endsWith('/billing/documents'));
      expect(request.request.method).toBe('GET'); expect(request.request.params.get('saleId')).toBe('77');
      expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      if (context) expect(request.request.context).toBe(context);
      request.flush([{ id: 901, saleId: 77 }, { id: 902, saleId: 78 }]);
    });
  }
});
