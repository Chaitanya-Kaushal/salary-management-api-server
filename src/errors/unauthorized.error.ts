import { CustomError, type SerializedError } from './custom-error.js';

export class UnauthorizedError extends CustomError {
  readonly statusCode = 401;

  constructor(message = 'Unauthorized') {
    super(message);
  }

  serializeErrors(): SerializedError[] {
    return [{ message: this.message }];
  }
}
