import type { Employee, Prisma, PrismaClient } from '@prisma/client';
import type {
  EmployeeFilters,
  EmployeeInput,
  EmployeeListResult,
  EmployeeRepository,
} from './employee.repository.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private readonly client: PrismaClient) {}

  async list(filters: EmployeeFilters): Promise<EmployeeListResult> {
    const page = filters.page ?? DEFAULT_PAGE;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

    const where: Prisma.EmployeeWhereInput = {};
    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.country) where.country = filters.country;
    if (filters.jobTitle) where.jobTitle = filters.jobTitle;
    if (filters.department) where.department = filters.department;

    const [data, total] = await this.client.$transaction([
      this.client.employee.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.client.employee.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findById(id: string): Promise<Employee | null> {
    return this.client.employee.findUnique({ where: { id } });
  }

  async create(input: EmployeeInput): Promise<Employee> {
    return this.client.employee.create({ data: input });
  }

  async update(id: string, input: EmployeeInput): Promise<Employee | null> {
    try {
      return await this.client.employee.update({ where: { id }, data: input });
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.client.employee.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
