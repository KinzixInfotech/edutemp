'use client';
import { useEffect, useState, useMemo } from 'react';
import { ChevronRight, BarChart3, Plus, Sparkles, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDashboardContext } from '@/hooks/useDashboardContext';
import { useAiInsights } from '@/hooks/useAiInsights';

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
                return `Good ${greeting}, ${firstName}
                . It's Sunday! School is closed today. Enjoy your weekend and prepare for the upcoming week.`;
            } else if (dayType === 'HOLIDAY') {
                return `Good ${greeting}, ${firstName}. Happy ${context?.holidayName || 'Holiday'}! School is closed today. Enjoy your time off.`;
            } else if (dayType === 'VACATION') {
                return `Good ${greeting}, ${firstName}. School is on vacation. Use this time to relax and plan for the next session.`;
            }
            return context?.messages?.general || `Good ${greeting}, ${firstName}. Have a great day!`;
        }

        // AI is allowed - use summary paragraph if available
        if (insightsData?.summary) {
            // Strip any greeting from AI summary to prevent duplicates like "Good night, Good morning"
            let cleanSummary = insightsData.summary
                .replace(/^(Good\s+)?(morning|afternoon|evening|night)[!,.\s]*/i, '')
                .trim();
            // Capitalize first letter if needed
            if (cleanSummary) {
                cleanSummary = cleanSummary.charAt(0).toUpperCase() + cleanSummary.slice(1);
            }
            return `Good ${greeting}, ${firstName}. ${cleanSummary}`;
        }

        // Fallback: use first insight if no summary
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

    return (
        <div className="rounded-2xl bg-white border dark:bg-[#1a1a1d] p-6 mb-3">
            {/* Header Row */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                {/* Left: Breadcrumb + Greeting */}
                <div>
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-xs mb-3">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">DASHBOARD</span>
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                        <span className="text-primary font-semibold">OVERVIEW</span>
                    </div>

                    {/* Greeting */}
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                        Welcome back, <span className="text-primary">{firstName}</span>
                    </h1>

                    {/* Role + School */}
                    <p className="text-sm text-muted-foreground">
                        {roleName} • {school}
                    </p>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <Button className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-lg px-5">
                        <Plus className="w-4 h-4" />
                        Quick Action
                    </Button>
                    {/* <Link href="/dashboard/fees/reports">
                        <Button variant="outline" className="gap-2 rounded-lg px-5 border-gray-300 dark:border-gray-700">
                            <BarChart3 className="w-4 h-4" />
                            Reports
                        </Button>
                    </Link> */}
                </div>
            </div>

            {/* AI Briefing Card */}
            <div className="flex items-start gap-4 bg-[#f8fafc] dark:bg-[#222225] rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                {/* Left: Sparkle Icon */}
                <div className="flex-shrink-0 mt-1">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                        <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>

                {/* Middle: Content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                            AI {greeting.toUpperCase()} BRIEFING
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded uppercase">
                            SMART
                        </span>
                    </div>

                    {/* Message */}
                    <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {isLoading ? (
                            <span className="flex items-center gap-2 text-gray-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Analyzing your dashboard...
                            </span>
                        ) : (
                            <span>
                                {displayedText}
                                {!isComplete && (
                                    <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />
                                )}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right: Star Icon */}
                <div className="flex-shrink-0 hidden md:block">
                    <Star className="w-8 h-8 text-gray-200 dark:text-gray-700" />
                </div>
            </div>
        </div>
    );
}
