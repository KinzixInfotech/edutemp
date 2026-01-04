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
            dailyLimit: 3, // 3 calls per day (morning, midday, evening)
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
            cached: false,
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
 * Parse Gemini response - now expects { summary, insights } format
 */
function parseInsightsResponse(text) {
    if (!text) return { summary: null, insights: [] };

    try {
        // Clean up the text - remove markdown code blocks if present
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }

        // Try to find and parse JSON object with summary and insights
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.summary && parsed.insights) {
                return {
                    summary: parsed.summary,
                    insights: Array.isArray(parsed.insights)
                        ? parsed.insights.filter(i => typeof i === 'string').slice(0, 3)
                        : []
                };
            }
        }

        // Fallback: Try to parse as array (old format)
        const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            const parsed = JSON.parse(arrayMatch[0]);
            if (Array.isArray(parsed)) {
                return {
                    summary: parsed[0] || null,
                    insights: parsed.slice(0, 3)
                };
            }
        }

        // Direct parse attempt
        const parsed = JSON.parse(cleanText);
        if (parsed.summary) {
            return {
                summary: parsed.summary,
                insights: parsed.insights || []
            };
        }
    } catch (e) {
        // Parse failed, try fallback extraction
        // Fallback: extract what we can
        const summaryMatch = text.match(/"summary"\s*:\s*"([^"]+)"/);
        const summary = summaryMatch ? summaryMatch[1] : null;

        // Extract insights from quoted strings
        const quoteMatches = text.match(/"([^"]{15,80})"/g);
        const insights = quoteMatches
            ? quoteMatches
                .map(q => q.replace(/"/g, '').trim())
                .filter(s => s !== summary && s.length > 10)
                .slice(0, 3)
            : [];

        return { summary, insights };
    }

    return { summary: null, insights: [] };
}

/**
 * Get dashboard stats for context
 */
async function getDashboardStats(schoolId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Yesterday for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get next 7 days for events
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Last 7 days for trends
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    try {
        // Parallel queries for comprehensive data
        const [
            // Attendance counts
            studentsPresent,
            totalStudents,
            teachingStaffPresent,
            totalTeachingStaff,
            nonTeachingStaffPresent,
            totalNonTeachingStaff,
            // Yesterday's attendance for comparison
            yesterdayStudentsPresent,
            // Fee stats
            feesToday,
            yesterdayFees,
            weeklyFees,
            outstandingFees,
            totalExpectedFees,
            studentsWithDues,
            // Calendar events
            upcomingEvents,
            // Upcoming exams
            upcomingExams,
            // School config
            schoolConfig
        ] = await Promise.all([
            // Students present today
            prisma.attendance.count({
                where: {
                    schoolId,
                    date: { gte: today, lt: tomorrow },
                    status: 'PRESENT',
                    user: { role: { name: 'STUDENT' } }
                }
            }),
            // Total students
            prisma.student.count({
                where: { schoolId }
            }),
            // Teaching staff present
            prisma.attendance.count({
                where: {
                    schoolId,
                    date: { gte: today, lt: tomorrow },
                    status: 'PRESENT',
                    user: { role: { name: 'TEACHING_STAFF' } }
                }
            }),
            // Total teaching staff
            prisma.user.count({
                where: { schoolId, role: { name: 'TEACHING_STAFF' } }
            }),
            // Non-teaching staff present
            prisma.attendance.count({
                where: {
                    schoolId,
                    date: { gte: today, lt: tomorrow },
                    status: 'PRESENT',
                    user: { role: { name: 'NON_TEACHING_STAFF' } }
                }
            }),
            // Total non-teaching staff
            prisma.user.count({
                where: { schoolId, role: { name: 'NON_TEACHING_STAFF' } }
            }),
            // Yesterday's student attendance for comparison
            prisma.attendance.count({
                where: {
                    schoolId,
                    date: { gte: yesterday, lt: today },
                    status: 'PRESENT',
                    user: { role: { name: 'STUDENT' } }
                }
            }),
            // Fees collected today
            prisma.feePayment.aggregate({
                where: {
                    schoolId,
                    paymentDate: { gte: today, lt: tomorrow },
                    status: 'SUCCESS'
                },
                _sum: { amount: true },
                _count: true
            }),
            // Yesterday's fees for comparison
            prisma.feePayment.aggregate({
                where: {
                    schoolId,
                    paymentDate: { gte: yesterday, lt: today },
                    status: 'SUCCESS'
                },
                _sum: { amount: true }
            }),
            // Weekly fees for trends
            prisma.feePayment.aggregate({
                where: {
                    schoolId,
                    paymentDate: { gte: lastWeek, lt: tomorrow },
                    status: 'SUCCESS'
                },
                _sum: { amount: true }
            }),
            // Outstanding fees
            prisma.studentFee.aggregate({
                where: {
                    schoolId,
                    balanceAmount: { gt: 0 }
                },
                _sum: { balanceAmount: true }
            }),
            // Total expected fees
            prisma.studentFee.aggregate({
                where: { schoolId },
                _sum: { finalAmount: true }
            }),
            // Students with pending fees
            prisma.studentFee.count({
                where: {
                    schoolId,
                    balanceAmount: { gt: 0 }
                }
            }),
            // Upcoming events (next 7 days)
            prisma.calendarEvent.findMany({
                where: {
                    schoolId,
                    startDate: { gte: today, lte: nextWeek },
                    status: 'SCHEDULED'
                },
                select: {
                    title: true,
                    startDate: true,
                    eventType: true
                },
                orderBy: { startDate: 'asc' },
                take: 5
            }),
            // Upcoming exams (next 14 days)
            prisma.exam.findMany({
                where: {
                    schoolId,
                    startDate: { gte: today },
                    status: 'SCHEDULED'
                },
                select: {
                    id: true,
                    title: true,
                    startDate: true,
                    endDate: true
                },
                orderBy: { startDate: 'asc' },
                take: 3
            }),
            // School config for timing
            prisma.attendanceConfig.findUnique({
                where: { schoolId },
                select: {
                    defaultStartTime: true,
                    defaultEndTime: true,
                    autoMarkTime: true
                }
            })
        ]);

        return {
            // Attendance
            studentsPresent,
            totalStudents,
            teachingStaffPresent,
            totalTeachingStaff,
            nonTeachingStaffPresent,
            totalNonTeachingStaff,
            totalStaff: totalTeachingStaff + totalNonTeachingStaff,
            staffPresent: teachingStaffPresent + nonTeachingStaffPresent,
            // Yesterday comparison
            yesterdayStudentsPresent,
            // Fees
            feesCollectedToday: feesToday._sum?.amount || 0,
            feesCollectedCount: feesToday._count || 0,
            yesterdayFeesCollected: yesterdayFees._sum?.amount || 0,
            weeklyFeesCollected: weeklyFees._sum?.amount || 0,
            outstandingFees: outstandingFees._sum?.balanceAmount || 0,
            totalExpectedFees: totalExpectedFees._sum?.finalAmount || 0,
            studentsWithDues,
            // Events
            upcomingEvents: upcomingEvents.map(e => ({
                title: e.title,
                date: e.startDate,
                type: e.eventType
            })),
            upcomingEventsCount: upcomingEvents.length,
            // Exams
            upcomingExams: upcomingExams.map(e => ({
                id: e.id,
                title: e.title,
                date: e.startDate
            })),
            // School config
            schoolConfig: schoolConfig || {
                defaultStartTime: '09:00',
                defaultEndTime: '17:00'
            }
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
    const parsed = parseInsightsResponse(result.text);

    // 9. Apply rules to filter/modify insights
    let insights = applyRulesToInsights(parsed.insights || [], context);

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

    // 11. Cache result (include summary)
    await cacheInsights(schoolId, dayType, feature, {
        summary: parsed.summary,
        insights,
        dayType
    });

    return {
        summary: parsed.summary,
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
