import type { Employee } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type {
  EmployeeFilters,
  EmployeeInput,
  EmployeeListResult,
  EmployeeRepository,
} from './employee.repository.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export class InMemoryEmployeeRepository implements EmployeeRepository {
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
}
