import { Router } from 'express';
import { env } from '../../config/env.js';
import { rateLimit } from '../../middleware/rate-limit.middleware.js';
import { requireTrustedOrigin } from '../../middleware/trusted-origin.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { AppError } from '../../shared/errors/AppError.js';
import {
  clearRefreshTokenCookie,
  readRefreshToken,
  setRefreshTokenCookie,
} from './auth.cookies.js';
import { loginSchema } from './auth.schemas.js';
import type { AuthService } from './auth.service.js';
import { authenticateAccessToken } from './authentication.middleware.js';

export function createAuthRouter(authService: AuthService) {
  const router = Router();
  const loginRateLimit = rateLimit({
    limit: env.AUTH_RATE_LIMIT_MAX,
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    maxEntries: env.AUTH_RATE_LIMIT_MAX_ENTRIES,
  });
  const refreshRateLimit = rateLimit({
    limit: env.REFRESH_RATE_LIMIT_MAX,
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    maxEntries: env.AUTH_RATE_LIMIT_MAX_ENTRIES,
  });
  const authenticate = authenticateAccessToken((token) => authService.authenticate(token));

  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.post(
    '/login',
    loginRateLimit,
    requireTrustedOrigin,
    validate('body', loginSchema),
    async (request, response) => {
      const result = await authService.login(request.body.loginIdentifier, request.body.password);
      setRefreshTokenCookie(response, result.refreshToken, result.refreshTokenExpiresAt);
      response.status(200).json({ accessToken: result.accessToken, user: result.user });
    },
  );

  router.post('/refresh', refreshRateLimit, requireTrustedOrigin, async (request, response) => {
    const refreshToken = readRefreshToken(request);
    if (!refreshToken) {
      throw new AppError(401, 'INVALID_SESSION', 'The session is invalid or expired.');
    }

    const result = await authService.refresh(refreshToken);
    setRefreshTokenCookie(response, result.refreshToken, result.refreshTokenExpiresAt);
    response.status(200).json({ accessToken: result.accessToken, user: result.user });
  });

  router.post('/logout', requireTrustedOrigin, async (request, response) => {
    await authService.logout(readRefreshToken(request));
    clearRefreshTokenCookie(response);
    response.status(204).send();
  });

  router.post('/logout-all', requireTrustedOrigin, authenticate, async (request, response) => {
    await authService.logoutAll(request.principal!.userId);
    clearRefreshTokenCookie(response);
    response.status(204).send();
  });

  router.get('/me', authenticate, async (request, response) => {
    response.status(200).json({ user: await authService.getCurrentUser(request.principal!) });
  });

  return router;
}
