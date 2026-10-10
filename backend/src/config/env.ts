import 'dotenv/config';
import { isIP } from 'node:net';
import { z } from 'zod';

const durationPattern = /^\d+(s|m|h|d)$/;

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().url(),
  TRUST_PROXY: z.string().default('false').transform((value, context) => {
    if (value === 'false') return false as const;
    const addresses = value.split(',').map((address) => address.trim());
    if (addresses.some((address) => {
      const [ip, prefix, extra] = address.split('/');
      const version = isIP(ip ?? '');
      return !version || extra !== undefined || (prefix !== undefined &&
        (!/^\d+$/.test(prefix) || Number(prefix) < 1 || Number(prefix) > (version === 4 ? 32 : 128)));
    })) {
      context.addIssue({ code: 'custom', message: 'Use false or explicit trusted proxy IPs/CIDRs (no blanket trust or hop counts).' });
      return z.NEVER;
    }
    return addresses;
  }),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().regex(durationPattern).default('15m'),
  ACCESS_TOKEN_ISSUER: z.string().min(1).default('helixed-api'),
  ACCESS_TOKEN_AUDIENCE: z.string().min(1).default('helixed-web'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  REFRESH_TOKEN_COOKIE_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .default('helixed_refresh'),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  REFRESH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_MAX_ENTRIES: z.coerce.number().int().positive().max(100_000).default(10_000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
}).superRefine((value, context) => {
  if (value.NODE_ENV !== 'production') return;
  const origin = new URL(value.CORS_ORIGIN);
  if (origin.protocol !== 'https:' || origin.origin !== value.CORS_ORIGIN) {
    context.addIssue({ code: 'custom', path: ['CORS_ORIGIN'], message: 'Production CORS_ORIGIN must be an exact HTTPS origin without a path.' });
  }
  if (/replace|change.?me|placeholder|example|test.secret|development|demo|your.secret/i.test(value.ACCESS_TOKEN_SECRET) ||
      new Set(value.ACCESS_TOKEN_SECRET).size < 8) {
    context.addIssue({ code: 'custom', path: ['ACCESS_TOKEN_SECRET'], message: 'Production requires a randomly generated secret, not a placeholder.' });
  }
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  throw new Error(`Invalid environment configuration: ${z.prettifyError(result.error)}`);
}

export const env = Object.freeze(result.data);
