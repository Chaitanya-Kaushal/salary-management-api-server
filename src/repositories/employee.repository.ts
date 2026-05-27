import type { Employee, EmploymentType } from '@prisma/client';

export type EmployeeFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  country?: string;
  jobTitle?: string;
  department?: string;
};

export type EmployeeListResult = {
  data: Employee[];
  total: number;
  page: number;
  pageSize: number;
};

export type EmployeeInput = {
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  country: string;
  currency: string;
  salary: number;
  employmentType: EmploymentType;
  hireDate: Date;
};

export interface EmployeeRepository {
  list(filters: EmployeeFilters): Promise<EmployeeListResult>;
  findById(id: string): Promise<Employee | null>;
  create(input: EmployeeInput): Promise<Employee>;
  update(id: string, input: EmployeeInput): Promise<Employee | null>;
  delete(id: string): Promise<boolean>;
}
