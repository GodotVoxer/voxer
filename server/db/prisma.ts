import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
};

const defaultLocalDatabaseUrl = "postgresql://voxer:voxer@localhost:5432/voxer";

const createPrismaClient = (): PrismaClient => {
  const url = process.env.DATABASE_URL?.trim() || defaultLocalDatabaseUrl;
  // Each instance opens its own pool; without a cap, traffic spikes exhaust Postgres connections.
  const max = Number(process.env.PG_POOL_MAX);
  const pool =
    globalForPrisma.prismaPool ??
    new Pool({
      connectionString: url,
      max: Number.isInteger(max) && max > 0 ? max : 5,
      idleTimeoutMillis: 10_000,
    });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaPool = pool;
  }
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
