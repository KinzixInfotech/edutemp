/**
 * AI Insights Generator
 * Generates dashboard insights using Gemini Flash-Lite with caching
 * 
 * FLOW:
 * 1. Check AiSettings (enabled, role, daily limit)
 * 2. Check AiInsightCache (return if cached)
 * 3. Check dayType (no AI on HOLIDAY/SUNDAY/VACATION)
 * 4. Generate prompt based on context
 * 5. Call Gemini Flash-Lite
 * 6. Log to AiUsageLog
 * 7. Cache result in AiInsightCache
 * 8. Return 1-3 short insights
 */

import prisma from '@/lib/prisma';
import { generateKey, getCache, setCache } from '@/lib/cache';
import { generateInsights, buildDashboardInsightsPrompt, generatePromptHash, MODEL_NAME } from './gemini';
import { DAY_TYPES, getDashboardContext } from './dayContextEngine';
import { getStaticMessage, applyRulesToInsights } from './rules';

// Cache TTL: 24 hours
const INSIGHTS_CACHE_TTL = 86400;

/**
 * Check if user is allowed to use AI
 */
async function checkAiPermissions(schoolId, userId, userRole) {
    // Get AI settings for school (or use defaults)
    let settings = await prisma.aiSettings.findUnique({
        where: { schoolId },
    });

    // If no settings exist, AI is enabled with defaults
    if (!settings) {
        settings = {
            aiEnabled: true,
            allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
            dailyLimit: 1,
            monthlyTokenLimit: null,
            model: MODEL_NAME,
        };
    }

    // Check if AI is enabled for this school
    if (!settings.aiEnabled) {
        return { allowed: false, reason: 'AI is disabled for this school' };
    }

    // Check if user role is allowed
    if (!settings.allowedRoles.includes(userRole)) {
        return { allowed: false, reason: 'Your role does not have AI access' };
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usageCount = await prisma.aiUsageLog.count({
        where: {
            schoolId,
            feature: 'DASHBOARD_INSIGHTS',
            cached: false, // Only count non-cached calls
            createdAt: { gte: today },
        },
    });

    if (usageCount >= settings.dailyLimit) {
        return { allowed: false, reason: 'Daily AI limit reached', cached: true };
    }

    return { allowed: true, settings };
}

/**
 * Get cached insights if available
 */
async function getCachedInsights(schoolId, feature) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Check database cache first (persistent)
    const dbCache = await prisma.aiInsightCache.findUnique({
        where: {
            schoolId_date_feature: {
                schoolId,
                date: new Date(dateStr),
                feature,
            },
        },
    });

    if (dbCache && new Date(dbCache.expiresAt) > new Date()) {
        return JSON.parse(dbCache.response);
    }

    // Check Redis cache (faster)
    const cacheKey = generateKey('ai-insights', { schoolId, date: dateStr, feature });
    const redisCache = await getCache(cacheKey);

    return redisCache;
}

/**
 * Save insights to cache
 */
async function cacheInsights(schoolId, dayType, feature, insights) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const expiresAt = new Date(today);
    expiresAt.setHours(23, 59, 59, 999);

    // Save to database (persistent)
    await prisma.aiInsightCache.upsert({
        where: {
            schoolId_date_feature: {
                schoolId,
                date: new Date(dateStr),
                feature,
            },
        },
        update: {
            dayType,
            response: JSON.stringify(insights),
            expiresAt,
        },
        create: {
            schoolId,
            date: new Date(dateStr),
            dayType,
            feature,
            response: JSON.stringify(insights),
            expiresAt,
        },
    });

    // Save to Redis (faster access)
    const cacheKey = generateKey('ai-insights', { schoolId, date: dateStr, feature });
    await setCache(cacheKey, insights, INSIGHTS_CACHE_TTL);
}

/**
 * Log AI usage
 */
async function logAiUsage(params) {
    const {
        schoolId,
        userId,
        userRole,
        feature,
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        costUsd,
        promptHash,
        responseHash,
        cached,
    } = params;

    await prisma.aiUsageLog.create({
        data: {
            schoolId,
            userId,
            userRole,
            feature,
            model,
            inputTokens,
            outputTokens,
            totalTokens,
            costUsd,
            promptHash,
            responseHash,
            cached,
        },
    });
}

/**
 * Parse AI response to extract insights array
 */
function parseInsightsResponse(text) {
    if (!text) return [];

    try {
        // Try to parse as JSON array
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed.slice(0, 3); // Max 3 insights
        }
    } catch {
        // If not valid JSON, try to extract insights
        const lines = text.split('\n').filter(line => line.trim());
        return lines.slice(0, 3);
    }

    return [];
}

/**
 * Get dashboard stats for context
 */
async function getDashboardStats(schoolId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
        // Get today's attendance counts
        const [studentsPresent, teachersPresent] = await Promise.all([
            prisma.attendance.count({
                where: {
                    schoolId,
                    date: { gte: today, lt: tomorrow },
                    status: 'PRESENT',
                    user: { student: { isNot: null } },
                },
            }),
            prisma.attendance.count({
                where: {
                    schoolId,
                    date: { gte: today, lt: tomorrow },
                    status: 'PRESENT',
                    user: { teacher: { isNot: null } },
                },
            }),
        ]);

        // Get fee stats (last 30 days)
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const feeStats = await prisma.feePayment.aggregate({
            where: {
                createdAt: { gte: today, lt: tomorrow },
            },
            _sum: { amount: true },
        });

        // Get upcoming events
        const upcomingEvents = await prisma.calendarEvent.count({
            where: {
                schoolId,
                startDate: { gte: today },
                status: 'SCHEDULED',
            },
        });

        return {
            studentsPresent,
            teachersPresent,
            feesCollectedToday: feeStats._sum?.amount || 0,
            pendingFees: 0, // Would need more complex query
            upcomingEvents,
        };
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return {};
    }
}

/**
 * Main function: Generate dashboard insights
 * 
 * @param {Object} params
 * @param {string} params.schoolId - School UUID
 * @param {string} params.userId - User UUID
 * @param {string} params.userRole - User role (ADMIN, SUPER_ADMIN)
 * @param {string} params.schoolName - School name for prompt context
 * @returns {Object} { insights, cached, dayType, error }
 */
export async function generateDashboardInsights(params) {
    const { schoolId, userId, userRole, schoolName } = params;
    const feature = 'DASHBOARD_INSIGHTS';

    // 1. Get day context
    const context = await getDashboardContext(schoolId);
    const { dayType, aiAllowed } = context;

    // 2. If AI not allowed (holiday/Sunday/vacation), return static messages
    if (!aiAllowed) {
        const staticMessage = getStaticMessage(dayType, 'general');
        return {
            insights: [staticMessage],
            cached: false,
            dayType,
            aiUsed: false,
            reason: `AI not available on ${dayType}`,
        };
    }

    // 3. Check permissions
    const permission = await checkAiPermissions(schoolId, userId, userRole);
    if (!permission.allowed) {
        // If daily limit reached, try to return cached insights
        if (permission.cached) {
            const cached = await getCachedInsights(schoolId, feature);
            if (cached) {
                return {
                    insights: cached.insights || cached,
                    cached: true,
                    dayType,
                    aiUsed: false,
                    reason: permission.reason,
                };
            }
        }
        return {
            insights: [],
            cached: false,
            dayType,
            aiUsed: false,
            error: permission.reason,
        };
    }

    // 4. Check cache
    const cached = await getCachedInsights(schoolId, feature);
    if (cached) {
        // Log cached access
        await logAiUsage({
            schoolId,
            userId,
            userRole,
            feature,
            model: MODEL_NAME,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            costUsd: 0,
            promptHash: 'cached',
            responseHash: null,
            cached: true,
        });

        return {
            insights: cached.insights || cached,
            cached: true,
            dayType,
            aiUsed: false,
        };
    }

    // 5. Get dashboard stats for context
    const todayStats = await getDashboardStats(schoolId);

    // 6. Build prompt
    const prompt = buildDashboardInsightsPrompt({
        dayType,
        schoolName,
        todayStats,
    });

    // 7. Call Gemini
    const result = await generateInsights(prompt);

    if (result.error) {
        return {
            insights: [],
            cached: false,
            dayType,
            aiUsed: false,
            error: result.error,
        };
    }

    // 8. Parse response
    let insights = parseInsightsResponse(result.text);

    // 9. Apply rules to filter/modify insights
    insights = applyRulesToInsights(insights, context);

    // 10. Log usage
    await logAiUsage({
        schoolId,
        userId,
        userRole,
        feature,
        model: MODEL_NAME,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.totalTokens,
        costUsd: result.costUsd,
        promptHash: result.promptHash,
        responseHash: result.responseHash,
        cached: false,
    });

    // 11. Cache result
    await cacheInsights(schoolId, dayType, feature, { insights, dayType });

    return {
        insights,
        cached: false,
        dayType,
        aiUsed: true,
        tokens: result.totalTokens,
        cost: result.costUsd,
    };
}

/**
 * Invalidate insights cache for a school
 */
export async function invalidateInsightsCache(schoolId) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Delete from database
    await prisma.aiInsightCache.deleteMany({
        where: {
            schoolId,
            date: new Date(dateStr),
        },
    });

    // Delete from Redis
    const cacheKey = generateKey('ai-insights', { schoolId, date: dateStr, feature: 'DASHBOARD_INSIGHTS' });
    const { delCache } = await import('@/lib/cache');
    await delCache(cacheKey);
}

export default {
    generateDashboardInsights,
    invalidateInsightsCache,
};
