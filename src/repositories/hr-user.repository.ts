import type { HRUser } from '@prisma/client';

export type CreateHRUserInput = {
  email: string;
  passwordHash: string;
  name?: string | null;
};

export interface HRUserRepository {
  findByEmail(email: string): Promise<HRUser | null>;
  findById(id: string): Promise<HRUser | null>;
  create(input: CreateHRUserInput): Promise<HRUser>;
}
