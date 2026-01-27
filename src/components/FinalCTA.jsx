import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';

export default function FinalCTA() {
    return (
        <section className="relative py-16 md:py-24 px-4 overflow-hidden bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
            {/* Interactive Grid Pattern Background */}
            <InteractiveGridPattern
                className="absolute inset-0 opacity-15 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,white_20%,transparent_80%)]"
                width={40}
                height={40}
                squares={[30, 30]}
            />

            {/* Subtle gradient overlays for depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-transparent pointer-events-none"></div>

            {/* Images - Hidden on Mobile, Visible on Desktop */}
            {/* Left Image - Child */}
            <div className="absolute left-0 bottom-0 z-0 hidden lg:block xl:left-10 animate-in fade-in slide-in-from-left-10 duration-1000">
                <img
                    src="/child.png"
                    alt="Student"
                    className="w-[100px] lg:w-[180px] xl:w-[280px] h-auto object-contain"
                />
            </div>

            {/* Right Image - School/Min */}
            <div className="absolute right-0 bottom-0 z-0 hidden lg:block animate-in fade-in slide-in-from-right-10 duration-1000 delay-200">
                <img
                    src="/chil.png"
                    alt="School Management"
                    className="w-[250px] lg:w-[450px] xl:w-[390px] h-auto object-contain"
                />
            </div>
            <div className="max-w-4xl mx-auto text-center relative z-10">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-gray-700 text-sm font-medium mb-6 bxorder border-gray-200 shadow-sm">
                    <Sparkles className="w-4 h-4 text-[#0166f6]" />
                    <span>Ready to transform your school?</span>
                </div>

                {/* Heading - Inline */}
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-[1.1] tracking-tight">
                    <span className="text-gray-900">Transform Your School </span>
                    <span className="text-[#0166f6]">Management Today</span>
                </h2>

                {/* Description */}
                <p className="text-base md:text-lg text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">
                    Experience the future of school management with EduBreezy.
                    Streamline operations and enhance learning.
                </p>

                {/* CTA Buttons - Compact */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-10">
                    <Link href="/schoollogin">
                        <button className="group flex items-center justify-center gap-2 px-8 py-3.5 bg-[#0166f6] text-white rounded-full font-semibold transition-all duration-300 hover:bg-[#0152d9] hover:scale-105 shadow-lg shadow-blue-500/20">
                            Get Started Now
                            <ArrowRight size={18} strokeWidth={2.5} className='transition-transform duration-300 group-hover:translate-x-1' />
                        </button>
                    </Link>

                    <Link href="/contact">
                        <button className="group flex items-center justify-center gap-2 px-8 py-3.5 border-2 border -gray-300 text-gray-700 bg-white rounded-full font-semibold transition-all duration-300 hover:border-gray-400 hover:bg-gray-50 hover:scale-105">
                            Request a Demo
                            <ArrowRight size={18} strokeWidth={2.5} className='transition-transform duration-300 group-hover:translate-x-1' />
                        </button>
                    </Link>
                </div>

                {/* Trust indicators - Compact */}
                <div className="flex flex-wrap items-center justify-center gap-6 text-gray-500 text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span>Complete Management</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                            <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span>24/7 Support</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                            <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span>Trusted by Schools</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
