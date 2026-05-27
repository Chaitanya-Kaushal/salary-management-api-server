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

  it('returns 401 for an incorrect password', async () => {
    const app = await setupAppWithHrUser('hr@corp.example', 'password');

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'hr@corp.example', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.errors[0].message).toMatch(/invalid email or password/i);
  });

  it('returns 401 when the user does not exist', async () => {
    const app = await setupAppWithHrUser('hr@corp.example', 'password');

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@corp.example', password: 'password' });

    expect(res.status).toBe(401);
  });

  it('rate-limits to 5 login attempts then returns 429', async () => {
    const app = await setupAppWithHrUser('hr@corp.example', 'password');

    for (let i = 0; i < 5; i++) {
      await request(app).post('/auth/login').send({ email: 'hr@corp.example', password: 'wrong' });
    }

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'hr@corp.example', password: 'wrong' });

    expect(res.status).toBe(429);
  });
});

function extractAuthCookie(setCookie: string | string[] | undefined): string {
  if (!setCookie) throw new Error('expected set-cookie header');
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  const auth = cookies.find((c) => c.startsWith('auth='));
  if (!auth) throw new Error('expected auth cookie');
  return auth.split(';')[0] as string;
}

describe('GET /auth/me', () => {
  it('returns the current user when a valid cookie is sent', async () => {
    const app = await setupAppWithHrUser('hr@corp.example', 'password');

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'hr@corp.example', password: 'password' });
    const authCookie = extractAuthCookie(loginRes.headers['set-cookie']);

    const res = await request(app).get('/auth/me').set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: 'hr@corp.example', name: 'HR Manager' });
  });

  it('returns 401 without a cookie', async () => {
    const app = await setupAppWithHrUser('hr@corp.example', 'password');

    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('clears the auth cookie', async () => {
    const app = await setupAppWithHrUser('hr@corp.example', 'password');

    const res = await request(app).post('/auth/logout');

    expect(res.status).toBe(204);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie as unknown as string];
    expect(cookies.some((c) => c.startsWith('auth=') && c.includes('Expires='))).toBe(true);
  });
});
