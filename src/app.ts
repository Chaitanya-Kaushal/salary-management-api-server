import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import { prisma } from './db/connection.js';
import type { HRUserRepository } from './repositories/hr-user.repository.js';
import { PrismaHRUserRepository } from './repositories/hr-user.repository.prisma.js';
import { createAuthRouter } from './routes/auth.route.js';
import { AuthService } from './services/auth.service.js';

export type AppDependencies = {
  hrUserRepository?: HRUserRepository;
};

export function createApp(deps: AppDependencies = {}): Express {
  const hrUserRepository = deps.hrUserRepository ?? new PrismaHRUserRepository(prisma);
  const authService = new AuthService(hrUserRepository);

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', createAuthRouter(authService, hrUserRepository));

  app.use(errorHandler);

  return app;
}
