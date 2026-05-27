import bcryptjs from 'bcryptjs';
import type { HRUser } from '@prisma/client';
import { UnauthorizedError } from '../errors/index.js';
import type { HRUserRepository } from '../repositories/hr-user.repository.js';
import { signAuthToken } from '../utils/jwt.util.js';

export class AuthService {
  constructor(private readonly hrUserRepository: HRUserRepository) {}

  async login(email: string, password: string): Promise<{ token: string; user: HRUser }> {
    const user = await this.hrUserRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const matches = await bcryptjs.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = signAuthToken({ sub: user.id, email: user.email });
    return { token, user };
  }
}
