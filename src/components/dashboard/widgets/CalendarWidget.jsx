'use client';
import { useQuery } from '@tanstack/react-query';
import { CloudSun, Sun, Cloud, CloudRain, Snowflake, Clock, Calendar } from "lucide-react";
import { useState, useEffect } from 'react';
import WidgetContainer from "./WidgetContainer";

const fetchWeather = async () => {
    try {
        // Default to New Delhi coordinates (28.61, 77.20)
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=28.61&longitude=77.20&current=temperature_2m,weather_code&timezone=auto');
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
};

export default function CalendarWidget({ fullUser, onRemove }) {
    const { data: weatherData } = useQuery({
        queryKey: ['weather'],
        queryFn: fetchWeather,
        staleTime: 1000 * 60 * 30, // 30 mins
    });

    const { data: upcomingData } = useQuery({
        queryKey: ['upcoming-events', fullUser?.schoolId],
        queryFn: async () => {
            if (!fullUser?.schoolId) return null;
            const res = await fetch(`/api/schools/${fullUser.schoolId}/calendar/upcoming?limit=3`);
            if (!res.ok) return { events: [] };
            return res.json();
        },
        enabled: !!fullUser?.schoolId,
        staleTime: 1000 * 60 * 5,
    });

    const upcomingEvents = upcomingData?.events || [];
    const [currentTime, setCurrentTime] = useState(null);

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const temp = weatherData?.current?.temperature_2m;
    const weatherCode = weatherData?.current?.weather_code;

    // Simple weather icon mapping
    const getWeatherIcon = (code) => {
        if (code === undefined) return CloudSun;
        if (code <= 3) return Sun;
        if (code <= 48) return Cloud;
        if (code <= 67) return CloudRain;
        if (code <= 77) return Snowflake;
        return CloudSun;
    };

    const WeatherIcon = getWeatherIcon(weatherCode);

    return (
        <WidgetContainer title="Calendar & Weather" onRemove={onRemove} className="col-span-1 h-full">
            <div className="flex flex-col h-full">
                {/* Header: Weather & Time */}
                <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-600">
                            <WeatherIcon className="h-5 w-5" />
                        </div>
                        {temp !== undefined && (
                            <span className="text-lg font-bold text-foreground">{Math.round(temp)}°C</span>
                        )}
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-foreground">
                            {currentTime ? currentTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '--:--'}
                        </span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            {currentTime ? currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                        </span>
                    </div>
                </div>

                {/* Mini Calendar with Event Indicators */}
                <div className="flex-1 flex flex-col">
                    <div className="grid grid-cols-7 gap-2 text-center mb-3">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <span key={i} className="text-xs font-semibold text-muted-foreground">{d}</span>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-center">
                        {(() => {
                            if (!currentTime) return null;
                            const today = currentTime.getDate();
                            const currentMonth = currentTime.getMonth();
                            const currentYear = currentTime.getFullYear();
                            const firstDay = new Date(currentYear, currentMonth, 1).getDay();
                            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

                            const days = [];
                            for (let i = 0; i < firstDay; i++) {
                                days.push(<div key={`empty-${i}`} />);
                            }
                            for (let i = 1; i <= daysInMonth; i++) {
                                const isToday = i === today;
                                const dateStr = new Date(currentYear, currentMonth, i).toDateString();
                                const hasEvent = upcomingEvents.some(e => new Date(e.startDate).toDateString() === dateStr);

                                days.push(
                                    <div
                                        key={i}
                                        className={`
                                            aspect-square text-sm font-medium rounded-lg 
                                            flex flex-col items-center justify-center 
                                            relative transition-all duration-200 cursor-pointer
                                            border
                                            ${isToday
                                                ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                                                : 'text-foreground border-border/40 hover:border-primary/50 hover:bg-muted/50'
                                            }
                                        `}
                                    >
                                        <span>{i}</span>
                                        {hasEvent && !isToday && (
                                            <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500" />
                                        )}
                                        {hasEvent && isToday && (
                                            <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-foreground" />
                                        )}
                                    </div>
                                );
                            }
                            return days;
                        })()}
                    </div>

                    {/* Next Event Preview */}
                    <div className="mt-4 pt-3 border-t border-border/40">
                        <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Next Event</h5>
                        {upcomingEvents?.length > 0 ? (
                            <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 border border-border/40">
                                <div className={`w-1 h-8 rounded-full flex-shrink-0`} style={{ backgroundColor: upcomingEvents[0].color || '#3B82F6' }} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium truncate">{upcomingEvents[0].title}</p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                            {upcomingEvents[0].startTime ? upcomingEvents[0].startTime : 'All Day'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground text-center py-2">No upcoming events</p>
                        )}
                    </div>
                </div>
            </div>
        </WidgetContainer>
    );
}
