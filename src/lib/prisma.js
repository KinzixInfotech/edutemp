// lib/prisma.js - Optimized Prisma client configuration for serverless
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const createPrismaClient = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        // Serverless-optimized settings
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
};

// Use cached client if exists, otherwise create new one
export const prisma =
    globalForPrisma.prisma_new ||
    createPrismaClient();

// CRITICAL: Cache in ALL environments to prevent connection exhaustion in serverless
// In Vercel/serverless, each cold start creates new module scope - without global caching,
// each invocation would create a new connection, exhausting Supabase's pool limit (~20)
globalForPrisma.prisma_new = prisma;

export default prisma;