// // // lib/prisma.js - Force reload
// // import { PrismaClient } from '@prisma/client'
// // import dotenv from 'dotenv'

// // dotenv.config()

// // const globalForPrisma = global

// // const prisma = globalForPrisma.prisma || new PrismaClient({
// //     datasources: {
// //         db: {
// //             url: process.env.DATABASE_URL,
// //         },
// //     },
// // })

// // if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// // export default prisma
// import "dotenv/config";
// import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
// import { PrismaClient } from "../generated/prisma/client";

// const connectionString = `${process.env.DATABASE_URL}`;

// const adapter = new PrismaBetterSqlite3({ url: connectionString });
// const prisma = new PrismaClient({ adapter });

// export { prisma };
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;