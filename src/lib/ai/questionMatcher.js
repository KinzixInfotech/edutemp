/**
 * Smart Question Matcher for Product Guide AI
 * 
 * Features:
 * - Keyword extraction with stopword removal
 * - Synonym mapping for common terms
 * - Fuzzy FAQ matching with similarity scoring
 * - Feature detection from keywords
 */

// Common stopwords to remove from questions
const STOPWORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
    'whom', 'this', 'that', 'these', 'those', 'am', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until',
    'while', 'about', 'against', 'also', 'any', 'both', 'get', 'got',
    'like', 'me', 'my', 'your', 'our', 'their', 'its', 'his', 'her',
    'edubreezy', 'please', 'tell', 'know', 'want', 'show'
]);

// Synonym mapping - maps variations to canonical terms
const SYNONYMS = {
    // Fee related
    'fee': ['fees', 'payment', 'pay', 'paying', 'paid', 'cost', 'price', 'pricing', 'charge', 'charges', 'invoice', 'billing', 'money'],
    'online': ['internet', 'digital', 'web', 'electronic', 'e-payment', 'epayment'],

    // People
    'parent': ['parents', 'guardian', 'guardians', 'mother', 'father', 'mom', 'dad', 'family'],
    'student': ['students', 'child', 'children', 'kid', 'kids', 'pupil', 'pupils', 'learner'],
    'teacher': ['teachers', 'staff', 'faculty', 'instructor', 'educator'],

    // Features
    'attendance': ['present', 'absent', 'absence', 'absentee', 'attendance'],
    'exam': ['exams', 'examination', 'examinations', 'test', 'tests', 'assessment'],
    'result': ['results', 'grade', 'grades', 'marks', 'mark', 'score', 'scores', 'report'],
    'transport': ['bus', 'vehicle', 'transportation', 'pickup', 'drop', 'commute', 'travel'],
    'library': ['books', 'book', 'reading', 'borrow', 'issue'],
    'certificate': ['certificates', 'tc', 'transfer', 'bonafide', 'document', 'documents'],
    'timetable': ['schedule', 'period', 'periods', 'class', 'timing'],
    'homework': ['assignment', 'assignments', 'work', 'task', 'tasks'],
    'sms': ['message', 'messages', 'notification', 'notifications', 'alert', 'alerts', 'notify'],
    'app': ['mobile', 'android', 'ios', 'iphone', 'phone', 'application'],
    'payroll': ['salary', 'salaries', 'wages', 'compensation', 'pay'],
    'inventory': ['store', 'stock', 'uniform', 'uniforms', 'supplies'],

    // Security
    'secure': ['security', 'safe', 'safety', 'protection', 'protected', 'encrypt', 'encryption'],
    'data': ['information', 'records', 'details'],

    // Actions
    'demo': ['demonstration', 'trial', 'try', 'preview', 'walkthrough'],
    'onboard': ['onboarding', 'setup', 'start', 'starting', 'begin', 'implement', 'implementation', 'migrate', 'migration'],

    // Boards
    'cbse': ['icse', 'board', 'boards', 'curriculum', 'syllabus'],

    // AI
    'ai': ['artificial', 'intelligence', 'smart', 'intelligent', 'automation', 'automated', 'insight', 'insights', 'analytics'],
};

// Build reverse synonym map for quick lookup
const REVERSE_SYNONYMS = {};
for (const [canonical, variants] of Object.entries(SYNONYMS)) {
    REVERSE_SYNONYMS[canonical] = canonical;
    for (const variant of variants) {
        REVERSE_SYNONYMS[variant] = canonical;
    }
}

// Feature keyword mapping
const FEATURE_KEYWORDS = {
    'admission': ['admission', 'enroll', 'enrollment', 'apply', 'application', 'register', 'registration'],
    'student_management': ['student', 'profile', 'record', 'database'],
    'fees': ['fee', 'payment', 'pay', 'online', 'invoice', 'receipt', 'collection', 'due', 'installment'],
    'attendance': ['attendance', 'present', 'absent', 'leave', 'track'],
    'exams': ['exam', 'result', 'grade', 'mark', 'report', 'hall', 'admit'],
    'timetable': ['timetable', 'schedule', 'period', 'slot'],
    'homework': ['homework', 'assignment'],
    'communication': ['sms', 'message', 'notice', 'notification', 'communicate'],
    'transport': ['transport', 'bus', 'route', 'driver', 'gps', 'track', 'vehicle'],
    'library': ['library', 'book', 'borrow', 'issue', 'return'],
    'inventory': ['inventory', 'store', 'stock', 'uniform', 'supplies'],
    'payroll': ['payroll', 'salary', 'allowance', 'deduction', 'payslip'],
    'staff_management': ['staff', 'teacher', 'employee', 'hr'],
    'certificates': ['certificate', 'tc', 'transfer', 'bonafide', 'id', 'card'],
    'calendar': ['calendar', 'event', 'holiday', 'vacation'],
    'parent_app': ['app', 'mobile', 'parent', 'android', 'ios'],
    'school_explorer': ['explore', 'discover', 'find', 'search', 'compare'],
    'ai_insights': ['ai', 'insight', 'analytics', 'prediction', 'smart', 'dashboard'],
    'reports': ['report', 'analytics', 'export', 'pdf', 'excel'],
    'alumni': ['alumni', 'graduate', 'passout'],
    'partner_program': ['partner', 'referral', 'commission'],
};

/**
 * Extract meaningful keywords from a question
 */
export function extractKeywords(question) {
    const words = question
        .toLowerCase()
        .replace(/[?!.,;:'"()[\]{}]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1 && !STOPWORDS.has(word));

    // Normalize to canonical forms using synonym map
    const normalized = words.map(word => REVERSE_SYNONYMS[word] || word);

    // Remove duplicates
    return [...new Set(normalized)];
}

/**
 * Calculate similarity between two sets of keywords
 * Returns a score between 0 and 1
 */
export function calculateSimilarity(keywords1, keywords2) {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    let matches = 0;
    for (const word of set1) {
        if (set2.has(word)) matches++;
    }

    // Jaccard similarity
    const union = new Set([...set1, ...set2]);
    return matches / union.size;
}

/**
 * Find best matching FAQ with similarity score
 */
export function findBestFaqMatch(question, faqs) {
    const questionKeywords = extractKeywords(question);

    let bestMatch = null;
    let bestScore = 0;

    for (const faq of faqs) {
        // Extract keywords from FAQ question and aliases
        const faqKeywords = extractKeywords(faq.question);

        // Also check aliases if present
        if (faq.aliases) {
            for (const alias of faq.aliases) {
                const aliasKeywords = extractKeywords(alias);
                faqKeywords.push(...aliasKeywords);
            }
        }

        const score = calculateSimilarity(questionKeywords, [...new Set(faqKeywords)]);

        if (score > bestScore) {
            bestScore = score;
            bestMatch = faq;
        }
    }

    return { match: bestMatch, score: bestScore };
}

/**
 * Detect which features are relevant to the question
 */
export function detectRelevantFeatures(question, features) {
    const questionKeywords = extractKeywords(question);
    const relevantFeatures = [];

    for (const feature of features) {
        const featureKeywordList = FEATURE_KEYWORDS[feature.id] || [];

        // Check if any question keyword matches feature keywords
        const hasMatch = questionKeywords.some(qk =>
            featureKeywordList.some(fk => qk === fk || qk.includes(fk) || fk.includes(qk))
        );

        if (hasMatch) {
            relevantFeatures.push(feature);
        }
    }

    return relevantFeatures;
}

/**
 * Build focused context for AI (only relevant features)
 */
export function buildFocusedContext(question, knowledge) {
    const relevantFeatures = detectRelevantFeatures(question, knowledge.features || []);

    // If we found specific features, return focused context
    if (relevantFeatures.length > 0 && relevantFeatures.length <= 3) {
        return {
            brand: knowledge.brand,
            features: relevantFeatures,
            security: knowledge.security,
            pricing: knowledge.pricing,
        };
    }

    // Otherwise return full knowledge for general questions
    return knowledge;
}

/**
 * Normalize question for caching (removes stopwords, sorts keywords)
 */
export function normalizeForCache(question) {
    const keywords = extractKeywords(question);
    return keywords.sort().join('_');
}
