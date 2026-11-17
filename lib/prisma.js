import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis;

function makePrismaClient() {
  // 1. Buat connection pool dari PostgreSQL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // 2. Bungkus pool dengan adapter Prisma
  const adapter = new PrismaPg(pool);

  // 3. Inisialisasi PrismaClient dengan adapter
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || makePrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;