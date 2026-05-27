import bcryptjs from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../app.js';
import { InMemoryHRUserRepository } from '../repositories/hr-user.repository.in-memory.js';

async function setupAppWithHrUser(email: string, password: string) {
  const repo = new InMemoryHRUserRepository();
  const passwordHash = await bcryptjs.hash(password, 10);
  await repo.create({ email, passwordHash, name: 'HR Manager' });
  return createApp({ hrUserRepository: repo });
}

describe('POST /auth/login', () => {
  it('returns 204 and sets an auth cookie for valid credentials', async () => {
    const app = await setupAppWithHrUser('hr@corp.example', 'password');

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'hr@corp.example', password: 'password' });

    expect(res.status).toBe(204);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie as unknown as string];
    expect(cookies.some((c) => c.startsWith('auth='))).toBe(true);
  });
});
