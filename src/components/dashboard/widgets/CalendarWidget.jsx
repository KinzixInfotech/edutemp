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
            <div className="flex flex-col h-full gap-2.5">
                {/* Weather Card */}
                <div className={`rounded-lg bg-gradient-to-br ${getWeatherBg(weatherCode)} p-3 border border-border/30`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/60 dark:bg-white/10 backdrop-blur-sm">
                                <WeatherIcon className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-foreground">
                                        {temp !== undefined ? Math.round(temp) : '--'}
                                    </span>
                                    <span className="text-sm text-muted-foreground">°C</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-base font-semibold text-foreground">
                                {currentTime ? currentTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '--:--'}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                                {currentTime ? currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                            </div>
                        </div>
                    </div>

                    {/* Location - Separate row */}
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                            {locationName.district || locationName.state
                                ? `${locationName.district}${locationName.district && locationName.state ? ', ' : ''}${locationName.state}`
                                : 'Loading location...'}
                        </span>
                    </div>

                    {/* Mini weather stats */}
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-foreground/10">
                        {humidity !== undefined && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Droplets className="h-3 w-3 text-blue-400" />
                                <span>{humidity}%</span>
                            </div>
                        )}
                        {windSpeed !== undefined && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Wind className="h-3 w-3 text-emerald-400" />
                                <span>{Math.round(windSpeed)} km/h</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={i} className="text-center py-0.5">
                                <span className={`text-[9px] font-bold tracking-wide ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-muted-foreground/80'
                                    }`}>
                                    {d}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7 gap-1 flex-1">
                        {(() => {
                            if (!currentTime) return null;
                            const today = currentTime.getDate();
                            const currentMonth = currentTime.getMonth();
                            const currentYear = currentTime.getFullYear();
                            const firstDay = new Date(currentYear, currentMonth, 1).getDay();
                            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

                            const days = [];
                            for (let i = 0; i < firstDay; i++) {
                                days.push(<div key={`empty-${i}`} className="h-9" />);
                            }
                            for (let i = 1; i <= daysInMonth; i++) {
                                const isToday = i === today;
                                const dateStr = new Date(currentYear, currentMonth, i).toDateString();
                                const hasEvent = upcomingEvents.some(e => new Date(e.startDate).toDateString() === dateStr);
                                const dayOfWeek = new Date(currentYear, currentMonth, i).getDay();
                                const isPast = i < today;

                                days.push(
                                    <div
                                        key={i}
                                        className={`
                                            w-9 h-9 mx-auto rounded-full flex items-center justify-center relative
                                            text-[11px] font-semibold transition-all duration-150 cursor-pointer
                                            ${isToday
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : isPast
                                                    ? 'text-muted-foreground/40 hover:bg-muted/30'
                                                    : dayOfWeek === 0
                                                        ? 'text-rose-500 hover:bg-rose-100/50 dark:hover:bg-rose-500/10'
                                                        : dayOfWeek === 6
                                                            ? 'text-blue-500 hover:bg-blue-100/50 dark:hover:bg-blue-500/10'
                                                            : 'text-foreground hover:bg-muted/50'
                                            }
                                            ${hasEvent && !isToday ? 'ring-1 ring-blue-400/40' : ''}
                                        `}
                                    >
                                        {i}
                                        {hasEvent && (
                                            <div className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2`}>
                                                <div className={`w-1 h-1 rounded-full ${isToday ? 'bg-primary-foreground' : 'bg-blue-500'}`} />
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return days;
                        })()}
                    </div>
                </div>

                {/* Next Event */}
                <div className="pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Next Event</span>
                    </div>
                    {upcomingEvents?.length > 0 ? (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer">
                            <div
                                className="w-0.5 h-8 rounded-full flex-shrink-0"
                                style={{ backgroundColor: upcomingEvents[0].color || '#3B82F6' }}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-foreground truncate">{upcomingEvents[0].title}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground">
                                        {upcomingEvents[0].startTime || 'All Day'} • {new Date(upcomingEvents[0].startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-2 text-[10px] text-muted-foreground bg-muted/30 rounded-md">
                            No upcoming events
                        </div>
                    )}
                </div>
            </div>
        </WidgetContainer>
    );
}
