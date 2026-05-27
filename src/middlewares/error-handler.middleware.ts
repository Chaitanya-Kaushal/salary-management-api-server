import type { ErrorRequestHandler } from 'express';
import { CustomError } from '../errors/index.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof CustomError) {
    res.status(err.statusCode).json({ errors: err.serializeErrors() });
    return;
  }

  res.status(500).json({
    errors: [{ message: 'Internal server error' }],
  });
};
