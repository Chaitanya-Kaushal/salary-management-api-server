import { CustomError, type SerializedError } from './custom-error.js';

export class ForbiddenError extends CustomError {
  readonly statusCode = 403;

  constructor(message = 'Forbidden') {
    super(message);
  }

  serializeErrors(): SerializedError[] {
    return [{ message: this.message }];
  }
}
