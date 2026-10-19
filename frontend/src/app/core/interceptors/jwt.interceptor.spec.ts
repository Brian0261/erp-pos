import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { BOUND_AUTH_CREDENTIALS, BoundAuthSessionError, createBoundAuthContext } from '../auth/bound-auth-context';
import { jwtInterceptor } from './jwt.interceptor';

describe('JWT request-bound credentials', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let readToken: jasmine.Spy;
  const original = 'synthetic-original-credential';
  const replacement = 'synthetic-replacement-credential';

  beforeEach(() => {
    readToken = jasmine.createSpy('getToken').and.returnValue(original);
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting(),
      { provide: AuthService, useValue: { getToken: readToken } },
    ] });
    client = TestBed.inject(HttpClient); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('preserves normal authentication when no context is supplied', () => {
    client.get('/ordinary').subscribe();
    const request = http.expectOne('/ordinary');
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${original}`);
    request.flush({});
  });
  it('preserves the ordinary unauthenticated path without an opt-in context', () => {
    readToken.and.returnValue(null); client.get('/ordinary').subscribe();
    const request = http.expectOne('/ordinary');
    expect(request.request.headers.has('Authorization')).toBeFalse(); request.flush({});
  });
  it('uses only the pinned credential and never an independently supplied header', () => {
    const context = createBoundAuthContext(original);
    client.post('/sensitive', {}, { context, headers: { Authorization: `Bearer ${replacement}` } }).subscribe();
    const request = http.expectOne('/sensitive');
    expect(request.request.context).toBe(context);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${original}`);
    expect(Object.isFrozen(context.get(BOUND_AUTH_CREDENTIALS))).toBeTrue(); request.flush({});
  });
  for (const current of [replacement, null]) {
    it('blocks a substituted or removed session without a fallback or network dispatch: ' + (current === null ? 'removed' : 'substituted'), () => {
      const context = createBoundAuthContext(original); readToken.and.returnValue(current);
      let failure: unknown;
      client.post('/sensitive', {}, { context }).subscribe({ error: error => failure = error });
      http.expectNone('/sensitive'); expect(failure instanceof BoundAuthSessionError).toBeTrue();
      expect(String(failure)).not.toContain(original); expect(String(failure)).not.toContain(replacement);
      expect(JSON.stringify(failure)).not.toContain(original);
    });
  }
  for (const credentials of [null, { token: '' }, { token: 'invalid\r\ncredential' }]) {
    it('rejects an invalid opt-in context instead of using the current session', () => {
      const context = new HttpContext().set(BOUND_AUTH_CREDENTIALS, credentials);
      let failure: unknown;
      client.get('/sensitive', { context }).subscribe({ error: error => failure = error });
      http.expectNone('/sensitive'); expect(failure instanceof BoundAuthSessionError).toBeTrue();
    });
  }
  it('fails closed when current credentials cannot be read', () => {
    readToken.and.throwError('Synthetic inaccessible storage'); let failure: unknown;
    client.get('/sensitive', { context: createBoundAuthContext(original) }).subscribe({ error: error => failure = error });
    http.expectNone('/sensitive'); expect(failure instanceof BoundAuthSessionError).toBeTrue();
    expect(String(failure)).not.toContain('Synthetic inaccessible storage');
  });
  it('cannot switch the outgoing actor if storage changes at the final credential read', () => {
    readToken.and.callFake(() => { readToken.and.returnValue(replacement); return original; });
    client.post('/sensitive', {}, { context: createBoundAuthContext(original) }).subscribe();
    const request = http.expectOne('/sensitive');
    expect(readToken()).toBe(replacement);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${original}`);
    request.flush({});
  });
  it('does not mutate an already dispatched request after a session change', () => {
    client.post('/sensitive', {}, { context: createBoundAuthContext(original) }).subscribe();
    const request = http.expectOne('/sensitive'); readToken.and.returnValue(replacement);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${original}`); request.flush({});
  });
});
