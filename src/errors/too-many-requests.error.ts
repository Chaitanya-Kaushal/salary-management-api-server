import { CustomError, type SerializedError } from './custom-error.js';

export class TooManyRequestsError extends CustomError {
  readonly statusCode = 429;

  constructor(message = 'Too Many Requests') {
    super(message);
  }

  serializeErrors(): SerializedError[] {
    return [{ message: this.message }];
  }
}
