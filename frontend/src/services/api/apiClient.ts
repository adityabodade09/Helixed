import { env } from '../../config/env';
import { ApiError } from './ApiError';

interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  accessToken?: string | null;
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const { accessToken, body, headers, ...requestOptions } = options;
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data: unknown = response.status === 204 ? undefined : await response.json();
  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data && typeof data.message === 'string'
        ? data.message
        : 'Request failed.';
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}
