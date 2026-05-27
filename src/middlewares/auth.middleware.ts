import type { RequestHandler } from 'express';
import { UnauthorizedError } from '../errors/index.js';
import type { HRUserRepository } from '../repositories/hr-user.repository.js';
import { asyncHandler } from '../utils/async-handler.util.js';
import { verifyAuthToken } from '../utils/jwt.util.js';

function extractBearer(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

export function isAuthenticated(hrUserRepository: HRUserRepository): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const token = extractBearer(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedError('Not signed in');
    }

    let payload;
    try {
      payload = verifyAuthToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const user = await hrUserRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    req.user = user;
    next();
  });
}
