'use client';
import { useQuery } from '@tanstack/react-query';
import { CloudSun, Sun, Cloud, CloudRain, Snowflake, Clock, MapPin, Wind, Droplets } from "lucide-react";
import { useState, useEffect } from 'react';
import WidgetContainer from "./WidgetContainer";

// Fetch weather based on coordinates
const fetchWeather = async (lat, lon) => {
    try {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&timezone=auto`
        );
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
};

// Reverse geocode to get location name (state, district)
const fetchLocationName = async (lat, lon) => {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`
        );
        if (!res.ok) return null;
        const data = await res.json();
        const address = data.address || {};
        // Get district/city and state
        const district = address.city || address.town || address.county || address.state_district || '';
        const state = address.state || '';
        return { district, state };
    } catch (e) {
        return null;
    }
};

export default function CalendarWidget({ fullUser, onRemove, upcomingEvents: propEvents }) {
    const [coords, setCoords] = useState({ lat: 28.61, lon: 77.20 }); // Default: Delhi
    const [locationName, setLocationName] = useState({ district: '', state: '' });
    const [currentTime, setCurrentTime] = useState(null);

    // Get user's geolocation on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setCoords({ lat: latitude, lon: longitude });
                    // Fetch location name
                    const location = await fetchLocationName(latitude, longitude);
                    if (location) {
                        setLocationName(location);
                    }
                },
                (error) => {
                    console.log('Geolocation error:', error.message);
                },
                { timeout: 10000, enableHighAccuracy: false }
            );
        }
    }, []);

    const { data: weatherData } = useQuery({
        queryKey: ['weather', coords.lat, coords.lon],
        queryFn: () => fetchWeather(coords.lat, coords.lon),
        staleTime: 1000 * 60 * 30,
        enabled: !!coords.lat && !!coords.lon,
    });

    // Use prop events if provided (from consolidated API), otherwise fetch independently
    const { data: upcomingData } = useQuery({
        queryKey: ['upcoming-events', fullUser?.schoolId],
        queryFn: async () => {
            if (!fullUser?.schoolId) return null;
            const res = await fetch(`/api/schools/${fullUser.schoolId}/calendar/upcoming?limit=3`);
            if (!res.ok) return { events: [] };
            return res.json();
        },
        enabled: !!fullUser?.schoolId && !propEvents,
        staleTime: 1000 * 60 * 5,
    });

    const upcomingEvents = propEvents || upcomingData?.events || [];

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const temp = weatherData?.current?.temperature_2m;
    const weatherCode = weatherData?.current?.weather_code;
    const humidity = weatherData?.current?.relative_humidity_2m;
    const windSpeed = weatherData?.current?.wind_speed_10m;

    const getWeatherIcon = (code) => {
        if (code === undefined) return CloudSun;
        if (code <= 3) return Sun;
        if (code <= 48) return Cloud;
        if (code <= 67) return CloudRain;
        if (code <= 77) return Snowflake;
        return CloudSun;
    };

    const getWeatherBg = (code) => {
        if (code === undefined) return 'from-amber-500/20 to-orange-500/20';
        if (code <= 3) return 'from-amber-400/20 to-orange-400/20';
        if (code <= 48) return 'from-slate-400/20 to-gray-400/20';
        if (code <= 67) return 'from-blue-400/20 to-cyan-400/20';
        if (code <= 77) return 'from-blue-200/20 to-indigo-200/20';
        return 'from-amber-500/20 to-orange-500/20';
    };

    const WeatherIcon = getWeatherIcon(weatherCode);

    return (
        <WidgetContainer title="Calendar & Weather" onRemove={onRemove} className="col-span-1 h-full">
            <div className="flex flex-col h-full gap-4">
                {/* Weather Card */}
                <div className={`rounded-xl bg-gradient-to-br ${getWeatherBg(weatherCode)} p-4 border border-border/30`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-white/60 dark:bg-white/10 backdrop-blur-sm">
                                <WeatherIcon className="h-6 w-6 text-amber-500" />
                            </div>
                            <div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold text-foreground">
                                        {temp !== undefined ? Math.round(temp) : '--'}
                                    </span>
                                    <span className="text-sm text-muted-foreground">°C</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-semibold text-foreground">
                                {currentTime ? currentTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '--:--'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {currentTime ? currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                            </div>
                        </div>
                    </div>

                    {/* Location - Separate row */}
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">
                            {locationName.district || locationName.state
                                ? `${locationName.district}${locationName.district && locationName.state ? ', ' : ''}${locationName.state}`
                                : 'Loading location...'}
                        </span>
                    </div>

                    {/* Mini weather stats */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-foreground/10">
                        {humidity !== undefined && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Droplets className="h-3.5 w-3.5 text-blue-400" />
                                <span>{humidity}%</span>
                            </div>
                        )}
                        {windSpeed !== undefined && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Wind className="h-3.5 w-3.5 text-emerald-400" />
                                <span>{Math.round(windSpeed)} km/h</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1.5 mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={i} className="text-center py-1.5">
                                <span className={`text-[10px] font-bold tracking-wide ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-muted-foreground/80'
                                    }`}>
                                    {d}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7 gap-1.5 flex-1">
                        {(() => {
                            if (!currentTime) return null;
                            const today = currentTime.getDate();
                            const currentMonth = currentTime.getMonth();
                            const currentYear = currentTime.getFullYear();
                            const firstDay = new Date(currentYear, currentMonth, 1).getDay();
                            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

                            const days = [];
                            for (let i = 0; i < firstDay; i++) {
                                days.push(<div key={`empty-${i}`} className="aspect-square" />);
                            }
                            for (let i = 1; i <= daysInMonth; i++) {
                                const isToday = i === today;
                                const dateStr = new Date(currentYear, currentMonth, i).toDateString();
                                const hasEvent = upcomingEvents.some(e => new Date(e.startDate).toDateString() === dateStr);
                                const dayOfWeek = new Date(currentYear, currentMonth, i).getDay();
                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                const isPast = i < today;

                                days.push(
                                    <div
                                        key={i}
                                        className={`
                                            aspect-square rounded-xl flex items-center justify-center relative
                                            text-sm font-semibold transition-all duration-200 cursor-pointer
                                            ${isToday
                                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105 ring-2 ring-blue-400/30 ring-offset-1'
                                                : isPast
                                                    ? 'text-muted-foreground/40 hover:bg-muted/30'
                                                    : dayOfWeek === 0
                                                        ? 'text-rose-500 bg-rose-50/50 dark:bg-rose-500/5 hover:bg-rose-100 dark:hover:bg-rose-500/10 border border-rose-100/50 dark:border-rose-500/10'
                                                        : dayOfWeek === 6
                                                            ? 'text-blue-500 bg-blue-50/50 dark:bg-blue-500/5 hover:bg-blue-100 dark:hover:bg-blue-500/10 border border-blue-100/50 dark:border-blue-500/10'
                                                            : 'text-foreground bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-border/50'
                                            }
                                            ${hasEvent && !isToday ? 'ring-1 ring-blue-400/40' : ''}
                                        `}
                                    >
                                        {i}
                                        {hasEvent && (
                                            <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-blue-500'} animate-pulse`} />
                                            </div>
                                        )}
                                        {isToday && (
                                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-white" />
                                        )}
                                    </div>
                                );
                            }
                            return days;
                        })()}
                    </div>
                </div>

                {/* Next Event */}
                <div className="pt-3 border-t border-border/40">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next Event</span>
                    </div>
                    {upcomingEvents?.length > 0 ? (
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer">
                            <div
                                className="w-1 h-10 rounded-full flex-shrink-0"
                                style={{ backgroundColor: upcomingEvents[0].color || '#3B82F6' }}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">{upcomingEvents[0].title}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                        {upcomingEvents[0].startTime || 'All Day'} • {new Date(upcomingEvents[0].startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-3 text-xs text-muted-foreground bg-muted/30 rounded-lg">
                            No upcoming events
                        </div>
                    )}
                </div>
            </div>
        </WidgetContainer>
    );
}
