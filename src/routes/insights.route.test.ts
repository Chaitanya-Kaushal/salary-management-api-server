import bcryptjs from 'bcryptjs';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { InMemoryEmployeeRepository } from '../repositories/employee.repository.in-memory.js';
import { InMemoryHRUserRepository } from '../repositories/hr-user.repository.in-memory.js';
import type { EmployeeInput } from '../repositories/employee.repository.js';

type AppCtx = {
  app: Express;
  authCookie: string;
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
  const setCookie = loginRes.headers['set-cookie'];
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie as unknown as string];
  const auth = cookies.find((c) => c.startsWith('auth='));
  if (!auth) throw new Error('expected auth cookie from login');
  const authCookie = auth.split(';')[0] as string;

  return { app, authCookie, employeeRepository };
}

describe('GET /insights/summary', () => {
  it('returns total employees, total payroll, and top countries/job titles', async () => {
    const { app, authCookie, employeeRepository } = await setupAppWithAuth();
    await employeeRepository.create(makeEmployee({ email: 'a@e.com', country: 'US', jobTitle: 'Engineer', salary: 10_000_000 }));
    await employeeRepository.create(makeEmployee({ email: 'b@e.com', country: 'US', jobTitle: 'Manager', salary: 20_000_000 }));
    await employeeRepository.create(makeEmployee({ email: 'c@e.com', country: 'IN', jobTitle: 'Engineer', salary: 5_000_000 }));

    const res = await request(app).get('/insights/summary').set('Cookie', authCookie);

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
