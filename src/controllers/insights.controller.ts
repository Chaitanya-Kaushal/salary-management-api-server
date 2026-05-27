import type { Request, Response } from 'express';
import type { InsightsService } from '../services/insights.service.js';
import { asyncHandler } from '../utils/async-handler.util.js';

export function createInsightsController(insightsService: InsightsService) {
  return {
    summary: asyncHandler(async (_req: Request, res: Response) => {
      const summary = await insightsService.summary();
      res.json(summary);
    }),

    byCountry: asyncHandler(async (_req: Request, res: Response) => {
      const rows = await insightsService.byCountry();
      res.json(rows);
    }),

    byJobTitle: asyncHandler(async (req: Request, res: Response) => {
      const country = typeof req.query.country === 'string' ? req.query.country : undefined;
      const rows = await insightsService.byJobTitle(country);
      res.json(rows);
    }),

    byDepartment: asyncHandler(async (_req: Request, res: Response) => {
      const rows = await insightsService.byDepartment();
      res.json(rows);
    }),

    byEmploymentType: asyncHandler(async (_req: Request, res: Response) => {
      const rows = await insightsService.byEmploymentType();
      res.json(rows);
    }),
  };
}

export type InsightsController = ReturnType<typeof createInsightsController>;
