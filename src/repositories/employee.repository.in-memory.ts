import type { Employee } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type {
  EmployeeFilters,
  EmployeeInput,
  EmployeeListResult,
  EmployeeRepository,
} from './employee.repository.js';
import {
  SALARY_BANDS,
  type ByCountryRow,
  type ByDepartmentRow,
  type ByEmploymentTypeRow,
  type ByJobTitleRow,
  type InsightsRepository,
  type InsightsSummary,
  type SalaryBand,
} from './insights.repository.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2)
    : (sorted[mid] as number);
}

function buildBands(salaries: number[]): SalaryBand[] {
  return SALARY_BANDS.map(({ label, max }, i) => {
    const lowerBound = i === 0 ? -Infinity : (SALARY_BANDS[i - 1] as { max: number }).max;
    const count = salaries.filter((s) => s >= lowerBound && s < max).length;
    return { label, count };
  });
}

function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = out.get(k);
    if (arr) arr.push(item);
    else out.set(k, [item]);
  }
  return out;
}

export class InMemoryEmployeeRepository implements EmployeeRepository, InsightsRepository {
  private readonly byId = new Map<string, Employee>();

  async list(filters: EmployeeFilters): Promise<EmployeeListResult> {
    const page = filters.page ?? DEFAULT_PAGE;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    let items = Array.from(this.byId.values());

    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (e) => e.fullName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q),
      );
    }
    if (filters.country) items = items.filter((e) => e.country === filters.country);
    if (filters.jobTitle) items = items.filter((e) => e.jobTitle === filters.jobTitle);
    if (filters.department) items = items.filter((e) => e.department === filters.department);

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = items.length;
    const start = (page - 1) * pageSize;
    return { data: items.slice(start, start + pageSize), total, page, pageSize };
  }

  async findById(id: string): Promise<Employee | null> {
    return this.byId.get(id) ?? null;
  }

  async create(input: EmployeeInput): Promise<Employee> {
    const now = new Date();
    const employee: Employee = {
      id: randomUUID(),
      fullName: input.fullName,
      email: input.email,
      jobTitle: input.jobTitle,
      department: input.department,
      country: input.country,
      currency: input.currency,
      salary: input.salary,
      employmentType: input.employmentType,
      hireDate: input.hireDate,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(employee.id, employee);
    return employee;
  }

  async update(id: string, input: EmployeeInput): Promise<Employee | null> {
    const existing = this.byId.get(id);
    if (!existing) return null;
    const updated: Employee = {
      ...existing,
      fullName: input.fullName,
      email: input.email,
      jobTitle: input.jobTitle,
      department: input.department,
      country: input.country,
      currency: input.currency,
      salary: input.salary,
      employmentType: input.employmentType,
      hireDate: input.hireDate,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.byId.delete(id);
  }

  private all(): Employee[] {
    return Array.from(this.byId.values());
  }

  async summary(): Promise<InsightsSummary> {
    const employees = this.all();
    const countryCounts = groupBy(employees, (e) => e.country);
    const titleCounts = groupBy(employees, (e) => e.jobTitle);

    const topCountries = Array.from(countryCounts.entries())
      .map(([country, list]) => ({ country, count: list.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topJobTitles = Array.from(titleCounts.entries())
      .map(([jobTitle, list]) => ({ jobTitle, count: list.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEmployees: employees.length,
      totalPayroll: employees.reduce((s, e) => s + e.salary, 0),
      topCountries,
      topJobTitles,
    };
  }

  async byCountry(): Promise<ByCountryRow[]> {
    const grouped = groupBy(this.all(), (e) => e.country);
    return Array.from(grouped.entries()).map(([country, list]) => {
      const salaries = list.map((e) => e.salary);
      return {
        country,
        currency: (list[0] as Employee).currency,
        count: list.length,
        min: Math.min(...salaries),
        max: Math.max(...salaries),
        avg: Math.round(salaries.reduce((s, v) => s + v, 0) / salaries.length),
        median: median(salaries),
        bands: buildBands(salaries),
      };
    });
  }

  async byJobTitle(country?: string): Promise<ByJobTitleRow[]> {
    const scoped = country ? this.all().filter((e) => e.country === country) : this.all();
    const grouped = groupBy(scoped, (e) => e.jobTitle);
    return Array.from(grouped.entries()).map(([jobTitle, list]) => ({
      jobTitle,
      count: list.length,
      avg: Math.round(list.reduce((s, e) => s + e.salary, 0) / list.length),
    }));
  }

  async byDepartment(): Promise<ByDepartmentRow[]> {
    const grouped = groupBy(this.all(), (e) => e.department);
    return Array.from(grouped.entries())
      .map(([department, list]) => ({ department, count: list.length }))
      .sort((a, b) => b.count - a.count);
  }

  async byEmploymentType(): Promise<ByEmploymentTypeRow[]> {
    const grouped = groupBy(this.all(), (e) => e.employmentType);
    return Array.from(grouped.entries())
      .map(([employmentType, list]) => ({ employmentType, count: list.length }))
      .sort((a, b) => b.count - a.count);
  }
}
