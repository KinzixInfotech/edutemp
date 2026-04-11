export function calculateSchoolRatingSummary(ratings = []) {
    if (!Array.isArray(ratings) || ratings.length === 0) {
        return {
            totalReviews: 0,
            overallRating: 0,
            academicRating: 0,
            infrastructureRating: 0,
            teacherRating: 0,
            sportsRating: 0,
        };
    }

    const totalReviews = ratings.length;
    const average = (key) => ratings.reduce((sum, rating) => sum + (Number(rating[key]) || 0), 0) / totalReviews;

    return {
        totalReviews,
        overallRating: average('overallRating'),
        academicRating: average('academicRating'),
        infrastructureRating: average('infrastructureRating'),
        teacherRating: average('teacherRating'),
        sportsRating: average('sportsRating'),
    };
}
