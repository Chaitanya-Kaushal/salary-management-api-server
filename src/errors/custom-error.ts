export type SerializedError = {
  message: string;
  field?: string;
};

export abstract class CustomError extends Error {
  abstract readonly statusCode: number;

  abstract serializeErrors(): SerializedError[];
}
