'use client';
import { useEffect, useState, useMemo } from 'react';
import { ChevronRight, Sparkles, Loader2, Star } from 'lucide-react';
import { useDashboardContext } from '@/hooks/useDashboardContext';
import { useAiInsights } from '@/hooks/useAiInsights';
import Image from 'next/image';

// Typing effect hook
function useTypingEffect(text, speed = 30, enabled = true) {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!enabled || !text) {
            setDisplayedText(text || '');
            setIsComplete(true);
            return;
        }

        setDisplayedText('');
        setIsComplete(false);
        let index = 0;

        const timer = setInterval(() => {
            if (index < text.length) {
                setDisplayedText(text.slice(0, index + 1));
                index++;
            } else {
                setIsComplete(true);
                clearInterval(timer);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed, enabled]);

    return { displayedText, isComplete };
}

// Get initials from name
function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function WelcomeBanner({ fullUser, schoolName }) {
    const [greeting, setGreeting] = useState('');

    // Fetch AI context and insights
    const { data: context, isLoading: contextLoading } = useDashboardContext(fullUser?.schoolId);
    const { data: insightsData, isLoading: insightsLoading } = useAiInsights(fullUser?.schoolId, context?.aiAllowed);

    // Get time-based greeting
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            setGreeting('morning');
        } else if (hour >= 12 && hour < 17) {
            setGreeting('afternoon');
        } else if (hour >= 17 && hour < 21) {
            setGreeting('evening');
        } else {
            setGreeting('night');
        }
    }, []);

    // Determine what to display
    const summaryText = useMemo(() => {
        if (contextLoading) return '';

        const firstName = fullUser?.name?.split(' ')[0] || 'Admin';

        // Check if school is closed (non-working day)
        if (!context?.aiAllowed) {
            const dayType = context?.dayType;
            if (dayType === 'SUNDAY') {
                return `Good ${greeting}, ${firstName}. It's Sunday! School is closed today. Enjoy your weekend and prepare for the upcoming week.`;
            } else if (dayType === 'HOLIDAY') {
                return `Good ${greeting}, ${firstName}. Happy ${context?.holidayName || 'Holiday'}! School is closed today. Enjoy your time off.`;
            } else if (dayType === 'VACATION') {
                return `Good ${greeting}, ${firstName}. School is on vacation. Use this time to relax and plan for the next session.`;
            }
            return context?.messages?.general || `Good ${greeting}, ${firstName}. Have a great day!`;
        }

        // AI is allowed - use summary paragraph if available
        if (insightsData?.summary) {
            let cleanSummary = insightsData.summary
                .replace(/^(Good\s+)?(morning|afternoon|evening|night)[!,.\s]*/i, '')
                .trim();
            if (cleanSummary) {
                cleanSummary = cleanSummary.charAt(0).toUpperCase() + cleanSummary.slice(1);
            }
            return `Good ${greeting}, ${firstName}. ${cleanSummary}`;
        }

        if (insightsData?.insights?.length > 0) {
            return `Good ${greeting}, ${firstName}. ${insightsData.insights[0]}`;
        }

        return `Good ${greeting}, ${firstName}. Your dashboard is ready. Check the insights below for today's summary.`;
    }, [context, contextLoading, insightsData, greeting, fullUser?.name]);

    const isLoading = contextLoading || (context?.aiAllowed && insightsLoading);
    const { displayedText, isComplete } = useTypingEffect(summaryText, 20, !isLoading);

    const firstName = fullUser?.name?.split(' ')[0] || 'Admin';
    const roleName = fullUser?.role?.name === 'ADMIN' ? 'Administrator' : fullUser?.role?.name || 'User';
    const school = schoolName || fullUser?.school?.name || 'School';
    const userImage = fullUser?.profilePicture;
    const initials = getInitials(fullUser?.name);

    return (
        <div className="relative rounded-2xl overflow-hidden p-4 sm:p-6 mb-3" style={{ background: 'linear-gradient(135deg, #0469ff 0%, #0052cc 50%, #003d99 100%)' }}>
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Floating circles */}
                <div className="absolute top-4 right-8 w-20 h-20 rounded-full bg-white/5" />
                <div className="absolute top-12 right-24 w-8 h-8 rounded-full bg-white/10" />
                <div className="absolute bottom-6 left-10 w-16 h-16 rounded-full bg-white/5" />
                <div className="absolute top-1/2 right-1/4 w-12 h-12 rounded-full bg-white/8" />

                {/* Math symbols as decorative elements */}
                <span className="absolute top-6 right-16 text-3xl text-white/15 font-bold">+</span>
                <span className="absolute top-20 right-8 text-2xl text-white/10 font-bold">×</span>
                <span className="absolute bottom-12 right-20 text-4xl text-white/12 font-bold">÷</span>
                <span className="absolute top-1/3 right-12 text-xl text-white/10">○</span>
                <span className="absolute bottom-8 left-1/4 text-2xl text-white/8 font-bold">+</span>

                {/* Gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10" />
            </div>

            {/* Header Row */}
            <div className="relative z-10 flex items-start justify-between gap-4 mb-6">
                {/* Left: Breadcrumb + Greeting */}
                <div className="flex-1 min-w-0">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-xs mb-3">
                        <span className="text-white/70 font-medium">DASHBOARD</span>
                        <ChevronRight className="w-3 h-3 text-white/50" />
                        <span className="text-white font-semibold">OVERVIEW</span>
                    </div>

                    {/* Greeting */}
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
                        Welcome back, <span className="text-white/90">{firstName}</span>
                    </h1>

                    {/* Role + School */}
                    <p className="text-sm text-white/75">
                        {roleName} • {school}
                    </p>
                </div>

                {/* Right: User Profile Image */}
                <div className="flex-shrink-0">
                    <div className="relative">
                        {/* Profile Image/Avatar */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-4 ring-white/20 bg-white/10">
                            {userImage ? (
                                <img
                                    src={userImage}
                                    alt={fullUser?.name || 'User'}
                                    width={80}
                                    height={80}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white/20">
                                    <span className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                                        {initials}
                                    </span>
                                </div>
                            )}
                        </div>
                        {/* Online indicator */}
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-green-400 rounded-full ring-2 ring-white/30" />
                    </div>
                </div>
            </div>

            {/* AI Briefing Card - Black & White Theme */}
            <div className="relative z-10 flex items-start gap-3 sm:gap-4 bg-white/95 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-black/10 shadow-sm">
                {/* Left: Sparkle Icon */}
                <div className="flex-shrink-0 mt-0.5">
                    <div className="p-1.5 sm:p-2 bg-black/5 rounded-lg border border-black/5">
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                    </div>
                </div>

                {/* Middle: Content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] sm:text-xs font-bold text-black/80 uppercase tracking-wide">
                            AI {greeting.toUpperCase()} BRIEFING
                        </span>
                        <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold bg-black text-white rounded uppercase shadow-sm">
                            SMART
                        </span>
                    </div>

                    {/* Message */}
                    <div className="text-xs sm:text-sm text-black/90 leading-relaxed font-medium">
                        {isLoading ? (
                            <span className="flex items-center gap-2 text-black/50">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Analyzing your dashboard...
                            </span>
                        ) : (
                            <span>
                                {displayedText}
                                {!isComplete && (
                                    <span className="inline-block w-0.5 h-4 bg-black ml-0.5 animate-pulse align-middle" />
                                )}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right: Checkmark Icon */}
                <div className="flex-shrink-0 hidden md:block">
                    <div className="w-10 h-10 rounded-full bg-black/5 border border-black/5 flex items-center justify-center">
                        <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
}
