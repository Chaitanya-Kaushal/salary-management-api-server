import express, { type Express } from 'express';
import request from 'supertest';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../errors/index.js';
import { errorHandler } from './error-handler.middleware.js';

function buildTestApp(): Express {
  const app = express();
  app.get('/bad-request', (_req, _res, next) => {
    next(new BadRequestError('email is required'));
  });
  app.get('/not-found', (_req, _res, next) => {
    next(new NotFoundError('employee not found'));
  });
  app.get('/unauthorized', (_req, _res, next) => {
    next(new UnauthorizedError('not signed in'));
  });
  app.get('/unknown', (_req, _res, next) => {
    next(new Error('boom'));
  });
  app.use(errorHandler);
  return app;
}

describe('error handler middleware', () => {
  it('returns 400 JSON for BadRequestError', async () => {
    const res = await request(buildTestApp()).get('/bad-request');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ errors: [{ message: 'email is required' }] });
  });

  it('returns 404 JSON for NotFoundError', async () => {
    const res = await request(buildTestApp()).get('/not-found');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ errors: [{ message: 'employee not found' }] });
  });

  it('returns 401 JSON for UnauthorizedError', async () => {
    const res = await request(buildTestApp()).get('/unauthorized');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ errors: [{ message: 'not signed in' }] });
  });

  it('returns 500 JSON for any unknown error', async () => {
    const res = await request(buildTestApp()).get('/unknown');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ errors: [{ message: 'Internal server error' }] });
  });
});
