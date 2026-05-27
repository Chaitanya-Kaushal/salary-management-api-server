import type { Employee } from '@prisma/client';
import type { Request, Response } from 'express';
import { employeeFiltersSchema, employeeInputSchema } from '../contract/employee.js';
import { BadRequestError } from '../errors/index.js';
import type { EmployeeService } from '../services/employee.service.js';
import { asyncHandler } from '../utils/async-handler.util.js';

function serializeEmployee(e: Employee) {
  return {
    id: e.id,
    fullName: e.fullName,
    email: e.email,
    jobTitle: e.jobTitle,
    department: e.department,
    country: e.country,
    currency: e.currency,
    salary: e.salary,
    employmentType: e.employmentType,
    hireDate: e.hireDate.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function firstIssueMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? 'Invalid input';
}

export function createEmployeesController(employeeService: EmployeeService) {
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      const parsed = employeeFiltersSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new BadRequestError(firstIssueMessage(parsed.error));
      }
      const result = await employeeService.list(parsed.data);
      res.json({
        data: result.data.map(serializeEmployee),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      });
    }),

    get: asyncHandler(async (req: Request, res: Response) => {
      const employee = await employeeService.get(String(req.params.id));
      res.json(serializeEmployee(employee));
    }),

    create: asyncHandler(async (req: Request, res: Response) => {
      const parsed = employeeInputSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(firstIssueMessage(parsed.error));
      }
      const employee = await employeeService.create({
        ...parsed.data,
        hireDate: new Date(parsed.data.hireDate),
      });
      res.status(201).json(serializeEmployee(employee));
    }),

    update: asyncHandler(async (req: Request, res: Response) => {
      const parsed = employeeInputSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(firstIssueMessage(parsed.error));
      }
      const employee = await employeeService.update(String(req.params.id), {
        ...parsed.data,
        hireDate: new Date(parsed.data.hireDate),
      });
      res.json(serializeEmployee(employee));
    }),

    delete: asyncHandler(async (req: Request, res: Response) => {
      await employeeService.delete(String(req.params.id));
      res.status(204).send();
    }),
  };
}

export type EmployeesController = ReturnType<typeof createEmployeesController>;
