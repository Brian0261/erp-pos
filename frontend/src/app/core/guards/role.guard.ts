import { inject } from "@angular/core";
import { CanActivateChildFn, Router } from "@angular/router";
import { catchError, map, of } from "rxjs";

import { AuthService } from "../auth/auth.service";

export const roleGuard: CanActivateChildFn = (childRoute) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(["/login"]);
  }

  const allowedRoles = childRoute.data?.["allowedRoles"] as
    | string[]
    | undefined;
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return authService.me().pipe(
    map((profile) => {
      const hasAllowedRole = profile.roles.some((role) =>
        allowedRoles.includes(role),
      );
      return hasAllowedRole ? true : router.createUrlTree(["/dashboard"]);
    }),
    catchError(() => {
      authService.logout();
      return of(router.createUrlTree(["/login"]));
    }),
  );
};
