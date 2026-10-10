import type { Request, RequestHandler } from 'express';
import { AppError } from '../../shared/errors/AppError.js';
import type { AuthorizationService } from './authorization.service.js';
import type { AuthorizationRequest } from './authorization.types.js';

type RequestResolver = (request: Request) => AuthorizationRequest;

export function authorize(
  authorization: AuthorizationService,
  resolveRequest: RequestResolver,
): RequestHandler {
  return async (request, _response, next) => {
    if (!request.principal) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.'));
      return;
    }

    const decision = await authorization.can(request.principal, resolveRequest(request));
    if (!decision.allowed) {
      next(new AppError(403, 'FORBIDDEN', 'You are not authorized to perform this action.'));
      return;
    }

    next();
  };
}
