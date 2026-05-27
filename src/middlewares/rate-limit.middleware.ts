import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

export function createLoginRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { errors: [{ message: 'Too many login attempts. Please try again later.' }] },
  });
}
