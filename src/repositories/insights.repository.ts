import type { EmploymentType } from '@prisma/client';

export type InsightsSummary = {
  totalEmployees: number;
  totalPayroll: number;
  topCountries: { country: string; count: number }[];
  topJobTitles: { jobTitle: string; count: number }[];
};

export type SalaryBand = {
  label: string;
  count: number;
};

export type ByCountryRow = {
  country: string;
  currency: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  bands: SalaryBand[];
};

export type ByJobTitleRow = {
  jobTitle: string;
  count: number;
  avg: number;
};

export type ByDepartmentRow = {
  department: string;
  count: number;
};

export type ByEmploymentTypeRow = {
  employmentType: EmploymentType;
  count: number;
};

export interface InsightsRepository {
  summary(): Promise<InsightsSummary>;
  byCountry(): Promise<ByCountryRow[]>;
  byJobTitle(country?: string): Promise<ByJobTitleRow[]>;
  byDepartment(): Promise<ByDepartmentRow[]>;
  byEmploymentType(): Promise<ByEmploymentTypeRow[]>;
}

export const SALARY_BANDS: { label: string; max: number }[] = [
  { label: '< 50k', max: 50_000_00 },
  { label: '50k–100k', max: 100_000_00 },
  { label: '100k–200k', max: 200_000_00 },
  { label: '> 200k', max: Number.POSITIVE_INFINITY },
];
