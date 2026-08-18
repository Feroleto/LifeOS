import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set (see .env.example)");
}

// Prisma 7 requires a driver adapter: `new PrismaClient()` without one fails.
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });

export type { PrismaClient } from "../generated/prisma/client";
