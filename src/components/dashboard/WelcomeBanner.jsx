'use client';
import { useEffect, useState } from 'react';
import { Sparkles, Sun, Moon, Cloud } from 'lucide-react';

export default function WelcomeBanner({ fullUser }) {
    const [greeting, setGreeting] = useState('');
    const [timeIcon, setTimeIcon] = useState(null);

    useEffect(() => {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) {
            setGreeting('Good Morning');
            setTimeIcon(<Sun className="w-8 h-8 text-primary" />);
        } else if (hour >= 12 && hour < 17) {
            setGreeting('Good Afternoon');
            setTimeIcon(<Cloud className="w-8 h-8 text-primary" />);
        } else if (hour >= 17 && hour < 21) {
            setGreeting('Good Evening');
            setTimeIcon(<Sun className="w-8 h-8 text-primary" />);
        } else {
            setGreeting("It's Late Night");
            setTimeIcon(<Moon className="w-8 h-8 text-primary" />);
        }
    }, []);

    return (
        <div className="rounded-2xl bg-muted p-6 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                    {/* Icon */}
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-background">
                        {timeIcon}
                    </div>

                    {/* Greeting text */}
                    <div className="space-y-1">
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                            {greeting}, {fullUser?.name?.split(' ')[0] || 'Admin'}! 👋
                        </h1>
                        <p className="text-sm font-medium text-muted-foreground">
                            Welcome back to your dashboard. Here's what's happening today.
                        </p>
                    </div>
                </div>

                {/* Sparkles decoration */}
                <div className="hidden md:flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-primary" />
                    <Sparkles className="w-5 h-5 text-primary/70" />
                    <Sparkles className="w-7 h-7 text-primary/50" />
                </div>
            </div>
        </div>
    );
}
