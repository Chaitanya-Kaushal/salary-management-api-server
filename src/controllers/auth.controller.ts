import type { Request, Response } from 'express';
import { isProduction } from '../config/index.js';
import { UnauthorizedError } from '../errors/index.js';
import type { AuthService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/async-handler.util.js';

const AUTH_COOKIE_NAME = 'auth';
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProduction,
};

export function createAuthController(authService: AuthService) {
  return {
    login: asyncHandler(async (req: Request, res: Response) => {
      const { email, password } = req.body ?? {};
      const { token } = await authService.login(String(email), String(password));

      res
        .cookie(AUTH_COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: AUTH_COOKIE_MAX_AGE_MS,
        })
        .status(204)
        .send();
    }),

    me: asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) {
        throw new UnauthorizedError('Not signed in');
      }
      const { id, email, name } = req.user;
      res.json({ id, email, name });
    }),

    logout: asyncHandler(async (_req: Request, res: Response) => {
      res.clearCookie(AUTH_COOKIE_NAME, cookieOptions).status(204).send();
    }),
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
