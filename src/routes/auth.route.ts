import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import { loginRateLimiter } from '../middlewares/rate-limit.middleware.js';
import type { AuthService } from '../services/auth.service.js';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const controller = createAuthController(authService);

  router.post('/login', loginRateLimiter, controller.login);

  return router;
}
