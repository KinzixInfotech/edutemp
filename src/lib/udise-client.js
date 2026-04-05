/**
 * UDISE API Client
 * Handles fetching and transforming school data from the UDISE API.
 */

const UDISE_BASE_URL = 'https://kys.udiseplus.gov.in/webapp/api/search-schools';

/**
 * Fetches schools by pincode from the UDISE API.
 * Includes retry logic for resilience.
 *
 * @param {string} pincode - The pincode to search for
 * @param {number} retries - Number of retry attempts (default: 2)
 * @returns {Promise<any>} The API response data
 */
export async function fetchSchoolsByPincode(pincode, retries = 2) {
    let attempt = 0;
    while (attempt <= retries) {
        try {
            const response = await fetch(
                `${UDISE_BASE_URL}?searchType=4&searchParam=${pincode}`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`UDISE API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            attempt++;
            if (attempt > retries) {
                console.error(`[UDISE] Failed to fetch pincode ${pincode} after ${retries} retries:`, error);
                throw error;
            }
            console.warn(`[UDISE] Retry ${attempt} for pincode ${pincode} after error:`, error.message);
            // Wait 1 second before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}

/**
 * Transforms a raw UDISE school object into the Edubreezy DB structure.
 * Returns an object containing both the Prisma 'School' create data and the 'SchoolPublicProfile' create data.
 *
 * @param {object} apiSchool - The raw school data from UDISE
 * @param {string} baseSlug - A generated unique slug for the profile
 * @returns {object} Formatted data ready for Prisma
 */
export function transformSchool(apiSchool, baseSlug) {
    const schoolData = {
        name: apiSchool.schoolName || 'Unknown School',
        schoolCode: apiSchool.schoolId ? `ATLAS-${apiSchool.schoolId}` : `ATLAS-${Date.now()}`,
        location: apiSchool.address || '',
        city: apiSchool.districtName || '',
        state: apiSchool.stateName || '',
        domain: baseSlug ? `${baseSlug}.edubreezy.com` : `${Date.now()}.edubreezy.com`,
        profilePicture: 'https://cdn.edubreezy.com/assets/default-school-avatar.png',
        contactNumber: 'N/A',
        SubscriptionType: 'ATLAS_ONLY',
        Language: 'en',
    };

    // Note: Since we are creating independent schools, they don't have login emails.
    // We'll leave email blank or generate a placeholder if required by schema, but schema doesn't require email for ATLAS_ONLY

    // Atlas-specific fields mapping
    const atlasFields = {
        atlas_source: 'UDISE',
        atlas_pincode: apiSchool.pincode ? apiSchool.pincode.toString() : null,
        atlas_latitude: apiSchool.latitude ? parseFloat(apiSchool.latitude) : null,
        atlas_longitude: apiSchool.longitude ? parseFloat(apiSchool.longitude) : null,
        atlas_managementType: apiSchool.schMgmtDesc || null,
        atlas_genderType: apiSchool.schTypeDesc || null,
        atlas_category: apiSchool.schCatDesc || null,
        atlas_classFrom: apiSchool.classFrm ? apiSchool.classFrm.toString() : null,
        atlas_classTo: apiSchool.classTo ? apiSchool.classTo.toString() : null,
        atlas_lastFetchedAt: new Date(),
    };

    // Public Profile data
    const profileData = {
        slug: baseSlug, // MUST be generated uniquely before calling this
        isPubliclyVisible: true,
        latitude: apiSchool.latitude ? parseFloat(apiSchool.latitude) : null,
        longitude: apiSchool.longitude ? parseFloat(apiSchool.longitude) : null,
        // Calculate total teachers if possible
        totalTeachers: apiSchool.totalTeacher
            ? parseInt(apiSchool.totalTeacher)
            : 0,
        // Description placeholder using UDISE info
        description: `This is a ${apiSchool.schMgmtDesc || 'school'} located in ${apiSchool.districtName || 'the city'}, ${apiSchool.stateName || 'the state'}. It provides education from class ${apiSchool.classFrm || 'N/A'} to class ${apiSchool.classTo || 'N/A'}.`,
    };

    return {
        school: {
            ...schoolData,
            ...atlasFields,
        },
        profile: profileData,
    };
}

/**
 * Checks if a UDISE school is currently operational.
 *
 * @param {object} apiSchool - The raw school data from UDISE
 * @returns {boolean} True if operational
 */
export function isOperational(apiSchool) {
    // School must exist and not be closed/merged
    if (!apiSchool) return false;
    
    // Check schoolStatusName if it exists
    if (apiSchool.schoolStatusName) {
        return apiSchool.schoolStatusName.toLowerCase() === 'operational';
    }
    
    // Fallback if status name isn't there but we have other valid data
    return !!apiSchool.udiseschCode && !!apiSchool.schoolName;
}
