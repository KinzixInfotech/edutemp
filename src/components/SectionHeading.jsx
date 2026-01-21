// Reusable Section Heading Component for consistency across the site
export default function SectionHeading({ badge, title, highlightedText, description, align = "text-center", dark = false }) {
    return (
        <div className={`${align} mb-16 md:mb-20`}>
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-5 ${dark ? 'bg-white/10 text-white' : 'bg-[#0569ff]/10 text-[#0569ff]'}`}>
                <span className={`w-2 h-2 rounded-full ${dark ? 'bg-white' : 'bg-[#0569ff]'}`}></span>
                {badge}
            </span>
            <h2 className={`text-3xl md:text-4xl lg:text-[3.2rem] font-bold leading-[1.1] mb-4 ${dark ? 'text-white' : 'text-[#1a1a2e]'}`}>
                {title}{' '}
                {highlightedText && (
                    typeof highlightedText === 'string'
                        ? <span className={dark ? 'text-[#60a5fa]' : 'text-[#0569ff]'}>{highlightedText}</span>
                        : highlightedText
                )}
            </h2>
            <p className={`text-lg md:text-xl max-w-2xl mx-auto leading-relaxed ${dark ? 'text-white/70' : 'text-slate-500'}`}>
                {description}
            </p>
        </div>
    );
}
