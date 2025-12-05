// lib/prisma.js - Optimized Prisma client configuration
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const createPrismaClient = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
};

export const prisma =
    globalForPrisma.prisma_new ||
    createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma_new = prisma;
}

export default prisma;