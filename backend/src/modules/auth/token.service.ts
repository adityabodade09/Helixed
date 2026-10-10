import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { env } from '../../config/env.js';

const encoder = new TextEncoder();
const secret = encoder.encode(env.ACCESS_TOKEN_SECRET);

const claimsSchema = z.object({
  sub: z.string().min(1),
  sid: z.string().min(1),
});

export interface AccessTokenIdentity {
  userId: string;
  sessionId: string;
}

export async function signAccessToken(identity: AccessTokenIdentity): Promise<string> {
  return new SignJWT({ sid: identity.sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(identity.userId)
    .setIssuer(env.ACCESS_TOKEN_ISSUER)
    .setAudience(env.ACCESS_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenIdentity> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
    issuer: env.ACCESS_TOKEN_ISSUER,
    audience: env.ACCESS_TOKEN_AUDIENCE,
  });
  const claims = claimsSchema.parse(payload);
  return { userId: claims.sub, sessionId: claims.sid };
}
