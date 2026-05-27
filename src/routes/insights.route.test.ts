import bcryptjs from 'bcryptjs';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { InMemoryEmployeeRepository } from '../repositories/employee.repository.in-memory.js';
import { InMemoryHRUserRepository } from '../repositories/hr-user.repository.in-memory.js';
import type { EmployeeInput } from '../repositories/employee.repository.js';

type AppCtx = {
  app: Express;
  authHeader: string;
  employeeRepository: InMemoryEmployeeRepository;
};

function makeEmployee(overrides: Partial<EmployeeInput> = {}): EmployeeInput {
  return {
    fullName: 'Alice Anderson',
    email: 'alice@example.com',
    jobTitle: 'Engineer',
    department: 'Engineering',
    country: 'US',
    currency: 'USD',
    salary: 12_000_000,
    employmentType: 'FULL_TIME',
    hireDate: new Date('2024-01-01'),
    ...overrides,
  };
}

async function setupAppWithAuth(): Promise<AppCtx> {
  const hrUserRepository = new InMemoryHRUserRepository();
  const passwordHash = await bcryptjs.hash('password', 10);
  await hrUserRepository.create({
    email: 'hr@corp.example',
    passwordHash,
    name: 'HR Manager',
  });

  const employeeRepository = new InMemoryEmployeeRepository();
  const app = createApp({ hrUserRepository, employeeRepository });

  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: 'hr@corp.example', password: 'password' });
  const token = loginRes.body.token as string;
  if (!token) throw new Error('expected token from login');
  const authHeader = `Bearer ${token}`;

  return { app, authHeader, employeeRepository };
}

describe('GET /insights/summary', () => {
  it('returns total employees, total payroll, and top countries/job titles', async () => {
    const { app, authHeader, employeeRepository } = await setupAppWithAuth();
    await employeeRepository.create(
      makeEmployee({ email: 'a@e.com', country: 'US', jobTitle: 'Engineer', salary: 10_000_000 }),
    );
    await employeeRepository.create(
      makeEmployee({ email: 'b@e.com', country: 'US', jobTitle: 'Manager', salary: 20_000_000 }),
    );
    await employeeRepository.create(
      makeEmployee({ email: 'c@e.com', country: 'IN', jobTitle: 'Engineer', salary: 5_000_000 }),
    );

    const res = await request(app).get('/insights/summary').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.totalEmployees).toBe(3);
    expect(res.body.totalPayroll).toBe(35_000_000);
    expect(res.body.topCountries[0]).toEqual({ country: 'US', count: 2 });
    expect(res.body.topJobTitles[0]).toEqual({ jobTitle: 'Engineer', count: 2 });
  });

  it('returns 401 without auth', async () => {
    const { app } = await setupAppWithAuth();
    const res = await request(app).get('/insights/summary');
    expect(res.status).toBe(401);
  });
});

describe('GET /insights/by-country', () => {
  it('returns min/max/avg/median per country with currency and bands', async () => {
    const { app, authHeader, employeeRepository } = await setupAppWithAuth();
    await employeeRepository.create(
      makeEmployee({ email: 'a@e.com', country: 'US', currency: 'USD', salary: 10_000_000 }),
    );
    await employeeRepository.create(
      makeEmployee({ email: 'b@e.com', country: 'US', currency: 'USD', salary: 30_000_000 }),
    );
    await employeeRepository.create(
      makeEmployee({ email: 'c@e.com', country: 'IN', currency: 'INR', salary: 5_000_000 }),
    );

    const res = await request(app).get('/insights/by-country').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    const usRow = res.body.find((r: { country: string }) => r.country === 'US');
    expect(usRow).toMatchObject({
      currency: 'USD',
      count: 2,
      min: 10_000_000,
      max: 30_000_000,
      avg: 20_000_000,
    });
    expect(Array.isArray(usRow.bands)).toBe(true);
  });
});

describe('GET /insights/by-job-title', () => {
  it('returns avg per job title, optionally scoped by country', async () => {
    const { app, authHeader, employeeRepository } = await setupAppWithAuth();
    await employeeRepository.create(
      makeEmployee({ email: 'a@e.com', jobTitle: 'Engineer', country: 'US', salary: 10_000_000 }),
    );
    await employeeRepository.create(
      makeEmployee({ email: 'b@e.com', jobTitle: 'Manager', country: 'US', salary: 30_000_000 }),
    );
    await employeeRepository.create(
      makeEmployee({ email: 'c@e.com', jobTitle: 'Engineer', country: 'IN', salary: 5_000_000 }),
    );

    const all = await request(app).get('/insights/by-job-title').set('Authorization', authHeader);
    expect(all.status).toBe(200);
    const engineerAll = all.body.find((r: { jobTitle: string }) => r.jobTitle === 'Engineer');
    expect(engineerAll).toMatchObject({ count: 2, avg: 7_500_000 });

    const us = await request(app)
      .get('/insights/by-job-title')
      .query({ country: 'US' })
      .set('Authorization', authHeader);
    const engineerUs = us.body.find((r: { jobTitle: string }) => r.jobTitle === 'Engineer');
    expect(engineerUs).toMatchObject({ count: 1, avg: 10_000_000 });
  });
});

describe('GET /insights/by-department', () => {
  it('returns headcount per department', async () => {
    const { app, authHeader, employeeRepository } = await setupAppWithAuth();
    await employeeRepository.create(makeEmployee({ email: 'a@e.com', department: 'Engineering' }));
    await employeeRepository.create(makeEmployee({ email: 'b@e.com', department: 'Engineering' }));
    await employeeRepository.create(makeEmployee({ email: 'c@e.com', department: 'Sales' }));

    const res = await request(app).get('/insights/by-department').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toContainEqual({ department: 'Engineering', count: 2 });
    expect(res.body).toContainEqual({ department: 'Sales', count: 1 });
  });
});

describe('GET /insights/by-employment-type', () => {
  it('returns headcount per employment type', async () => {
    const { app, authHeader, employeeRepository } = await setupAppWithAuth();
    await employeeRepository.create(
      makeEmployee({ email: 'a@e.com', employmentType: 'FULL_TIME' }),
    );
    await employeeRepository.create(
      makeEmployee({ email: 'b@e.com', employmentType: 'FULL_TIME' }),
    );
    await employeeRepository.create(
      makeEmployee({ email: 'c@e.com', employmentType: 'CONTRACTOR' }),
    );

    const res = await request(app)
      .get('/insights/by-employment-type')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toContainEqual({ employmentType: 'FULL_TIME', count: 2 });
    expect(res.body).toContainEqual({ employmentType: 'CONTRACTOR', count: 1 });
  });
});
