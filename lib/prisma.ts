/**
 * lib/prisma.ts
 * Prisma client singleton — uses @prisma/adapter-libsql for SQLite.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const dbUrl = process.env.DATABASE_URL ?? 'file:./nimbus.db';

const adapter = new PrismaLibSql({ url: dbUrl });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
