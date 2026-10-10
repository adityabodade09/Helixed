import type { RequestHandler } from 'express';
import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from './auth.types.js';

type TokenAuthenticator = (token: string) => Promise<AuthenticatedPrincipal>;

export function authenticateAccessToken(authenticate: TokenAuthenticator): RequestHandler {
  return async (request, _response, next) => {
    const authorization = request.header('authorization');
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'A valid access token is required.'));
      return;
    }

    try {
      request.principal = await authenticate(token);
      next();
    } catch {
      next(new AppError(401, 'INVALID_ACCESS_TOKEN', 'The access token is invalid or expired.'));
    }
  };
}
