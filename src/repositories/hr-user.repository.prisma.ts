import type { HRUser, PrismaClient } from '@prisma/client';
import type { CreateHRUserInput, HRUserRepository } from './hr-user.repository.js';

export class PrismaHRUserRepository implements HRUserRepository {
  constructor(private readonly client: PrismaClient) {}

  async findByEmail(email: string): Promise<HRUser | null> {
    return this.client.hRUser.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<HRUser | null> {
    return this.client.hRUser.findUnique({ where: { id } });
  }

  async create(input: CreateHRUserInput): Promise<HRUser> {
    return this.client.hRUser.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name ?? null,
      },
    });
  }
}
