import type { Request, Response } from 'express';
import { env } from '../../config/env.js';

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
};

export function readRefreshToken(request: Request): string | undefined {
  const cookieHeader = request.header('cookie');
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name === env.REFRESH_TOKEN_COOKIE_NAME) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function setRefreshTokenCookie(response: Response, token: string, expiresAt: Date): void {
  response.cookie(env.REFRESH_TOKEN_COOKIE_NAME, token, { ...cookieOptions, expires: expiresAt });
}

export function clearRefreshTokenCookie(response: Response): void {
  response.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, cookieOptions);
}
