/**
 * Time-Aware Formatter
 * Adjusts the tone and phrasing of insights based on time of day
 * Uses school hours from AttendanceConfig
 */

/**
 * Time periods for tone adjustment
 */
export const TIME_PERIODS = {
    BEFORE_SCHOOL: 'BEFORE_SCHOOL',
    EARLY_MORNING: 'EARLY_MORNING',
    LATE_MORNING: 'LATE_MORNING',
    MIDDAY: 'MIDDAY',
    AFTERNOON: 'AFTERNOON',
    AFTER_SCHOOL: 'AFTER_SCHOOL',
};

/**
 * Tone types
 */
export const TONES = {
    ANTICIPATORY: 'ANTICIPATORY',  // Before things happen
    SOFT: 'SOFT',                   // Early, gentle reminders
    NEUTRAL: 'NEUTRAL',             // Factual updates
    ACTION: 'ACTION',               // Suggest action
    CLOSING: 'CLOSING',             // End of day summary
};

/**
 * Get current time period based on school hours
 * @param {Object} schoolConfig - School config with defaultStartTime/defaultEndTime
 * @returns {string} TIME_PERIOD constant
 */
export function getTimePeriod(schoolConfig = {}) {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Parse school times (format: "HH:MM")
    const startTime = schoolConfig.defaultStartTime || '09:00';
    const endTime = schoolConfig.defaultEndTime || '17:00';

    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);

    // Determine period
    if (hour < startHour - 1) {
        return TIME_PERIODS.BEFORE_SCHOOL;
    } else if (hour < startHour + 1) {
        return TIME_PERIODS.EARLY_MORNING;
    } else if (hour < 12) {
        return TIME_PERIODS.LATE_MORNING;
    } else if (hour < 14) {
        return TIME_PERIODS.MIDDAY;
    } else if (hour < endHour) {
        return TIME_PERIODS.AFTERNOON;
    } else {
        return TIME_PERIODS.AFTER_SCHOOL;
    }
}

/**
 * Get appropriate tone for the time period
 */
export function getToneForPeriod(period) {
    const toneMap = {
        [TIME_PERIODS.BEFORE_SCHOOL]: TONES.ANTICIPATORY,
        [TIME_PERIODS.EARLY_MORNING]: TONES.SOFT,
        [TIME_PERIODS.LATE_MORNING]: TONES.NEUTRAL,
        [TIME_PERIODS.MIDDAY]: TONES.NEUTRAL,
        [TIME_PERIODS.AFTERNOON]: TONES.ACTION,
        [TIME_PERIODS.AFTER_SCHOOL]: TONES.CLOSING,
    };
    return toneMap[period] || TONES.NEUTRAL;
}

/**
 * Format attendance insight based on time
 */
function formatAttendanceByTime(stats, tone) {
    const { studentsPresent = 0, totalStudents = 0 } = stats;
    const percent = totalStudents > 0 ? Math.round((studentsPresent / totalStudents) * 100) : 0;

    // No attendance yet
    if (studentsPresent === 0) {
        switch (tone) {
            case TONES.ANTICIPATORY:
                return 'Attendance tracking will begin when school opens';
            case TONES.SOFT:
                return 'Attendance will update as students arrive';
            case TONES.NEUTRAL:
                return `Attendance: 0 of ${totalStudents} marked so far`;
            case TONES.ACTION:
                return 'No attendance marked today - please verify';
            case TONES.CLOSING:
                return 'No attendance was recorded today';
            default:
                return 'No attendance marked yet';
        }
    }

    // Has attendance
    switch (tone) {
        case TONES.SOFT:
            return `${studentsPresent} students checked in so far`;
        case TONES.NEUTRAL:
            return `${studentsPresent} of ${totalStudents} students present (${percent}%)`;
        case TONES.ACTION:
            return percent >= 90
                ? `Great attendance! ${percent}% students present`
                : `${percent}% attendance - ${totalStudents - studentsPresent} students absent`;
        case TONES.CLOSING:
            return `Today's attendance: ${studentsPresent}/${totalStudents} (${percent}%)`;
        default:
            return `${studentsPresent}/${totalStudents} students present`;
    }
}

/**
 * Format fee collection insight based on time
 */
function formatFeesByTime(stats, tone) {
    const { feesCollectedToday = 0, outstandingFees = 0 } = stats;

    // Format currency
    const formatCurrency = (amount) => {
        if (!amount || amount === 0) return '₹0';
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
        return `₹${amount}`;
    };

    // No collection yet
    if (feesCollectedToday === 0) {
        switch (tone) {
            case TONES.ANTICIPATORY:
            case TONES.SOFT:
                return 'Fee collection ready for today';
            case TONES.NEUTRAL:
                return 'No fees collected yet today';
            case TONES.ACTION:
                return outstandingFees > 0
                    ? `${formatCurrency(outstandingFees)} outstanding - consider sending reminders`
                    : 'No fees pending';
            case TONES.CLOSING:
                return 'No fee collection recorded today';
            default:
                return '₹0 collected today';
        }
    }

    // Has collection
    switch (tone) {
        case TONES.SOFT:
            return `${formatCurrency(feesCollectedToday)} received so far`;
        case TONES.NEUTRAL:
            return `${formatCurrency(feesCollectedToday)} collected today`;
        case TONES.ACTION:
            return outstandingFees > 0
                ? `${formatCurrency(feesCollectedToday)} collected, ${formatCurrency(outstandingFees)} still pending`
                : `${formatCurrency(feesCollectedToday)} collected - all fees received!`;
        case TONES.CLOSING:
            return `Today's collection: ${formatCurrency(feesCollectedToday)}`;
        default:
            return `${formatCurrency(feesCollectedToday)} collected`;
    }
}

/**
 * Format a complete summary based on time of day
 */
export function formatSummaryByTime(stats, schoolConfig = {}) {
    const period = getTimePeriod(schoolConfig);
    const tone = getToneForPeriod(period);

    const attendanceText = formatAttendanceByTime(stats, tone);
    const feesText = formatFeesByTime(stats, tone);

    // Build summary based on tone
    switch (tone) {
        case TONES.ANTICIPATORY:
            return `School day is about to begin. ${attendanceText}. ${feesText}.`;
        case TONES.SOFT:
            return `${attendanceText}. ${feesText}.`;
        case TONES.NEUTRAL:
            return `${attendanceText}. ${feesText}.`;
        case TONES.ACTION:
            return `${attendanceText}. ${feesText}.`;
        case TONES.CLOSING:
            return `${attendanceText}. ${feesText}.`;
        default:
            return `${attendanceText}. ${feesText}.`;
    }
}

/**
 * Get greeting based on time of day
 */
export function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}

/**
 * Adjust AI insight tone based on current time
 * This takes an AI-generated insight and adjusts its phrasing
 */
export function adjustInsightTone(insight, schoolConfig = {}) {
    const period = getTimePeriod(schoolConfig);
    const tone = getToneForPeriod(period);

    // If it's a closing tone, prefix with summary style
    if (tone === TONES.CLOSING) {
        // Don't modify much, just ensure it reads as a summary
        if (!insight.toLowerCase().includes('today')) {
            return insight.replace(/\.$/, ' today.');
        }
    }

    return insight;
}

export default {
    getTimePeriod,
    getToneForPeriod,
    formatSummaryByTime,
    getGreeting,
    adjustInsightTone,
    TIME_PERIODS,
    TONES,
};
