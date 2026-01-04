/**
 * Product Guide AI API
 * Marketing AI for homepage with strict guardrails
 * 
 * Rules:
 * - Only answers from product-knowledge.json
 * - No database access
 * - No hallucination
 * - Cached responses
 * - Token limited
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateKey, getCache, setCache } from '@/lib/cache';
import fs from 'fs';
import path from 'path';

// Gemini Flash-Lite for cost efficiency
const MODEL_NAME = 'gemini-2.0-flash-lite';
const MAX_OUTPUT_TOKENS = 300;
const CACHE_TTL = 86400; // 24 hours

// Allowed questions (whitelist)
const ALLOWED_QUESTIONS = [
    'what features does edubreezy offer',
    'is edubreezy suitable for cbse icse schools',
    'how does ai help school administrators',
    'is student data secure in edubreezy',
    'how does fee management work',
    'does edubreezy support exams and results',
    'how easy is onboarding',
    'can i request a demo',
    // Variations & Keywords
    'feature', 'module', 'offer',
    'cbse', 'icse', 'board', 'curriculum',
    'security', 'secure', 'data', 'privacy',
    'fee', 'payment', 'paid', 'cost', 'price', 'pricing', 'online',
    'exam', 'result', 'grade', 'mark', 'report',
    'onboarding', 'setup', 'start', 'implement',
    'demo', 'trial', 'see', 'watch',
    'ai', 'artificial intelligence', 'smart', 'automation',
    'app', 'mobile', 'android', 'ios', 'phone',
    'attendance', 'track', 'present', 'absent',
    'transport', 'bus', 'gps', 'driver',
    'library', 'book',
    'payroll', 'salary', 'staff', 'hr',
    'certificate', 'document',
    'inventory', 'stock',
    'parent', 'student', 'teacher', 'admin',
    'sms', 'notification', 'communication',
    'time', 'calendar', 'schedule',
    'system', 'erp', 'platform', 'cloud',
];

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

// Check if question is within scope
function isQuestionAllowed(question) {
    const normalized = question.toLowerCase().replace(/[?!.,]/g, '').trim();

    // Check against allowed topics
    return ALLOWED_QUESTIONS.some(allowed =>
        normalized.includes(allowed) || allowed.includes(normalized)
    );
}

// Build guardrailed prompt
function buildPrompt(question, knowledge) {
    return `You are a product guide for EduBreezy, a school management ERP platform.

STRICT RULES:
1. Answer using the provided product knowledge.
2. If the user asks about a specific feature (like "online payment"), check if it's mentioned in any module description or sub-feature.
3. You CAN combine information from different parts of the knowledge base.
4. If a feature is DEFINITELY not mentioned, say "This feature is planned" or redirect to a demo.
5. Keep answers short (2-3 sentences max), clear, and professional.
6. End with a soft call-to-action like "Would you like a demo to see this in action?"
7. Do NOT include greetings or filler words.

PRODUCT KNOWLEDGE:
${JSON.stringify(knowledge, null, 2)}

USER QUESTION: ${question}

ANSWER (2-3 sentences max):`;
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
        if (question.length > 150) {
            return NextResponse.json(
                { error: 'Question must be under 150 characters' },
                { status: 400 }
            );
        }

        // Normalize question for matching
        const normalizedQuestion = question.toLowerCase().trim();

        // Check if question is within allowed scope
        if (!isQuestionAllowed(normalizedQuestion)) {
            return NextResponse.json({
                answer: "For detailed or custom requirements, I'd recommend requesting a personalized demo where our team can address your specific needs. Would you like me to help you schedule one?",
                source: 'redirect',
                cached: false,
            });
        }

        // Check cache first
        const cacheKey = generateKey('product-guide-v2', { q: normalizedQuestion });
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

        // Check FAQ for exact match first
        const faqMatch = knowledge.faq?.find(faq => {
            const qNorm = normalizedQuestion;
            const faqNorm = faq.question.toLowerCase();
            return qNorm === faqNorm || faqNorm.includes(qNorm) || (qNorm.includes(faqNorm) && faqNorm.length > 20);
        });

        if (faqMatch) {
            // Use FAQ answer directly (no AI call needed)
            const answer = faqMatch.answer + " Would you like a demo to see this in action?";
            await setCache(cacheKey, { answer }, CACHE_TTL);

            return NextResponse.json({
                answer,
                source: 'faq',
                cached: false,
            });
        }

        // Call Gemini for non-FAQ questions
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'AI service not configured' },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                temperature: 0.4, // Balanced for factual but natural responses
            },
        });

        const prompt = buildPrompt(question, knowledge);
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
