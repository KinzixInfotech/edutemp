import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter });

export { prisma };      // named export
export default prisma;  // default export