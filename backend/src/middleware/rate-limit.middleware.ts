import type { RequestHandler } from 'express';
import { AppError } from '../shared/errors/AppError.js';

interface RateLimitOptions {
  limit: number;
  windowMs: number;
  maxEntries?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function rateLimit({ limit, windowMs, maxEntries = 10_000 }: RateLimitOptions): RequestHandler {
  const entries = new Map<string, RateLimitEntry>();
  let nextCleanupAt = 0;

  return (request, response, next) => {
    const now = Date.now();
    if (now >= nextCleanupAt) {
      for (const [key, entry] of entries) {
        if (entry.resetAt <= now) entries.delete(key);
      }
      nextCleanupAt = now + Math.min(windowMs, 60_000);
    }
    const key = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const current = entries.get(key);
    if (!current && entries.size >= maxEntries) {
      response.setHeader('Retry-After', Math.max(1, Math.ceil((nextCleanupAt - now) / 1000)));
      next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Try again later.'));
      return;
    }
    const entry =
      !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    entry.count = Math.min(entry.count + 1, limit + 1);
    entries.set(key, entry);

    response.setHeader('RateLimit-Limit', limit);
    response.setHeader('RateLimit-Remaining', Math.max(0, limit - entry.count));
    response.setHeader('RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > limit) {
      response.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      next(new AppError(429, 'RATE_LIMITED', 'Too many authentication attempts. Try again later.'));
      return;
    }

    next();
  };
}
