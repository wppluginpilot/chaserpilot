import { PrismaClient } from "@prisma/client";

/**
 * One Prisma client per process. Vite reloads modules on every edit in
 * development; stashing the client on globalThis stops each reload opening a
 * new connection pool.
 */
declare global {
  var __chaserpilotPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.__chaserpilotPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__chaserpilotPrisma = prisma;
}

export type Db = PrismaClient;
