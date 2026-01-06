// Reusable Section Heading Component for consistency across the site
export default function SectionHeading({ badge, title, highlightedText, description, align = "text-center" }) {
    return (
        <div className={`${align} mb-16 md:mb-20`}>
            <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-5">
                <span className="w-2 h-2 bg-[#0569ff] rounded-full"></span>
                {badge}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-[3.2rem] font-bold text-[#1a1a2e] leading-[1.1] mb-4">
                {title}{' '}
                {highlightedText && (
                    typeof highlightedText === 'string'
                        ? <span className="text-[#0569ff]">{highlightedText}</span>
                        : highlightedText
                )}
            </h2>
            <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                {description}
            </p>
        </div>
    );
}
