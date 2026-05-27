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

const sampleInput: EmployeeInput = {
  fullName: 'Alice Anderson',
  email: 'alice@example.com',
  jobTitle: 'Engineer',
  department: 'Engineering',
  country: 'US',
  currency: 'USD',
  salary: 12_000_000,
  employmentType: 'FULL_TIME',
  hireDate: new Date('2024-01-01'),
};

function sampleBody(
  overrides: Partial<Omit<EmployeeInput, 'hireDate'>> & { hireDate?: string } = {},
) {
  return {
    fullName: 'Alice Anderson',
    email: 'alice@example.com',
    jobTitle: 'Engineer',
    department: 'Engineering',
    country: 'US',
    currency: 'USD',
    salary: 12_000_000,
    employmentType: 'FULL_TIME' as const,
    hireDate: '2024-01-01',
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

describe('GET /employees', () => {
  it('returns an empty page when no employees exist', async () => {
    const { app, authCookie } = await setupAppWithAuth();

    const res = await request(app).get('/employees').set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], total: 0, page: 1, pageSize: 10 });
  });

  it('returns 401 without auth cookie', async () => {
    const { app } = await setupAppWithAuth();

    const res = await request(app).get('/employees');

    expect(res.status).toBe(401);
  });

  it('returns seeded employees', async () => {
    const { app, authCookie, employeeRepository } = await setupAppWithAuth();
    await employeeRepository.create(sampleInput);
    await employeeRepository.create({
      ...sampleInput,
      email: 'bob@example.com',
      fullName: 'Bob Brown',
    });

    const res = await request(app).get('/employees').set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.data).toHaveLength(2);
  });

  it('filters by search across name and email', async () => {
    const { app, authCookie, employeeRepository } = await setupAppWithAuth();
    await employeeRepository.create(sampleInput);
    await employeeRepository.create({
      ...sampleInput,
      email: 'bob@example.com',
      fullName: 'Bob Brown',
    });

    const res = await request(app)
      .get('/employees')
      .query({ search: 'alice' })
      .set('Cookie', authCookie);

    expect(res.body.total).toBe(1);
    expect(res.body.data[0].fullName).toBe('Alice Anderson');
  });

  it('filters by country', async () => {
    const { app, authCookie, employeeRepository } = await setupAppWithAuth();
    await employeeRepository.create(sampleInput);
    await employeeRepository.create({
      ...sampleInput,
      email: 'in@example.com',
      country: 'IN',
    });

    const res = await request(app)
      .get('/employees')
      .query({ country: 'IN' })
      .set('Cookie', authCookie);

    expect(res.body.total).toBe(1);
    expect(res.body.data[0].country).toBe('IN');
  });

  it('paginates results', async () => {
    const { app, authCookie, employeeRepository } = await setupAppWithAuth();
    for (let i = 0; i < 12; i++) {
      await employeeRepository.create({ ...sampleInput, email: `e${i}@example.com` });
    }

    const page1 = await request(app)
      .get('/employees')
      .query({ page: 1, pageSize: 5 })
      .set('Cookie', authCookie);
    const page3 = await request(app)
      .get('/employees')
      .query({ page: 3, pageSize: 5 })
      .set('Cookie', authCookie);

    expect(page1.body.total).toBe(12);
    expect(page1.body.data).toHaveLength(5);
    expect(page3.body.data).toHaveLength(2);
  });
});

describe('POST /employees', () => {
  it('creates an employee and returns 201 with the row', async () => {
    const { app, authCookie } = await setupAppWithAuth();

    const res = await request(app).post('/employees').set('Cookie', authCookie).send(sampleBody());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      fullName: 'Alice Anderson',
      email: 'alice@example.com',
      country: 'US',
    });
    expect(res.body.id).toBeDefined();
  });

  it('returns 400 when full name is missing', async () => {
    const { app, authCookie } = await setupAppWithAuth();

    const res = await request(app)
      .post('/employees')
      .set('Cookie', authCookie)
      .send(sampleBody({ fullName: '' }));

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const { app } = await setupAppWithAuth();

    const res = await request(app).post('/employees').send(sampleBody());

    expect(res.status).toBe(401);
  });
});

describe('GET /employees/:id', () => {
  it('returns the employee', async () => {
    const { app, authCookie, employeeRepository } = await setupAppWithAuth();
    const created = await employeeRepository.create(sampleInput);

    const res = await request(app).get(`/employees/${created.id}`).set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: created.id, fullName: 'Alice Anderson' });
  });

  it('returns 404 for unknown id', async () => {
    const { app, authCookie } = await setupAppWithAuth();

    const res = await request(app).get('/employees/does-not-exist').set('Cookie', authCookie);

    expect(res.status).toBe(404);
  });
});

describe('PUT /employees/:id', () => {
  it('updates the employee', async () => {
    const { app, authCookie, employeeRepository } = await setupAppWithAuth();
    const created = await employeeRepository.create(sampleInput);

    const res = await request(app)
      .put(`/employees/${created.id}`)
      .set('Cookie', authCookie)
      .send(sampleBody({ jobTitle: 'Senior Engineer' }));

    expect(res.status).toBe(200);
    expect(res.body.jobTitle).toBe('Senior Engineer');
  });

  it('returns 404 for unknown id', async () => {
    const { app, authCookie } = await setupAppWithAuth();

    const res = await request(app)
      .put('/employees/missing')
      .set('Cookie', authCookie)
      .send(sampleBody());

    expect(res.status).toBe(404);
  });
});

describe('DELETE /employees/:id', () => {
  it('deletes the employee and returns 204', async () => {
    const { app, authCookie, employeeRepository } = await setupAppWithAuth();
    const created = await employeeRepository.create(sampleInput);

    const res = await request(app).delete(`/employees/${created.id}`).set('Cookie', authCookie);

    expect(res.status).toBe(204);
    expect(await employeeRepository.findById(created.id)).toBeNull();
  });

  it('returns 404 when deleting unknown id', async () => {
    const { app, authCookie } = await setupAppWithAuth();

    const res = await request(app).delete('/employees/missing').set('Cookie', authCookie);

    expect(res.status).toBe(404);
  });
});
