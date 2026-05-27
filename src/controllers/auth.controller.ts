import type { Request, Response } from 'express';
import { isProduction } from '../config/index.js';
import type { AuthService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/async-handler.util.js';

const AUTH_COOKIE_NAME = 'auth';
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function createAuthController(authService: AuthService) {
  return {
    login: asyncHandler(async (req: Request, res: Response) => {
      const { email, password } = req.body ?? {};
      const { token } = await authService.login(String(email), String(password));

      res
        .cookie(AUTH_COOKIE_NAME, token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: isProduction,
          maxAge: AUTH_COOKIE_MAX_AGE_MS,
        })
        .status(204)
        .send();
    }),
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
