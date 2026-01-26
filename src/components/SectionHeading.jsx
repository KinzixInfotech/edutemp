// Reusable Section Heading Component for consistency across the site
// 
// Typography Scale (Final Balanced):
// - Mobile: text-4xl (36px) font-black (Dominant on mobile)
// - Tablet: md:text-5xl (48px)
// - Desktop: lg:text-5xl (48px) or lg:text-6xl (60px) -> reverted to avoid being "too big"
// 
// Use variant="section" for centered section headers
// Use variant="content" for left-aligned inline content (like CTA sections)

export default function SectionHeading({
    badge,
    title,
    highlightedText,
    description,
    align = "center",
    dark = false,
    variant = "section", // "section" | "content"
    className = ""
}) {
    // Reverted desktop size to lg:text-5xl/6xl (was 7xl) to prevents it looking "too big"
    // Kept mobile at text-4xl font-black as requested
    const headingClasses = "text-4xl md:text-5xl lg:text-6xl";
    const subtitleClasses = "text-base md:text-lg";

    // Tight leading for neat stacking
    const leadingClass = "leading-[1.1] md:leading-tight";

    const alignClass = align === "center" ? "text-center" : align === "left" ? "text-left lg:text-left" : align;
    const marginClass = variant === "section" ? "mb-10 md:mb-14 lg:mb-16" : "mb-6 md:mb-8";
    const subtitleWidth = variant === "section" ? "max-w-3xl" : "max-w-xl";

    return (
        <div className={`${alignClass} ${marginClass} ${className}`}>
            {/* Badge */}
            {badge && (
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider mb-4 md:mb-6 ${dark ? 'bg-white/10 text-white border border-white/20' : 'bg-[#0569ff]/10 text-[#0569ff] border border-[#0569ff]/20'}`}>
                    <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${dark ? 'bg-white' : 'bg-[#0569ff]'}`}></span>
                    {badge}
                </span>
            )}

            {/* Heading */}
            <h2 className={`${headingClasses} font-black ${leadingClass} mb-5 md:mb-6 text-[#1a1a2e] ${dark ? 'text-white' : 'text-[#1a1a2e]'}`}>
                {title}{' '}
                {highlightedText && (
                    typeof highlightedText === 'string'
                        ? <span className={dark ? 'text-[#60a5fa]' : 'text-[#0569ff]'}>{highlightedText}</span>
                        : highlightedText
                )}
            </h2>

            {/* Subtitle */}
            {description && (
                <p className={`${subtitleClasses} ${subtitleWidth} leading-relaxed font-medium ${align === "center" ? "mx-auto" : ""} ${dark ? 'text-white/80' : 'text-gray-600'}`}>
                    {description}
                </p>
            )}
        </div>
    );
}

// Standalone Heading component
export function ContentHeading({ children, className = "", dark = false }) {
    return (
        <h2 className={`text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] ${dark ? 'text-white' : 'text-[#1a1a2e]'} ${className}`}>
            {children}
        </h2>
    );
}

// Standalone Subtitle component
export function ContentSubtitle({ children, className = "", dark = false }) {
    return (
        <p className={`text-base md:text-lg leading-relaxed font-medium ${dark ? 'text-white/80' : 'text-gray-600'} ${className}`}>
            {children}
        </p>
    );
}
