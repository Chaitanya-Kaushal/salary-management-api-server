import { z } from 'zod';

export const employmentTypeSchema = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR']);
export type EmploymentType = z.infer<typeof employmentTypeSchema>;

export const employeeFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().min(1).optional(),
  country: z.string().trim().min(1).optional(),
  jobTitle: z.string().trim().min(1).optional(),
  department: z.string().trim().min(1).optional(),
});

export type EmployeeFiltersInput = z.input<typeof employeeFiltersSchema>;
export type EmployeeFiltersData = z.output<typeof employeeFiltersSchema>;

export const employeeInputSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  jobTitle: z.string().trim().min(1, 'Job title is required'),
  department: z.string().trim().min(1, 'Department is required'),
  country: z.string().trim().length(2, 'Country must be a 2-letter code'),
  currency: z.string().trim().length(3, 'Currency must be a 3-letter code'),
  salary: z.number().int().nonnegative(),
  employmentType: employmentTypeSchema,
  hireDate: z.string().min(1, 'Hire date is required'),
});

export type EmployeeInputData = z.output<typeof employeeInputSchema>;
