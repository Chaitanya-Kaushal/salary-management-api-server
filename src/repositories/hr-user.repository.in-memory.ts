import type { HRUser } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { CreateHRUserInput, HRUserRepository } from './hr-user.repository.js';

export class InMemoryHRUserRepository implements HRUserRepository {
  private readonly byId = new Map<string, HRUser>();
  private readonly byEmail = new Map<string, HRUser>();

  async findByEmail(email: string): Promise<HRUser | null> {
    return this.byEmail.get(email) ?? null;
  }

  async findById(id: string): Promise<HRUser | null> {
    return this.byId.get(id) ?? null;
  }

  async create(input: CreateHRUserInput): Promise<HRUser> {
    const user: HRUser = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name ?? null,
      createdAt: new Date(),
    };
    this.byId.set(user.id, user);
    this.byEmail.set(user.email, user);
    return user;
  }
}
