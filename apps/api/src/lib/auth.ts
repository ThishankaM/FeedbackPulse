import bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'feedbackpulse-super-secret-jwt-key-2026';

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

  return sign(payload, JWT_SECRET, 'HS256');
}

export async function verifyAuthToken(token: string): Promise<JWTPayload | null> {
  try {
    const payload = await verify(token, JWT_SECRET, 'HS256');
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
