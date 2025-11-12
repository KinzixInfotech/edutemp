// middleware.js
import { NextResponse } from 'next/server';

// In-memory storage for API metrics
const apiMetrics = new Map();

export async function middleware(request) {
    const { pathname } = request;

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

export const config = {
    matcher: '/api/:path*',
};

