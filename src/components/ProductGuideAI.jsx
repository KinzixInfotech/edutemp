'use client';

/**
 * Product Guide AI Component
 * Premium AI-powered Q&A for homepage with suggested questions
 * 
 * Features:
 * - Suggested questions (clickable chips)
 * - Limited free text input (150 chars max)
 * - AI-powered responses with guardrails
 * - Related follow-up questions
 * - Response ratings (👍/👎)
 * - Quick action buttons
 */

import { useState, useMemo, useEffect } from 'react';
import { Sparkles, Send, Loader2, MessageCircle, Bot, ArrowRight, ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

// Suggested questions
const PRIMARY_QUESTIONS = [
    "What features does EduBreezy offer?",
    "Is EduBreezy suitable for CBSE / ICSE schools?",
    "How does AI help school administrators?",
    "Is student data secure in EduBreezy?",
    "How does fee management work?",
];

const SECONDARY_QUESTIONS = [
    "Does EduBreezy support exams and results?",
    "How easy is onboarding?",
    "Can I request a demo?",
];

// Related questions mapping
const RELATED_QUESTIONS = {
    features: [
        "How does fee management work?",
        "What about attendance tracking?",
        "Is there a mobile app?",
    ],
    cbse: [
        "How do report cards work?",
        "Does it support exam management?",
        "Can I customize grading patterns?",
    ],
    security: [
        "Where is data hosted?",
        "How do backups work?",
        "What user roles are supported?",
    ],
    fees: [
        "Can parents pay online?",
        "How do installments work?",
        "What about transport fees?",
    ],
    ai: [
        "What features does EduBreezy offer?",
        "Is student data secure in EduBreezy?",
        "How easy is onboarding?",
    ],
    exams: [
        "How do report cards work?",
        "Is there performance analytics?",
        "What about hall tickets?",
    ],
    transport: [
        "Is there GPS tracking?",
        "How do transport fees work?",
        "Is there a driver app?",
    ],
    default: [
        "What features does EduBreezy offer?",
        "Is student data secure in EduBreezy?",
        "Can I request a demo?",
    ],
};

// Quick action buttons based on answer content
const QUICK_ACTIONS = {
    fees: { label: "Explore Fee Module", href: "/features/docs#fees" },
    attendance: { label: "View Attendance Features", href: "/features/docs#attendance" },
    exams: { label: "Exam Management", href: "/features/docs#exams" },
    transport: { label: "Transport Features", href: "/features/docs#transport" },
    mobile: { label: "Download Parent App", href: "#app" },
    demo: { label: "Schedule Demo", href: "/contact" },
    security: { label: "Security Details", href: "/about" },
};

// Detect which category the answer relates to
function detectCategory(question, answer) {
    const text = (question + ' ' + answer).toLowerCase();

    if (text.includes('fee') || text.includes('payment') || text.includes('invoice')) return 'fees';
    if (text.includes('attendance') || text.includes('present') || text.includes('absent')) return 'attendance';
    if (text.includes('exam') || text.includes('result') || text.includes('report card')) return 'exams';
    if (text.includes('transport') || text.includes('bus') || text.includes('gps')) return 'transport';
    if (text.includes('app') || text.includes('mobile') || text.includes('parent')) return 'mobile';
    if (text.includes('demo') || text.includes('trial')) return 'demo';
    if (text.includes('secure') || text.includes('encrypt') || text.includes('backup')) return 'security';
    if (text.includes('cbse') || text.includes('icse') || text.includes('board')) return 'cbse';
    if (text.includes('feature') || text.includes('module')) return 'features';
    if (text.includes('ai') || text.includes('insight') || text.includes('intelligent')) return 'ai';

    return 'default';
}

export default function ProductGuideAI() {
    const [question, setQuestion] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showMoreQuestions, setShowMoreQuestions] = useState(false);
    const [rating, setRating] = useState(null); // 'up' | 'down' | null
    const [responseTime, setResponseTime] = useState(null);

    // Get related questions and actions based on current Q&A
    const category = useMemo(() => {
        if (!answer || !currentQuestion) return 'default';
        return detectCategory(currentQuestion, answer);
    }, [currentQuestion, answer]);

    const relatedQuestions = RELATED_QUESTIONS[category] || RELATED_QUESTIONS.default;
    const quickAction = QUICK_ACTIONS[category];

    const handleAsk = async (q) => {
        const questionToAsk = q || question;
        if (!questionToAsk.trim() || isLoading) return;

        setIsLoading(true);
        setAnswer('');
        setRating(null);
        setResponseTime(null);
        setCurrentQuestion(questionToAsk);
        setQuestion('');

        const startTime = Date.now();

        try {
            const response = await fetch('/api/product-guide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: questionToAsk }),
            });

            const data = await response.json();
            setResponseTime(((Date.now() - startTime) / 1000).toFixed(1));

            if (data.error) {
                setAnswer("I couldn't process that. Please try a different question or request a demo for personalized help.");
            } else {
                setAnswer(data.answer);
            }
        } catch (error) {
            setAnswer("Something went wrong. Please try again or contact us for help.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestedClick = (q) => {
        setQuestion(q);
        handleAsk(q);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (question.length > 150) return;
        handleAsk();
    };

    const handleRating = (type) => {
        setRating(type);
        // Could send to analytics here
    };

    return (
        <section className="py-20 md:py-28 px-5 bg-gradient-to-b from-white via-blue-50/30 to-white relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-br from-blue-400/10 via-purple-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-blue-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-[900px] mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-10">
                    <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-5">
                        <span className="w-2 h-2 bg-[#0569ff] rounded-full"></span>
                        AI-POWERED PRODUCT GUIDE
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                        Explore <span className="text-blue-600">EduBreezy Instantly</span>
                    </h2>
                    <p className="text-gray-600 text-lg max-w-xl mx-auto">
                        Ask our AI to understand features, security, pricing, and workflows in seconds.
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white/80 border backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden">
                    {/* Suggested Questions */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500 font-medium">Suggested questions</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {PRIMARY_QUESTIONS.map((q, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestedClick(q)}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 rounded-full border border-gray-200 transition-all duration-200 disabled:opacity-50"
                                >
                                    {q}
                                </button>
                            ))}

                            <AnimatePresence>
                                {showMoreQuestions && SECONDARY_QUESTIONS.map((q, index) => (
                                    <motion.button
                                        key={`secondary-${index}`}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        onClick={() => handleSuggestedClick(q)}
                                        disabled={isLoading}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 rounded-full border border-gray-200 transition-all duration-200 disabled:opacity-50"
                                    >
                                        {q}
                                    </motion.button>
                                ))}
                            </AnimatePresence>

                            <button
                                onClick={() => setShowMoreQuestions(!showMoreQuestions)}
                                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 rounded-full transition-colors"
                            >
                                {showMoreQuestions ? 'Show less' : 'More questions →'}
                            </button>
                        </div>
                    </div>

                    {/* Answer Display */}
                    <AnimatePresence>
                        {(answer || isLoading) && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="border-b border-gray-100"
                            >
                                <div className="p-6 bg-gradient-to-br from-blue-50/50 to-purple-50/30">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0469ff] flex items-center justify-center shadow-lg">
                                            <Bot className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1.5">
                                                <Sparkles className="w-3 h-3" />
                                                AI RESPONSE
                                                {responseTime && (
                                                    <span className="text-gray-400 font-normal ml-2">
                                                        • {responseTime}s
                                                    </span>
                                                )}
                                            </div>
                                            {isLoading ? (
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Thinking...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <TypewriterText text={answer} />

                                                    {/* Quick Action Button */}
                                                    {quickAction && (
                                                        <motion.a
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                        >
                                                            <Link
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors mb-4"
                                                                href={quickAction.href}
                                                            >

                                                                {quickAction.label}
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                            </Link>
                                                        </motion.a>
                                                    )}

                                                    {/* Rating Buttons */}
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="flex items-center gap-3 pt-3 border-t border-gray-200/50"
                                                    >
                                                        <span className="text-xs text-gray-400">Was this helpful?</span>
                                                        <button
                                                            onClick={() => handleRating('up')}
                                                            className={`p-1.5 rounded-lg transition-all ${rating === 'up'
                                                                ? 'bg-green-100 text-green-600'
                                                                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                                                                }`}
                                                        >
                                                            <ThumbsUp className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRating('down')}
                                                            className={`p-1.5 rounded-lg transition-all ${rating === 'down'
                                                                ? 'bg-red-100 text-red-600'
                                                                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                                                                }`}
                                                        >
                                                            <ThumbsDown className="w-4 h-4" />
                                                        </button>
                                                        {rating && (
                                                            <span className="text-xs text-green-600 ml-2">
                                                                Thanks for your feedback!
                                                            </span>
                                                        )}
                                                    </motion.div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Related Questions */}
                                    {!isLoading && answer && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 }}
                                            className="mt-5 pt-4 border-t border-gray-200/50"
                                        >
                                            <div className="text-xs font-medium text-gray-400 mb-3">
                                                Related questions
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {relatedQuestions.map((q, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => handleSuggestedClick(q)}
                                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                                                    >
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Input Area */}
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value.slice(0, 150))}
                                    placeholder="Ask about features, pricing, or security..."
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                                    disabled={isLoading}
                                />
                                <span className="absolute right-5 bottom-3 text-xs text-gray-400">
                                    {question.length}/150
                                </span>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || !question.trim()}
                                className="px-6 py-4 bg-[#0469ff] hover:cursor-pointer hover:bg-[#0469ff]/80 text-white font-semibold rounded-full shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        <span className="hidden sm:inline">Ask AI</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-3 text-center">
                            Powered by AI • Answers based on EduBreezy product knowledge
                        </p>
                    </form>
                </div>

                {/* CTA */}
                <div className="text-center mt-8">
                    <p className="text-gray-500 mb-4">Want a personalized walkthrough?</p>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <a
                            href="/features"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-full border border-gray-200 transition-colors"
                        >
                            See How EduBreezy Works
                            <ArrowRight className="w-4 h-4" />
                        </a>
                        <a
                            href="/contact"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-full transition-colors"
                        >
                            Request a Demo
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Parse markdown bold (**text**) into React elements
function parseMarkdown(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
}

// Typing animation component with bullet point and markdown support
function TypewriterText({ text }) {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        setDisplayedText('');
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayedText((prev) => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(interval);
            }
        }, 10); // Fast typing

        return () => clearInterval(interval);
    }, [text]);

    // Parse text into lines for proper bullet rendering
    const lines = displayedText.split('\n');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-700 leading-relaxed mb-4"
        >
            {lines.map((line, index) => {
                const trimmedLine = line.trim();
                // Check if line is a bullet point
                if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*') && !trimmedLine.startsWith('**')) {
                    const bulletContent = line.replace(/^[\s]*[•\-\*]\s*/, '');
                    return (
                        <div key={index} className="flex items-start gap-2 ml-2 my-1.5">
                            <span className="text-blue-500 font-bold mt-0.5">•</span>
                            <span className="flex-1">{parseMarkdown(bulletContent)}</span>
                        </div>
                    );
                }
                // Regular text with markdown parsing
                return line.trim() ? (
                    <p key={index} className="mb-2">{parseMarkdown(line)}</p>
                ) : null;
            })}
        </motion.div>
    );
}
