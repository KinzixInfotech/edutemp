// middleware.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// In-memory storage for API metrics
const apiMetrics = new Map();

export async function middleware(request) {
    const { pathname } = request.nextUrl;
    const hostname = request.headers.get('host') || '';

    // ============================================
    // AUTH CALLBACK FALLBACK
    // ============================================
    // If Supabase redirects to root (likely due to missing whitelist entry),
    // forward the code to the callback handler to complete login.
    if (pathname === '/' && request.nextUrl.searchParams.has('code')) {
        const callbackUrl = new URL('/auth/callback', request.url);
        callbackUrl.search = request.nextUrl.search;
        // Default to reset-password if type is recovery (though usually type isn't passed in search params)
        // We preserve next param if it exists, otherwise it defaults to dashboard in the callback
        return NextResponse.redirect(callbackUrl);
    }

    // ============================================
    // DOMAIN-BASED ROUTING (School Explorer & Fee Payment)
    // ============================================

    // Check if request is for school subdomain
    const isSchoolDomain = hostname.includes('school.edubreezy.com') ||
        hostname.includes('school.localhost');

    // Check if request is for pay subdomain
    const isPayDomain = hostname.includes('pay.edubreezy.com') ||
        hostname.includes('pay.localhost');

    // Check if request is for teacher subdomain
    const isTeacherDomain = hostname.includes('teacher.edubreezy.com') ||
        hostname.includes('teacher.localhost');

    // Skip domain routing for static files and API routes
    const skipDomainRouting = pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname === '/favicon.ico';

    if (!skipDomainRouting) {
        // Handle school.edubreezy.com subdomain
        if (isSchoolDomain) {
            // For root path, REWRITE to /explore (not redirect) - prevents redirect loop for SEO
            if (pathname === '/') {
                const exploreUrl = new URL('/explore', request.url);
                return NextResponse.rewrite(exploreUrl);
            }

            // Only allow /explore routes on school subdomain
            // Use rewrite for non-explore paths to avoid redirect chains
            if (!pathname.startsWith('/explore')) {
                const exploreUrl = new URL('/explore', request.url);
                return NextResponse.rewrite(exploreUrl);
            }

            // Public routes don't need auth - continue to next middleware section
        }

        // Handle pay.edubreezy.com subdomain
        if (isPayDomain) {
            // For root path, REWRITE to /pay
            if (pathname === '/') {
                const payUrl = new URL('/pay', request.url);
                return NextResponse.rewrite(payUrl);
            }

            // Only allow /pay routes on pay subdomain
            if (!pathname.startsWith('/pay')) {
                const payUrl = new URL('/pay', request.url);
                return NextResponse.rewrite(payUrl);
            }

            // Pay portal doesn't need Supabase auth - uses session tokens
            return NextResponse.next();
        }

        // Handle teacher.edubreezy.com subdomain
        if (isTeacherDomain) {
            // For root path, REWRITE to /teacher
            if (pathname === '/') {
                const teacherUrl = new URL('/teacher', request.url);
                return NextResponse.rewrite(teacherUrl);
            }

            // Only allow /teacher routes on teacher subdomain
            if (!pathname.startsWith('/teacher')) {
                const teacherUrl = new URL('/teacher', request.url);
                return NextResponse.rewrite(teacherUrl);
            }

            // Teacher portal uses session tokens, not Supabase auth
            return NextResponse.next();
        }

        // Handle main domain (edubreezy.com)
        // Redirect /explore routes to school subdomain
        if (!isSchoolDomain && !isPayDomain && !isTeacherDomain && pathname.startsWith('/explore')) {
            const schoolUrl = new URL(request.url);
            schoolUrl.hostname = 'school.edubreezy.com';
            return NextResponse.redirect(schoolUrl, { status: 301 });
        }

        // Redirect /pay routes to pay subdomain
        if (!isPayDomain && !isSchoolDomain && !isTeacherDomain && pathname.startsWith('/pay')) {
            const payUrl = new URL(request.url);
            payUrl.hostname = 'pay.edubreezy.com';
            return NextResponse.redirect(payUrl, { status: 301 });
        }

        // Redirect /teacher routes to teacher subdomain
        if (!isTeacherDomain && !isPayDomain && !isSchoolDomain && pathname.startsWith('/teacher')) {
            const teacherUrl = new URL(request.url);
            teacherUrl.hostname = 'teacher.edubreezy.com';
            return NextResponse.redirect(teacherUrl, { status: 301 });
        }
    }

    // ============================================
    // AUTH PROTECTION
    // ============================================

    // Define protected routes
    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/reset-password');
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

        // Use getUser() for secure authentication (validates with Supabase server)
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

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

    const startTime = Date.now();
    const response = NextResponse.next();

    // Track metrics after response (non-blocking)
    const responseTime = Date.now() - startTime;
    trackMetric(pathname, request.method, response.status, responseTime);

    return response;
}

// Maximum number of unique endpoints to track (prevents memory leak)
const MAX_METRICS_ENTRIES = 200;

function trackMetric(endpoint, method, statusCode, responseTime) {
    const key = `${method}:${endpoint}`;

    // Prevent memory leak: limit entries and clean old ones periodically
    if (apiMetrics.size >= MAX_METRICS_ENTRIES && !apiMetrics.has(key)) {
        // Remove oldest entry (first in Map)
        const firstKey = apiMetrics.keys().next().value;
        apiMetrics.delete(firstKey);
    }

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

    // Track response times (keep last 50 instead of 100 to save memory)
    metrics.responseTimes.push(responseTime);
    if (metrics.responseTimes.length > 50) {
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
        '/explore/:path*',   // For school subdomain routing
        '/pay/:path*',       // For pay subdomain routing
        '/teacher/:path*',   // For teacher subdomain routing
        '/',                 // For root subdomain redirect
        '/reset-password',   // Check auth for reset password
    ],
};
