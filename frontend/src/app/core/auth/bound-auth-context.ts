import { HttpContext, HttpContextToken } from '@angular/common/http';

interface BoundCredentials {
  readonly token: string;
}

// In-memory HTTP metadata only. Never add this context to a business payload or draft.
export const BOUND_AUTH_CREDENTIALS = new HttpContextToken<Readonly<BoundCredentials> | null>(() => null);

export class BoundAuthSessionError extends Error {
  constructor() {
    super('La sesión cambió o no pudo verificarse. Restablece una sesión válida del usuario original para recuperar la misma operación.');
    this.name = 'BoundAuthSessionError';
  }
}

export function createBoundAuthContext(token: string | null): HttpContext {
  if (!token || token !== token.trim() || /[\r\n]/.test(token)) {
    throw new BoundAuthSessionError();
  }
  return new HttpContext().set(BOUND_AUTH_CREDENTIALS, Object.freeze({ token }));
}
