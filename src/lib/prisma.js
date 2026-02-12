// lib/prisma.js - Optimized Prisma client configuration for serverless
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const createPrismaClient = () => {
    const isDev = process.env.NODE_ENV === 'development';

    // Append connection pool params to DATABASE_URL if not already present
    let dbUrl = process.env.DATABASE_URL || '';

    // Add connection_limit and pool_timeout if not already in the URL
    if (!dbUrl.includes('connection_limit')) {
        const separator = dbUrl.includes('?') ? '&' : '?';
        // Lower limit to avoid exhausting Supabase's pool (~20 connections)
        // Dev: 5, Prod: 10
        dbUrl += `${separator}connection_limit=${isDev ? 5 : 10}&pool_timeout=20`;
    }

    return new PrismaClient({
        log: isDev ? ['error', 'warn'] : ['error'],
        datasources: {
            db: {
                url: dbUrl,
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