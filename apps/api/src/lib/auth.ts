import bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a secret of at least 32 characters');
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JWTPayload {
  [key: string]: unknown;
  sub: string;
  email: string;
  name?: string | null;
  exp: number;
  iat: number;
}

export async function createToken(user: { id: string; email: string; name?: string | null }): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24 * 7; // 7 days expiration

  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    iat,
    exp,
  };

  return sign(payload, getJwtSecret(), 'HS256');
}

export async function verifyAuthToken(token: string): Promise<JWTPayload | null> {
  try {
    const payload = await verify(token, getJwtSecret(), 'HS256');
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
