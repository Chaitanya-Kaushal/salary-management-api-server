import { CustomError, type SerializedError } from './custom-error.js';

export class BadRequestError extends CustomError {
  readonly statusCode = 400;

  constructor(message = 'Bad Request') {
    super(message);
  }

  serializeErrors(): SerializedError[] {
    return [{ message: this.message }];
  }
}
