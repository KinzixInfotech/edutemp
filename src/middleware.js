// middleware.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// In-memory storage for API metrics
const apiMetrics = new Map();

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    // ============================================
    // AUTH PROTECTION
    // ============================================

    // Define protected routes
    const isProtectedRoute = pathname.startsWith('/dashboard');
    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isPublicRoute = pathname === '/' || pathname.startsWith('/api/auth');

    if (isProtectedRoute || isAuthRoute) {
        // Check env vars
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.next();
        }

        let supabaseResponse = NextResponse.next({ request });

        const supabase = createServerClient(
            supabaseUrl,
            supabaseKey,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            request.cookies.set(name, value);
                        });
                        supabaseResponse = NextResponse.next({ request });
                        cookiesToSet.forEach(({ name, value, options }) => {
                            supabaseResponse.cookies.set(name, value, options);
                        });
                    },
                },
            }
        );

        // Try getSession first (less strict)
        const {
            data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;

        // Redirect logic
        if (isProtectedRoute && !user) {
            // Redirect to login if trying to access protected route without auth
            const redirectUrl = new URL('/login', request.url);
            redirectUrl.searchParams.set('redirectTo', pathname);
            return NextResponse.redirect(redirectUrl);
        }

        if (isAuthRoute && user) {
            // Redirect to dashboard if already logged in
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        return supabaseResponse;
    }

    // ============================================
    // API METRICS TRACKING
    // ============================================

    // Only track API routes, skip health endpoint
    if (!pathname.startsWith('/api') || pathname === '/api/health' || pathname.includes('/api/health/')) {
        return NextResponse.next();
    }

    // Only track API routes, skip health endpoint
    if (!pathname.startsWith('/api') || pathname === '/api/health' || pathname.includes('/api/health/')) {
        return NextResponse.next();
    }

    const startTime = Date.now();
    const response = NextResponse.next();

    // Track metrics after response (non-blocking)
    const responseTime = Date.now() - startTime;
    trackMetric(pathname, request.method, response.status, responseTime);

    return response;
}

function trackMetric(endpoint, method, statusCode, responseTime) {
    const key = `${method}:${endpoint}`;

    let metrics = apiMetrics.get(key) || {
        endpoint,
        method,
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        responseTimes: [],
        avgResponseTime: 0,
        lastSuccess: null,
        lastFailure: null,
        lastChecked: new Date(),
        status: 'healthy',
        healthScore: 100,
    };

    const isSuccess = statusCode >= 200 && statusCode < 400;

    metrics.totalRequests++;
    metrics.successCount += isSuccess ? 1 : 0;
    metrics.errorCount += isSuccess ? 0 : 1;
    metrics.lastChecked = new Date();

    // Track response times (keep last 100)
    metrics.responseTimes.push(responseTime);
    if (metrics.responseTimes.length > 100) {
        metrics.responseTimes.shift();
    }
    metrics.avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;

    metrics.lastSuccess = isSuccess ? new Date() : metrics.lastSuccess;
    metrics.lastFailure = !isSuccess ? new Date() : metrics.lastFailure;

    // Calculate health status
    const errorRate = metrics.errorCount / metrics.totalRequests;
    const isSlowResponse = metrics.avgResponseTime > 5000;
    const recentFailures = Math.max(0, metrics.errorCount - (metrics.totalRequests - 10));
    const hasConsecutiveFailures = recentFailures >= 5;

    if (hasConsecutiveFailures || errorRate > 0.5) {
        metrics.status = 'down';
        metrics.healthScore = 0;
    } else if (errorRate > 0.1 || metrics.avgResponseTime > 10000) {
        metrics.status = 'degraded';
        metrics.healthScore = 50;
    } else if (errorRate > 0.05 || isSlowResponse) {
        metrics.status = 'warning';
        metrics.healthScore = 70;
    } else {
        metrics.status = 'healthy';
        metrics.healthScore = 100;
    }

    metrics.healthDetails = {
        errorRate: (errorRate * 100).toFixed(2) + '%',
        avgResponseTime: Math.round(metrics.avgResponseTime) + 'ms',
        recentFailures,
    };

    apiMetrics.set(key, metrics);
}

export function getHealthMetrics() {
    return apiMetrics;
}

console.log('Middleware file loaded');

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/login',
        '/signup',
        '/api/auth/:path*',
    ],
};
