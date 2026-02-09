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

// Check if question is about pricing/cost calculation (more flexible)
function isPricingQuestion(question) {
    const q = question.toLowerCase();

    // Direct pricing keywords
    const pricingTerms = ['pricing', 'price', 'cost', 'charge', 'rate', 'fee'];
    const hasPricingTerm = pricingTerms.some(term => q.includes(term));

    // Student count indicators
    const hasStudentCount = /\d+\s*(student|child|kid|pupil|learner)/i.test(question);

    // Pricing questions
    const pricingPhrases = ['how much', 'what does it cost', 'pricing model', 'pricing structure', 'cost for'];
    const hasPricingPhrase = pricingPhrases.some(phrase => q.includes(phrase));

    // If has pricing term + student count, or pricing question phrase
    return (hasPricingTerm && hasStudentCount) || hasPricingPhrase;
}

// Calculate pricing based on student count
function calculatePricing(question) {
    // Try to extract student count from question
    const numbers = question.match(/\d+/g);
    const studentCount = numbers ? parseInt(numbers[0]) : 100;

    const PRICE_PER_100_STUDENTS = 12000;
    const units = Math.ceil(studentCount / 100);
    const yearlyPrice = units * PRICE_PER_100_STUDENTS;
    const perStudentYearly = 120;
    const perStudentMonthly = 10;
    const monthlyTotal = Math.round(yearlyPrice / 12);

    return {
        studentCount,
        units,
        yearlyPrice,
        perStudentYearly,
        perStudentMonthly,
        monthlyTotal
    };
}

// Generate pricing response - Clean & Transparent
function generatePricingResponse(pricing) {
    return `Great question! 🎉 Let me break down the pricing for **${pricing.studentCount} students**:

📊 **Your Pricing Summary:**
• **Total Yearly Cost:** ₹${pricing.yearlyPrice.toLocaleString('en-IN')}
• **Monthly Equivalent:** ₹${pricing.monthlyTotal.toLocaleString('en-IN')}/month (billed yearly)

💡 **Per Student Breakdown:**
• **Per Student/Year:** ₹${pricing.perStudentYearly}
• **Per Student/Month:** Just ₹${pricing.perStudentMonthly}! ☕

📦 **How it works:**
You need ${pricing.units} unit${pricing.units > 1 ? 's' : ''} (1 unit = 100 students)
${pricing.units} × ₹12,000 = ₹${pricing.yearlyPrice.toLocaleString('en-IN')}/year

✨ That's less than the cost of a samosa per student per month! 🥟

**Everything's included:** All modules, mobile apps, unlimited users, 24/7 support, and free data migration! 

Want to get started or need a custom quote? 📞`;
}

// Check if question is off-topic (not about EduBreezy/school management)
function isOffTopicQuestion(question, keywords) {
    const offTopicIndicators = [
        'weather', 'moon', 'sun', 'distance', 'planet', 'space', 'star',
        'cricket', 'football', 'movie', 'song', 'joke', 'food', 'recipe',
        'capital', 'president', 'history', 'geography', 'math problem',
        'who is', 'what is the distance', 'how tall', 'how old', 'when was',
        'translate', 'poem', 'story', 'game', 'python', 'javascript code'
    ];

    const q = question.toLowerCase();

    // Check for off-topic indicators
    const hasOffTopic = offTopicIndicators.some(ind => q.includes(ind));

    // If very few EduBreezy-related keywords and has off-topic indicators
    if (hasOffTopic && keywords.length <= 1) {
        return true;
    }

    return false;
}

// Build prompt for fun off-topic responses
function buildOffTopicPrompt(question) {
    return `You are EduBreezy's friendly AI assistant with a fun, witty personality! 😄

The user asked: "${question}"

This question is NOT about school management or EduBreezy. Your job is to:
1. Acknowledge their question with humor (use emojis!)
2. Give a BRIEF, witty answer or fun fact (1-2 sentences max)
3. Make a clever comparison/transition back to EduBreezy
4. End with an invitation to learn about EduBreezy

RULES:
- Keep it SHORT (max 4-5 lines total)
- Use emojis liberally 
- Be playful and funny
- Always redirect to EduBreezy at the end
- Don't be preachy, be entertaining!

EXAMPLE FORMAT:
🌙 Ooh, space talk! The Moon is 384,400 km from Earth... BUT you know what's further? The distance between traditional school admin and EduBreezy! 🚀

One is stuck in the stone age, the other is in the future! Want to explore the EduBreezy universe? 🌌

YOUR TURN - BE CREATIVE AND FUNNY:`;
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

        // Step 0: Check if it's a pricing question
        if (isPricingQuestion(question)) {
            const pricing = calculatePricing(question);
            const answer = generatePricingResponse(pricing);

            return NextResponse.json({
                answer,
                source: 'pricing',
                cached: false,
            });
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
            const answer = faqMatch.answer + " Would you like a demo to see this in action? 🎯";
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

        // Check for off-topic questions BEFORE saying we can't understand
        if (isOffTopicQuestion(question, keywords)) {
            // Use AI to generate a fun, context-aware response
            const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
            if (apiKey) {
                try {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({
                        model: MODEL_NAME,
                        generationConfig: {
                            maxOutputTokens: 200,
                            temperature: 0.9, // Higher for more creative/fun responses
                        },
                    });

                    const prompt = buildOffTopicPrompt(question);
                    const result = await model.generateContent(prompt);
                    const funAnswer = result.response.text()?.trim();

                    if (funAnswer) {
                        return NextResponse.json({
                            answer: funAnswer,
                            source: 'fun-ai',
                            cached: false,
                        });
                    }
                } catch (error) {
                    console.error('Fun response AI error:', error);
                }
            }

            // Fallback if AI fails
            return NextResponse.json({
                answer: `🤔 Hmm, that's an interesting question! But I'm like a loyal school bell - I only ring for school stuff! 🔔\n\nI'm EduBreezy's AI buddy, and I'm REALLY good at talking about:\n• 📚 School management features\n• 💰 Pricing & calculations\n• 🔒 Security & data safety\n• 📱 Mobile apps & parent communication\n\nThink of me as your friendly school nerd! 🤓\n\nWhat would you like to know about making your school AWESOME? 🚀`,
                source: 'fun-fallback',
                cached: false,
            });
        }

        if (keywords.length === 0) {
            return NextResponse.json({
                answer: "🤔 Hmm, I didn't quite catch that! Could you rephrase?\n\nI'm great at answering questions about:\n• 📚 EduBreezy features\n• 💰 Pricing & costs\n• 🔒 Security\n• 📱 Mobile apps\n\nWant me to show you around? 🚀",
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
        const answer = response.text()?.trim() || "I'd be happy to help you learn more! Would you like to schedule a demo? 🎯";

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
            { error: 'Oops! Something went wrong 😅 Please try again!' },
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
