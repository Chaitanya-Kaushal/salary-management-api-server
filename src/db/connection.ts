import { PrismaClient } from '@prisma/client';
import { config, isTest } from '../config/index.js';

const createPrismaClient = (): PrismaClient =>
  new PrismaClient({
    log: isTest ? [] : ['warn', 'error'],
    datasources: {
      db: {
        url: config.databaseUrl,
      },
    },
  });

// Reuse a single client across hot reloads in development to avoid
// exhausting Postgres connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (!isTest) {
  globalForPrisma.prisma = prisma;
}
