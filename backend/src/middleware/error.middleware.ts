import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { AppError } from '../shared/errors/AppError.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
    const tooLarge = error.type === 'entity.too.large';
    response.status(tooLarge ? 413 : 400).json({
      code: tooLarge ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON',
      message: tooLarge ? 'Request body exceeds the size limit.' : 'Request body must be valid JSON.',
      requestId: request.requestId,
    });
    return;
  }
  if (error instanceof ZodError) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed.',
      details: error.issues,
      requestId: request.requestId,
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.status).json({
      code: error.code,
      message: error.message,
      details: error.details,
      requestId: request.requestId,
    });
    return;
  }

  logger.error({ error, requestId: request.requestId }, 'Unhandled request error');
  response.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred.',
    requestId: request.requestId,
  });
};
