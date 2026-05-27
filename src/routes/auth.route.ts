import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { createLoginRateLimiter } from '../middlewares/rate-limit.middleware.js';
import type { HRUserRepository } from '../repositories/hr-user.repository.js';
import type { AuthService } from '../services/auth.service.js';

export function createAuthRouter(
  authService: AuthService,
  hrUserRepository: HRUserRepository,
): Router {
  const router = Router();
  const controller = createAuthController(authService);
  const requireAuth = isAuthenticated(hrUserRepository);
  const loginRateLimiter = createLoginRateLimiter();

  router.post('/login', loginRateLimiter, controller.login);
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth, controller.me);

  return router;
}
