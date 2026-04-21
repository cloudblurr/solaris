/**
 * lib/prisma.ts
 * Prisma client singleton for use across the app.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
import { PrismaLibSql } from '@prisma/adapter-libsql';

const dbUrl = process.env.DATABASE_URL ?? 'file:./nimbus.db';

const adapter = new PrismaLibSql({
  url: dbUrl,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as unknown as { prisma: any };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
