import type { HRUser } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: HRUser;
    }
  }
}

export {};
