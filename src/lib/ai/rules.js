/**
 * Edge Case Rules & Static Messages
 * Controls what messages to show based on day type
 * 
 * CRITICAL: Rules decide WHEN & WHAT. AI only explains.
 */

import { DAY_TYPES } from './dayContextEngine';

/**
 * Static messages for non-AI days (holidays, Sundays, vacations)
 */
export const STATIC_MESSAGES = {
    // Holiday / Sunday / Vacation - No AI, show these
    [DAY_TYPES.HOLIDAY]: {
        attendance: 'Attendance not applicable today',
        fees: 'Fee collection paused today',
        notices: 'Enjoy your holiday!',
        general: 'School is closed today',
    },
    [DAY_TYPES.SUNDAY]: {
        attendance: 'Attendance not applicable today',
        fees: 'Fee collection paused today',
        notices: 'Enjoy your weekend!',
        general: 'School is closed today',
    },
    [DAY_TYPES.VACATION]: {
        attendance: 'Attendance not applicable during vacation',
        fees: 'Fee collection paused during vacation',
        notices: 'School is on vacation',
        general: 'School is on vacation',
    },

    // Exam Day - AI allowed, but softer tone
    [DAY_TYPES.EXAM]: {
        attendance: 'Attendance may vary due to exams',
        fees: null, // Normal fee messages allowed
        notices: 'Focus on exam-related updates',
        attendanceWarning: false, // Don't warn about low attendance
    },

    // Half Day - AI allowed, but softer tone
    [DAY_TYPES.HALF_DAY]: {
        attendance: 'Lower activity expected today',
        fees: null, // Normal fee messages allowed
        notices: null, // Normal notice messages allowed
        attendanceWarning: false, // Don't warn about "low" stats
    },

    // Normal Working Day - AI fully allowed
    [DAY_TYPES.WORKING]: {
        attendance: null, // AI can generate
        fees: null, // AI can generate
        notices: null, // AI can generate
        attendanceWarning: true, // Can warn about low attendance
    },
};

/**
 * Get static message for a module based on day type
 * @param {string} dayType - One of DAY_TYPES
 * @param {string} module - 'attendance', 'fees', 'notices', 'general'
 * @returns {string|null} Static message or null if AI should generate
 */
export function getStaticMessage(dayType, module) {
    const messages = STATIC_MESSAGES[dayType];
    if (!messages) return null;
    return messages[module] ?? null;
}

/**
 * Check if a specific warning type is allowed
 * @param {string} dayType - One of DAY_TYPES
 * @param {string} warningType - 'attendanceWarning', etc.
 * @returns {boolean}
 */
export function isWarningAllowed(dayType, warningType) {
    const messages = STATIC_MESSAGES[dayType];
    if (!messages) return true;
    return messages[warningType] !== false;
}

/**
 * Get attendance-specific rules
 */
export function getAttendanceRules(context) {
    const { dayType, isExamDay, isHalfDay } = context;

    return {
        // Can we mark attendance today?
        canMarkAttendance: context.attendanceExpected,

        // Should we show attendance percentage warnings?
        showLowAttendanceWarning: dayType === DAY_TYPES.WORKING,

        // What's the message if attendance not marked?
        notMarkedMessage: context.attendanceExpected
            ? 'Attendance not recorded yet'
            : getStaticMessage(dayType, 'attendance'),

        // Should we use softer tone?
        softerTone: isExamDay || isHalfDay,

        // Override message if any
        overrideMessage: getStaticMessage(dayType, 'attendance'),
    };
}

/**
 * Get fee-specific rules
 */
export function getFeeRules(context) {
    const { dayType, feeCollectionExpected } = context;

    return {
        // Can we collect fees today?
        canCollectFees: feeCollectionExpected,

        // Should we show fee alerts?
        showFeeAlerts: feeCollectionExpected,

        // What to show if fees not expected
        pausedMessage: getStaticMessage(dayType, 'fees'),

        // Should we suggest reminders?
        canSuggestReminders: dayType === DAY_TYPES.WORKING,
    };
}

/**
 * Get notice-specific rules
 */
export function getNoticeRules(context) {
    const { dayType, isExamDay } = context;

    return {
        // Can we suggest notices today?
        canSuggestNotices: dayType === DAY_TYPES.WORKING || isExamDay,

        // What type of notices to suggest on exam day
        suggestExamRelated: isExamDay,

        // Override message if any
        overrideMessage: getStaticMessage(dayType, 'notices'),
    };
}

/**
 * Apply rules to filter/modify AI-generated insights
 * @param {Array} insights - Array of insight strings from AI
 * @param {Object} context - Day context
 * @returns {Array} Filtered and modified insights
 */
export function applyRulesToInsights(insights, context) {
    if (!insights || !Array.isArray(insights)) return [];

    const { dayType, isExamDay, isHalfDay } = context;
    const attendanceRules = getAttendanceRules(context);
    const feeRules = getFeeRules(context);

    return insights.filter(insight => {
        const lowerInsight = insight.toLowerCase();

        // Filter out low attendance warnings on exam/half days
        if (!attendanceRules.showLowAttendanceWarning) {
            if (lowerInsight.includes('low attendance') ||
                lowerInsight.includes('attendance is low') ||
                lowerInsight.includes('poor attendance')) {
                return false;
            }
        }

        // Filter out fee alerts on non-collection days
        if (!feeRules.showFeeAlerts) {
            if (lowerInsight.includes('unpaid') ||
                lowerInsight.includes('pending fee') ||
                lowerInsight.includes('overdue')) {
                return false;
            }
        }

        return true;
    }).map(insight => {
        // Soften tone on exam/half days
        if (attendanceRules.softerTone) {
            return insight
                .replace(/attendance is low/gi, 'attendance may vary')
                .replace(/poor attendance/gi, 'reduced attendance');
        }
        return insight;
    });
}

export default {
    STATIC_MESSAGES,
    getStaticMessage,
    isWarningAllowed,
    getAttendanceRules,
    getFeeRules,
    getNoticeRules,
    applyRulesToInsights,
};
