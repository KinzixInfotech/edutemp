'use client'
import React from 'react';

/**
 * QuoteSection - A full-width motivational quote section
 * 
 * @param {string} quote - The main quote text
 * @param {string} author - Optional author name
 * @param {string} role - Optional author role/title or company
 * @param {string} variant - 'light' | 'dark' | 'gradient'
 * @param {string} className - Additional CSS classes
 */
export default function QuoteSection({
    quote = "The future of education is not in teaching the same to everyone, but in treating everyone the same with a unique approach.",
    author,
    role,
    variant = 'light',
    className = ''
}) {
    const variants = {
        light: {
            bg: 'bg-[#f5f5f5]',
            quoteText: 'text-[#333]',
            authorText: 'text-[#666]'
        },
        dark: {
            bg: 'bg-[#1a1a2e]',
            quoteText: 'text-white',
            authorText: 'text-white/70'
        },
        gradient: {
            bg: 'bg-gradient-to-br from-[#f0f7ff] via-[#fff9f0] to-[#f0f7ff]',
            quoteText: 'text-[#1a1a2e]',
            authorText: 'text-[#666]'
        },
        blue: {
            bg: 'bg-[#0569ff]',
            quoteText: 'text-white',
            authorText: 'text-white/80'
        }
    };

    const style = variants[variant] || variants.light;

    return (
        <section className={`${style.bg} ${className}`}>
            <div className="max-w-5xl mx-auto px-6 md:px-12 py-20 md:py-28 lg:py-32">
                <div className="text-center">
                    {/* Main Quote */}
                    <p className={`text-2xl md:text-3xl lg:text-4xl xl:text-[2.75rem] font-light italic leading-relaxed md:leading-relaxed lg:leading-[1.4] ${style.quoteText} mb-8 md:mb-10`}>
                        "{quote}"
                    </p>

                    {/* Author Info */}
                    {(author || role) && (
                        <div className={`flex items-center justify-center gap-2 ${style.authorText}`}>
                            <span className="text-base md:text-lg">
                                — {author}{role && `, ${role}`}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Shimmer Animation */}
            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
            `}</style>
        </section>
    );
}

// Pre-configured variants for common use cases
export function MotivationalQuote({ className }) {
    return (
        <QuoteSection
            quote="Education is the most powerful weapon which you can use to change the world."
            author="Nelson Mandela"
            variant="light"
            className={className}
        />
    );
}

export function SystemQuote({ className }) {
    return (
        <QuoteSection
            quote="A good system simplifies complexity. It doesn't add to it."
            variant="gradient"
            className={className}
        />
    );
}

export function TransformationQuote({ className }) {
    return (
        <QuoteSection
            quote="We're not just building software. We're building the future of how schools connect, communicate, and create impact."
            author="Co-Founder, EduBreezy"
            variant="light"
            className={className}
        />
    );
}

export function TestimonialQuote({ quote, author, role, className }) {
    return (
        <QuoteSection
            quote={quote}
            author={author}
            role={role}
            variant="light"
            className={className}
        />
    );
}
