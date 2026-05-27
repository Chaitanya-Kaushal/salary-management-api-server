import bcryptjs from 'bcryptjs';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { InMemoryEmployeeRepository } from '../repositories/employee.repository.in-memory.js';
import { InMemoryHRUserRepository } from '../repositories/hr-user.repository.in-memory.js';

type AppCtx = {
  app: Express;
  authCookie: string;
  employeeRepository: InMemoryEmployeeRepository;
};

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
});
