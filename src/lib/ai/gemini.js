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
export const MODEL_NAME = 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 2048; // Increased to prevent truncation of JSON

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

    // Format currency in lakhs for readability
    const formatCurrency = (amount) => {
        if (!amount) return '₹0';
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
        return `₹${amount}`;
    };

    // Build upcoming events string
    const eventsStr = todayStats.upcomingEvents?.length > 0
        ? todayStats.upcomingEvents.map(e => e.title).join(', ')
        : 'None scheduled';

    const basePrompt = `You are a smart AI assistant for ${schoolName || 'a school'} ERP dashboard.
Today is a ${dayType} day.

Generate a comprehensive dashboard summary for the school admin.

CURRENT DASHBOARD DATA:
📊 ATTENDANCE:
- Students: ${todayStats.studentsPresent ?? 0} present out of ${todayStats.totalStudents ?? 0} total
- Teaching Staff: ${todayStats.teachingStaffPresent ?? 0} present out of ${todayStats.totalTeachingStaff ?? 0} total
- Non-Teaching Staff: ${todayStats.nonTeachingStaffPresent ?? 0} present out of ${todayStats.totalNonTeachingStaff ?? 0} total

💰 FEES:
- Collected Today: ${formatCurrency(todayStats.feesCollectedToday)} (${todayStats.feesCollectedCount ?? 0} transactions)
- Outstanding: ${formatCurrency(todayStats.outstandingFees)} from ${todayStats.studentsWithDues ?? 0} students
- Total Expected: ${formatCurrency(todayStats.totalExpectedFees)}

📅 UPCOMING EVENTS (next 7 days): ${eventsStr}`;

    const constraints = `

YOUR TASK:
Generate a JSON object with TWO parts:
1. "summary" - A 2-3 sentence paragraph summarizing the overall dashboard status (for the main greeting banner)
2. "insights" - An array of 3 specific, actionable insights (for insight cards)

RULES:
- Be natural and conversational, like a helpful colleague
- Include actual numbers from the data (e.g., "0 of 33 students", "₹6K collected")
- If attendance is 0, mention it naturally (not alarmingly)
- Highlight positive things (fees collected, events coming up)
- Each insight should be under 60 characters
- Don't mention weekends or holidays

RESPOND WITH ONLY THIS JSON FORMAT:
{
  "summary": "Your 2-3 sentence overall summary here.",
  "insights": ["Insight 1", "Insight 2", "Insight 3"]
}`;

    return basePrompt + constraints;
}

export default {
    generateInsights,
    buildDashboardInsightsPrompt,
    generatePromptHash,
    estimateTokens,
    calculateCost,
    MODEL_NAME,
};
