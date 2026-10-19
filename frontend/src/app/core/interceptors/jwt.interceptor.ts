import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { BOUND_AUTH_CREDENTIALS, BoundAuthSessionError } from '../auth/bound-auth-context';

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);

  if (request.context.has(BOUND_AUTH_CREDENTIALS)) {
    const credentials = request.context.get(BOUND_AUTH_CREDENTIALS);
    let currentToken: string | null;
    try {
      currentToken = authService.getToken();
    } catch {
      return throwError(() => new BoundAuthSessionError());
    }
    if (!credentials || typeof credentials.token !== 'string' || !credentials.token
        || credentials.token !== credentials.token.trim() || /[\r\n]/.test(credentials.token)
        || credentials.token !== currentToken) {
      return throwError(() => new BoundAuthSessionError());
    }
    // A later storage change cannot replace the credential already bound to this request.
    return next(request.clone({ setHeaders: { Authorization: `Bearer ${credentials.token}` } }));
  }

  const token = authService.getToken();

  if (!token) {
    return next(request);
  }

  const authRequest = request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authRequest);
};

