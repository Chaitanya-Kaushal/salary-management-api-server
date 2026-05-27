import { Router } from 'express';
import { createInsightsController } from '../controllers/insights.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import type { HRUserRepository } from '../repositories/hr-user.repository.js';
import type { InsightsService } from '../services/insights.service.js';

export function createInsightsRouter(
  insightsService: InsightsService,
  hrUserRepository: HRUserRepository,
): Router {
  const router = Router();
  const controller = createInsightsController(insightsService);

  router.use(isAuthenticated(hrUserRepository));

  router.get('/summary', controller.summary);
  router.get('/by-country', controller.byCountry);
  router.get('/by-job-title', controller.byJobTitle);
  router.get('/by-department', controller.byDepartment);
  router.get('/by-employment-type', controller.byEmploymentType);

  return router;
}
