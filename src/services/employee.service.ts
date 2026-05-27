import type { Employee } from '@prisma/client';
import { NotFoundError } from '../errors/index.js';
import type {
  EmployeeFilters,
  EmployeeInput,
  EmployeeListResult,
  EmployeeRepository,
} from '../repositories/employee.repository.js';

export class EmployeeService {
  constructor(private readonly repo: EmployeeRepository) {}

  list(filters: EmployeeFilters): Promise<EmployeeListResult> {
    return this.repo.list(filters);
  }

  async get(id: string): Promise<Employee> {
    const employee = await this.repo.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return employee;
  }

  create(input: EmployeeInput): Promise<Employee> {
    return this.repo.create(input);
  }

  async update(id: string, input: EmployeeInput): Promise<Employee> {
    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new NotFoundError('Employee not found');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new NotFoundError('Employee not found');
    }
  }
}
