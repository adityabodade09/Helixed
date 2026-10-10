import type { AuthenticatedPrincipal } from '../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      principal?: AuthenticatedPrincipal;
      requestId: string;
    }
  }
}

export {};
