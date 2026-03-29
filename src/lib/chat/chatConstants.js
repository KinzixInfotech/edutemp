// ============================================
// CHAT SYSTEM CONSTANTS
// ============================================

// Mute duration options (in milliseconds)
export const MUTE_DURATIONS = {
    '1h': 60 * 60 * 1000,
    '8h': 8 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    'forever': 100 * 365 * 24 * 60 * 60 * 1000, // ~100 years
};

// Rate limits
export const RATE_LIMITS = {
    MESSAGES_PER_MINUTE: 10,
    ATTACHMENTS_PER_HOUR: 20,
    CONVERSATIONS_PER_HOUR: 10,
};

// Pagination
export const PAGINATION = {
    MESSAGES_PER_PAGE: 30,
    CONVERSATIONS_PER_PAGE: 20,
};

// Allowed attachment types
export const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/3gpp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'mp4', 'mov', 'webm', 'docx'];

// Max file size in bytes (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Max attachments per message
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

// Max message content length
export const MAX_MESSAGE_LENGTH = 5000;

// Conversation types
export const CONVERSATION_TYPES = {
    PARENT_TEACHER: 'PARENT_TEACHER',
    TEACHER_CLASS: 'TEACHER_CLASS',
    TEACHER_TEACHER: 'TEACHER_TEACHER',
    DIRECT: 'DIRECT',
    COMMUNITY: 'COMMUNITY',
};

// User roles that map to Prisma role names
export const CHAT_ROLES = {
    ADMIN: 'ADMIN',
    TEACHING_STAFF: 'TEACHING_STAFF',
    STUDENT: 'STUDENT',
    PARENT: 'PARENT',
    NON_TEACHING_STAFF: 'NON_TEACHING_STAFF',
    PRINCIPAL: 'PRINCIPAL',
    DIRECTOR: 'DIRECTOR',
    ACCOUNTANT: 'ACCOUNTANT',
};
