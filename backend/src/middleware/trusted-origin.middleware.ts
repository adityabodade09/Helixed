import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../shared/errors/AppError.js';

export const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.header('origin');
  if (origin && origin !== env.CORS_ORIGIN) {
    next(new AppError(403, 'UNTRUSTED_ORIGIN', 'The request origin is not allowed.'));
    return;
  }
  next();
};
