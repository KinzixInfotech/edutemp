/**
 * Live Hints Engine
 * Generates real-time, rule-based hints without AI calls (FREE)
 * 
 * These hints update on every page load based on current data
 * to make the dashboard feel dynamic 24/7
 */

/**
 * Hint categories matching the insight cards
 */
export const HINT_CATEGORIES = {
    ATTENDANCE: 'ATTENDANCE',
    FINANCIAL: 'FINANCIAL',
    EXAM: 'EXAM',
    EVENT: 'EVENT',
    GENERAL: 'GENERAL',
};

/**
 * Format currency in a readable way
 */
function formatCurrency(amount) {
    if (!amount || amount === 0) return '₹0';
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Calculate percentage change
 */
function percentChange(current, previous) {
    if (!previous || previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
}

/**
 * Get current time period
 */
function getTimePeriod(schoolConfig = {}) {
    const now = new Date();
    const hour = now.getHours();

    // Use school config if available, otherwise defaults
    const startHour = parseInt(schoolConfig.defaultStartTime?.split(':')[0]) || 9;
    const endHour = parseInt(schoolConfig.defaultEndTime?.split(':')[0]) || 17;

    if (hour < startHour) return 'BEFORE_SCHOOL';
    if (hour < startHour + 2) return 'EARLY_MORNING';
    if (hour < 12) return 'LATE_MORNING';
    if (hour < 14) return 'MIDDAY';
    if (hour < endHour) return 'AFTERNOON';
    return 'AFTER_SCHOOL';
}

/**
 * Generate attendance hints based on current data and time
 */
function generateAttendanceHints(stats, schoolConfig) {
    const hints = [];
    const timePeriod = getTimePeriod(schoolConfig);

    const { studentsPresent = 0, totalStudents = 0, staffPresent = 0, totalStaff = 0 } = stats;
    const studentPercent = totalStudents > 0 ? Math.round((studentsPresent / totalStudents) * 100) : 0;

    // No attendance marked yet
    if (studentsPresent === 0 && totalStudents > 0) {
        if (timePeriod === 'BEFORE_SCHOOL' || timePeriod === 'EARLY_MORNING') {
            hints.push({
                category: HINT_CATEGORIES.ATTENDANCE,
                title: 'Attendance Starting',
                hint: 'Attendance will update as students arrive',
                priority: 1,
            });
        } else if (timePeriod === 'LATE_MORNING') {
            hints.push({
                category: HINT_CATEGORIES.ATTENDANCE,
                title: 'No Attendance Yet',
                hint: `0 of ${totalStudents} students marked present`,
                priority: 2,
            });
        } else {
            hints.push({
                category: HINT_CATEGORIES.ATTENDANCE,
                title: 'Attendance Pending',
                hint: 'No attendance recorded for today',
                priority: 3,
            });
        }
    }
    // Some attendance marked
    else if (studentsPresent > 0) {
        hints.push({
            category: HINT_CATEGORIES.ATTENDANCE,
            title: 'Today\'s Attendance',
            hint: `${studentsPresent} of ${totalStudents} students present (${studentPercent}%)`,
            priority: 1,
        });
    }

    // Staff attendance
    if (staffPresent > 0 && totalStaff > 0) {
        const staffPercent = Math.round((staffPresent / totalStaff) * 100);
        hints.push({
            category: HINT_CATEGORIES.ATTENDANCE,
            title: 'Staff Attendance',
            hint: `${staffPresent}/${totalStaff} staff present (${staffPercent}%)`,
            priority: 2,
        });
    }

    // Compare to yesterday if available
    if (stats.yesterdayStudentsPresent && studentsPresent > 0) {
        const change = percentChange(studentsPresent, stats.yesterdayStudentsPresent);
        if (change !== null && Math.abs(change) >= 5) {
            hints.push({
                category: HINT_CATEGORIES.ATTENDANCE,
                title: 'Attendance Trend',
                hint: change > 0
                    ? `Up ${change}% from yesterday`
                    : `Down ${Math.abs(change)}% from yesterday`,
                priority: 3,
            });
        }
    }

    return hints;
}

/**
 * Generate fee collection hints
 */
function generateFeeHints(stats) {
    const hints = [];

    const {
        feesCollectedToday = 0,
        outstandingFees = 0,
        studentsWithDues = 0,
        yesterdayFeesCollected = 0,
        weeklyFeesTrend = null,
    } = stats;

    // Today's collection
    if (feesCollectedToday > 0) {
        let hint = `${formatCurrency(feesCollectedToday)} collected today`;

        // Add comparison if available
        if (yesterdayFeesCollected > 0) {
            const change = percentChange(feesCollectedToday, yesterdayFeesCollected);
            if (change !== null && Math.abs(change) >= 10) {
                hint += change > 0 ? ` (↑${change}%)` : ` (↓${Math.abs(change)}%)`;
            }
        }

        hints.push({
            category: HINT_CATEGORIES.FINANCIAL,
            title: 'Fee Collection',
            hint,
            priority: 1,
        });
    } else {
        hints.push({
            category: HINT_CATEGORIES.FINANCIAL,
            title: 'Fee Collection',
            hint: 'No fees collected yet today',
            priority: 2,
        });
    }

    // Outstanding fees
    if (outstandingFees > 0 && studentsWithDues > 0) {
        hints.push({
            category: HINT_CATEGORIES.FINANCIAL,
            title: 'Outstanding Fees',
            hint: `${formatCurrency(outstandingFees)} pending from ${studentsWithDues} students`,
            priority: 2,
        });
    } else if (outstandingFees === 0) {
        hints.push({
            category: HINT_CATEGORIES.FINANCIAL,
            title: 'Fees Status',
            hint: 'All fees collected! Great job!',
            priority: 1,
        });
    }

    // Weekly trend
    if (weeklyFeesTrend) {
        const { thisWeek, lastWeek } = weeklyFeesTrend;
        const change = percentChange(thisWeek, lastWeek);
        if (change !== null && Math.abs(change) >= 10) {
            hints.push({
                category: HINT_CATEGORIES.FINANCIAL,
                title: 'Weekly Trend',
                hint: change > 0
                    ? `${formatCurrency(thisWeek)} this week - up ${change}%`
                    : `Collection down ${Math.abs(change)}% from last week`,
                priority: 3,
            });
        }
    }

    return hints;
}

/**
 * Generate exam-related hints
 */
function generateExamHints(stats) {
    const hints = [];

    const { upcomingExams = [], recentExamResults = null } = stats;

    // Upcoming exams
    if (upcomingExams.length > 0) {
        const nextExam = upcomingExams[0];
        const daysUntil = Math.ceil((new Date(nextExam.date) - new Date()) / (1000 * 60 * 60 * 24));

        if (daysUntil <= 7) {
            hints.push({
                category: HINT_CATEGORIES.EXAM,
                title: 'Upcoming Exam',
                hint: daysUntil === 0
                    ? `${nextExam.title} is today!`
                    : daysUntil === 1
                        ? `${nextExam.title} is tomorrow`
                        : `${nextExam.title} in ${daysUntil} days`,
                priority: 1,
            });
        }
    }

    // Recent exam results
    if (recentExamResults) {
        const { examTitle, passRate, totalStudents, passed } = recentExamResults;
        hints.push({
            category: HINT_CATEGORIES.EXAM,
            title: 'Exam Results',
            hint: `${examTitle}: ${passed}/${totalStudents} passed (${passRate}%)`,
            priority: 2,
        });
    }

    return hints;
}

/**
 * Generate calendar event hints
 */
function generateEventHints(stats) {
    const hints = [];

    const { upcomingEvents = [] } = stats;

    if (upcomingEvents.length > 0) {
        const nextEvent = upcomingEvents[0];
        const eventDate = new Date(nextEvent.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

        hints.push({
            category: HINT_CATEGORIES.EVENT,
            title: nextEvent.title,
            hint: daysUntil === 0
                ? 'Today'
                : daysUntil === 1
                    ? 'Tomorrow'
                    : `In ${daysUntil} days`,
            priority: daysUntil <= 2 ? 1 : 2,
        });
    } else {
        hints.push({
            category: HINT_CATEGORIES.EVENT,
            title: 'School Calendar',
            hint: 'No upcoming events this week',
            priority: 3,
        });
    }

    return hints;
}

/**
 * Main function: Generate all live hints
 * @param {Object} stats - Dashboard statistics
 * @param {Object} schoolConfig - School configuration (timing, etc.)
 * @returns {Array} Array of hint objects, sorted by priority
 */
export function generateLiveHints(stats, schoolConfig = {}) {
    const allHints = [
        ...generateAttendanceHints(stats, schoolConfig),
        ...generateFeeHints(stats),
        ...generateExamHints(stats),
        ...generateEventHints(stats),
    ];

    // Sort by priority (lower = more important)
    return allHints.sort((a, b) => a.priority - b.priority);
}

/**
 * Get top hints for display (one per category)
 * @param {Object} stats - Dashboard statistics
 * @param {Object} schoolConfig - School configuration
 * @param {number} limit - Max hints to return
 * @returns {Array} Top hints
 */
export function getTopHints(stats, schoolConfig = {}, limit = 3) {
    const allHints = generateLiveHints(stats, schoolConfig);

    // Get one hint per category, prioritized
    const categories = new Set();
    const topHints = [];

    for (const hint of allHints) {
        if (!categories.has(hint.category) && topHints.length < limit) {
            categories.add(hint.category);
            topHints.push(hint);
        }
    }

    // Fill remaining slots if needed
    for (const hint of allHints) {
        if (topHints.length >= limit) break;
        if (!topHints.includes(hint)) {
            topHints.push(hint);
        }
    }

    return topHints.slice(0, limit);
}

export default {
    generateLiveHints,
    getTopHints,
    HINT_CATEGORIES,
};
