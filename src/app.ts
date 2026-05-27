import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { config } from './config/index.js';
import { prisma } from './db/connection.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import type { EmployeeRepository } from './repositories/employee.repository.js';
import { PrismaEmployeeRepository } from './repositories/employee.repository.prisma.js';
import type { HRUserRepository } from './repositories/hr-user.repository.js';
import { PrismaHRUserRepository } from './repositories/hr-user.repository.prisma.js';
import type { InsightsRepository } from './repositories/insights.repository.js';
import { PrismaInsightsRepository } from './repositories/insights.repository.prisma.js';
import { createAuthRouter } from './routes/auth.route.js';
import { createEmployeesRouter } from './routes/employees.route.js';
import { createInsightsRouter } from './routes/insights.route.js';
import { AuthService } from './services/auth.service.js';
import { EmployeeService } from './services/employee.service.js';
import { InsightsService } from './services/insights.service.js';

export type AppDependencies = {
  hrUserRepository?: HRUserRepository;
  employeeRepository?: EmployeeRepository;
  insightsRepository?: InsightsRepository;
};

function isInsightsRepository(
  obj: EmployeeRepository | InsightsRepository,
): obj is InsightsRepository {
  return typeof (obj as InsightsRepository).summary === 'function';
}

export function createApp(deps: AppDependencies = {}): Express {
  const hrUserRepository = deps.hrUserRepository ?? new PrismaHRUserRepository(prisma);
  const employeeRepository = deps.employeeRepository ?? new PrismaEmployeeRepository(prisma);
  const insightsRepository =
    deps.insightsRepository ??
    (isInsightsRepository(employeeRepository)
      ? employeeRepository
      : new PrismaInsightsRepository(prisma));

  const authService = new AuthService(hrUserRepository);
  const employeeService = new EmployeeService(employeeRepository);
  const insightsService = new InsightsService(insightsRepository);

  const app = express();
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', createAuthRouter(authService, hrUserRepository));
  app.use('/employees', createEmployeesRouter(employeeService, hrUserRepository));
  app.use('/insights', createInsightsRouter(insightsService, hrUserRepository));

  app.use(errorHandler);

  return app;
}
