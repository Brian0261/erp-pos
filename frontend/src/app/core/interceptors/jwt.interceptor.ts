import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
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

