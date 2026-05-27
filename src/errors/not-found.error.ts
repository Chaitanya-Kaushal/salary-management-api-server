import { CustomError, type SerializedError } from './custom-error.js';

export class NotFoundError extends CustomError {
  readonly statusCode = 404;

  constructor(message = 'Not Found') {
    super(message);
  }

  serializeErrors(): SerializedError[] {
    return [{ message: this.message }];
  }
}
