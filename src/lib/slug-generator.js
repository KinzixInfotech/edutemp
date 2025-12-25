/**
 * Slug Generator Utility
 * Generates SEO-friendly slugs for school pages
 */

/**
 * Converts a string to a URL-friendly slug
 * @param {string} text - The text to slugify
 * @returns {string} - URL-friendly slug
 */
export function slugify(text) {
    if (!text) return '';

    return text
        .toString()
        .toLowerCase()
        .trim()
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Remove special characters (keep only alphanumeric and hyphens)
        .replace(/[^\w\-]+/g, '')
        // Replace multiple hyphens with single hyphen
        .replace(/\-\-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

/**
 * Generates a school slug from name and location
 * @param {string} name - School name
 * @param {string} location - School location
 * @returns {string} - SEO-friendly slug
 */
export function generateSchoolSlug(name, location) {
    if (!name) return '';

    const namePart = slugify(name);
    const locationPart = location ? slugify(location) : '';

    // If location exists and isn't already in the name, append it
    if (locationPart && !namePart.includes(locationPart)) {
        return `${namePart}-${locationPart}`;
    }

    return namePart;
}

/**
 * Generates a unique slug by appending a number if needed
 * @param {string} baseSlug - The base slug
 * @param {string[]} existingSlugs - Array of existing slugs to check against
 * @returns {string} - Unique slug
 */
export function generateUniqueSlug(baseSlug, existingSlugs = []) {
    if (!existingSlugs.includes(baseSlug)) {
        return baseSlug;
    }

    let counter = 2;
    let uniqueSlug = `${baseSlug}-${counter}`;

    while (existingSlugs.includes(uniqueSlug)) {
        counter++;
        uniqueSlug = `${baseSlug}-${counter}`;
    }

    return uniqueSlug;
}

/**
 * Checks if a string looks like a UUID
 * @param {string} str - String to check
 * @returns {boolean} - True if it's a UUID format
 */
export function isUUID(str) {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}
