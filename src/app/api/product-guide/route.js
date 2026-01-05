/**
 * Product Guide AI API
 * Smart marketing AI for homepage with semantic matching
 * 
 * Features:
 * - Fuzzy FAQ matching with synonym support
 * - Feature-based context focusing
 * - Intelligent caching with normalized keys
 * - Cost-efficient AI calls
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateKey, getCache, setCache } from '@/lib/cache';
import {
    extractKeywords,
    findBestFaqMatch,
    buildFocusedContext,
    normalizeForCache
} from '@/lib/ai/questionMatcher';
import fs from 'fs';
import path from 'path';

// Gemini Flash-Lite for cost efficiency
const MODEL_NAME = 'gemini-2.5-flash-lite';
const MAX_OUTPUT_TOKENS = 300;
const CACHE_TTL = 86400; // 24 hours

// Similarity thresholds
const FAQ_MATCH_THRESHOLD = 0.4; // 40% keyword overlap = FAQ match

// Get product knowledge (cached in memory)
let productKnowledge = null;

async function getProductKnowledge() {
    if (productKnowledge) return productKnowledge;

    try {
        const filePath = path.join(process.cwd(), 'public', 'product-knowledge.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        productKnowledge = JSON.parse(fileContent);
        return productKnowledge;
    } catch (error) {
        console.error('Failed to load product knowledge:', error);
        return null;
    }
}

// Build guardrailed prompt with focused context
function buildPrompt(question, context) {
    return `You are a helpful product guide for EduBreezy, a school management ERP platform.

RULES:
1. Answer using ONLY the provided product context below.
2. Find relevant information in features, subFeatures, or descriptions.
3. When listing capabilities, use bullet points (• feature name).
4. Keep the intro brief, then show 3-5 key bullet points.
5. End with: "Would you like a demo to see this in action?"
6. Be friendly and helpful.

FORMAT EXAMPLE:
Yes, EduBreezy supports [feature]. Here's what it includes:
• Point one
• Point two
• Point three

Would you like a demo to see this in action?

PRODUCT CONTEXT:
${JSON.stringify(context, null, 2)}

USER QUESTION: ${question}

HELPFUL ANSWER:`;
}

export async function POST(request) {
    try {
        const { question } = await request.json();

        // Validate question
        if (!question || typeof question !== 'string') {
            return NextResponse.json(
                { error: 'Question is required' },
                { status: 400 }
            );
        }

        // Enforce character limit
        if (question.length > 200) {
            return NextResponse.json(
                { error: 'Question must be under 200 characters' },
                { status: 400 }
            );
        }

        // Normalize question for caching
        const cacheKey = generateKey('product-guide-v3', { q: normalizeForCache(question) });

        // Check cache first
        const cached = await getCache(cacheKey);
        if (cached) {
            return NextResponse.json({
                answer: cached.answer,
                source: 'cache',
                cached: true,
            });
        }

        // Load product knowledge
        const knowledge = await getProductKnowledge();
        if (!knowledge) {
            return NextResponse.json(
                { error: 'Product knowledge unavailable' },
                { status: 500 }
            );
        }

        // Step 1: Try fuzzy FAQ matching
        const { match: faqMatch, score: faqScore } = findBestFaqMatch(question, knowledge.faq || []);

        if (faqMatch && faqScore >= FAQ_MATCH_THRESHOLD) {
            // High-confidence FAQ match - no AI needed
            const answer = faqMatch.answer + " Would you like a demo to see this in action?";
            await setCache(cacheKey, { answer }, CACHE_TTL);

            return NextResponse.json({
                answer,
                source: 'faq',
                score: faqScore.toFixed(2),
                cached: false,
            });
        }

        // Step 2: Extract keywords and check if question is about our product
        const keywords = extractKeywords(question);
        if (keywords.length === 0) {
            return NextResponse.json({
                answer: "Could you rephrase your question? I'm here to help you learn about EduBreezy's features, pricing, and security. Would you like a demo?",
                source: 'clarify',
                cached: false,
            });
        }

        // Step 3: Call AI with focused context
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'AI service not configured' },
                { status: 500 }
            );
        }

        // Build focused context (only relevant features)
        const focusedContext = buildFocusedContext(question, knowledge);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                temperature: 0.5, // Slightly more creative for natural responses
            },
        });

        const prompt = buildPrompt(question, focusedContext);
        const result = await model.generateContent(prompt);
        const response = result.response;
        const answer = response.text()?.trim() || "I'd be happy to help you learn more. Would you like to schedule a demo?";

        // Cache the response
        await setCache(cacheKey, { answer }, CACHE_TTL);

        return NextResponse.json({
            answer,
            source: 'ai',
            cached: false,
        });

    } catch (error) {
        console.error('Product Guide AI error:', error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}

// GET endpoint to fetch suggested questions
export async function GET() {
    const suggestedQuestions = {
        primary: [
            "What features does EduBreezy offer?",
            "Is EduBreezy suitable for CBSE / ICSE schools?",
            "How does AI help school administrators?",
            "Is student data secure in EduBreezy?",
            "How does fee management work?",
        ],
        secondary: [
            "Does EduBreezy support exams and results?",
            "How easy is onboarding?",
            "Can I request a demo?",
        ],
    };

    return NextResponse.json(suggestedQuestions);
}
