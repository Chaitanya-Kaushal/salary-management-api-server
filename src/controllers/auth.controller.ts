import type { Request, Response } from 'express';
import { UnauthorizedError } from '../errors/index.js';
import type { AuthService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/async-handler.util.js';

function serializeUser(user: { id: string; email: string; name: string | null }) {
  return { id: user.id, email: user.email, name: user.name };
}

export function createAuthController(authService: AuthService) {
  return {
    login: asyncHandler(async (req: Request, res: Response) => {
      const { email, password } = req.body ?? {};
      const { token, user } = await authService.login(String(email), String(password));

      res.status(200).json({ token, user: serializeUser(user) });
    }),

    me: asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) {
        throw new UnauthorizedError('Not signed in');
      }
      res.json(serializeUser(req.user));
    }),

    logout: asyncHandler(async (_req: Request, res: Response) => {
      // Client clears its own token from storage. Stateless logout.
      res.status(204).send();
    }),
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
