import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';

export type AuthTokenPayload = {
  sub: string;
  email: string;
};

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, config.jwt.secret);
  if (typeof decoded === 'string' || !decoded || !('sub' in decoded) || !('email' in decoded)) {
    throw new Error('Invalid token payload');
  }
  return { sub: String(decoded.sub), email: String(decoded.email) };
}
