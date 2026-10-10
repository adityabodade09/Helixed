import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../shared/errors/AppError.js';

type RequestSource = 'body' | 'params' | 'query';

export function validate(source: RequestSource, schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      next(
        new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.', result.error.issues),
      );
      return;
    }

    request[source] = result.data;
    next();
  };
}
