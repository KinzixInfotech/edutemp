/**
 * Google Gemini AI Client for EduBreezy School ERP
 * Uses Gemini 1.5 Flash (Flash-Lite equivalent) for dashboard insights
 * 
 * IMPORTANT: This is the ONLY AI model allowed for production use.
 * Claude is dev-only. OpenAI is NOT allowed.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

// Initialize Gemini client
const genAI = process.env.GOOGLE_GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
    : null;

// Model configuration
const MODEL_NAME = 'gemini-1.5-flash';
const MAX_OUTPUT_TOKENS = 256; // Keep responses short

/**
 * Generate a hash for caching purposes
 */
export function generatePromptHash(prompt) {
    return crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);
}

/**
 * Estimate token count (approximate, as Gemini doesn't expose exact counts)
 * Rule of thumb: ~4 characters per token for English
 */
export function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Calculate approximate cost in USD
 * Gemini 1.5 Flash pricing (as of 2024):
 * - Input: $0.075 per 1M tokens
 * - Output: $0.30 per 1M tokens
 */
export function calculateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1_000_000) * 0.075;
    const outputCost = (outputTokens / 1_000_000) * 0.30;
    return inputCost + outputCost;
}

/**
 * Generate AI insights using Gemini Flash
 * 
 * @param {string} prompt - The prompt to send to Gemini
 * @param {Object} options - Additional options
 * @returns {Object} - { text, inputTokens, outputTokens, totalTokens, costUsd, promptHash, responseHash }
 */
export async function generateInsights(prompt, options = {}) {
    if (!genAI) {
        console.warn('Gemini API key not configured');
        return {
            text: null,
            error: 'AI service not configured',
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            costUsd: 0,
            promptHash: generatePromptHash(prompt),
            responseHash: null,
        };
    }

    try {
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                maxOutputTokens: options.maxTokens || MAX_OUTPUT_TOKENS,
                temperature: options.temperature || 0.7,
            },
        });

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Estimate tokens
        const inputTokens = estimateTokens(prompt);
        const outputTokens = estimateTokens(text);
        const totalTokens = inputTokens + outputTokens;
        const costUsd = calculateCost(inputTokens, outputTokens);

        return {
            text,
            inputTokens,
            outputTokens,
            totalTokens,
            costUsd,
            promptHash: generatePromptHash(prompt),
            responseHash: generatePromptHash(text),
        };
    } catch (error) {
        console.error('Gemini API error:', error);
        return {
            text: null,
            error: error.message,
            inputTokens: estimateTokens(prompt),
            outputTokens: 0,
            totalTokens: estimateTokens(prompt),
            costUsd: 0,
            promptHash: generatePromptHash(prompt),
            responseHash: null,
        };
    }
}

/**
 * Build dashboard insights prompt based on context
 */
export function buildDashboardInsightsPrompt(context) {
    const {
        dayType,
        schoolName,
        todayStats = {},
        recentTrends = {}
    } = context;

    const basePrompt = `You are an AI assistant for ${schoolName || 'a school'} ERP dashboard.
Today is a ${dayType} day.

Generate 1-3 SHORT, actionable insights for the school admin.
Each insight should be ONE sentence maximum.
Focus on what's most important for today.

Current stats:`;

    const statsSection = `
- Students present: ${todayStats.studentsPresent ?? 'N/A'}
- Teachers present: ${todayStats.teachersPresent ?? 'N/A'}
- Fees collected today: ₹${todayStats.feesCollectedToday ?? 0}
- Pending fees: ₹${todayStats.pendingFees ?? 0}
- Upcoming events: ${todayStats.upcomingEvents ?? 'None'}`;

    const trendsSection = recentTrends.attendanceTrend
        ? `\nRecent trends:\n- Attendance trend: ${recentTrends.attendanceTrend}`
        : '';

    const constraints = `

RULES:
- Return ONLY 1-3 insights as a JSON array of strings
- Each insight must be under 100 characters
- Be specific and actionable
- ${dayType === 'EXAM' ? 'Focus on exam-related insights. Attendance may vary.' : ''}
- ${dayType === 'HALF_DAY' ? 'Note that it\'s a half day with reduced activity.' : ''}
- Do NOT mention holidays, Sundays, or vacations as AI is not called on those days

Example format: ["First insight here", "Second insight here"]`;

    return basePrompt + statsSection + trendsSection + constraints;
}

export default {
    generateInsights,
    buildDashboardInsightsPrompt,
    generatePromptHash,
    estimateTokens,
    calculateCost,
    MODEL_NAME,
};
