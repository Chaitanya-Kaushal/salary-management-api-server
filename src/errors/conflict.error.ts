import { CustomError, type SerializedError } from './custom-error.js';

export class ConflictError extends CustomError {
  readonly statusCode = 409;

  constructor(message = 'Conflict') {
    super(message);
  }

  serializeErrors(): SerializedError[] {
    return [{ message: this.message }];
  }
}
