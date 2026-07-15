import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import type { D1Database } from "@cloudflare/workers-types";

let prisma: PrismaClient | undefined;

/**
 * Prisma client backed by Cloudflare D1. Initialized from the first request's
 * DB binding and cached for the isolate's lifetime (the binding is stable per
 * deployment). getShopify() calls this on every authenticated request, so by
 * the time any service code runs, db() is available.
 */
export function initDb(d1: D1Database): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({ adapter: new PrismaD1(d1) });
  }
  return prisma;
}

export function db(): PrismaClient {
  if (!prisma) {
    throw new Error(
      "Database not initialized — initDb(env.DB) must run first (getShopify does this).",
    );
  }
  return prisma;
}
