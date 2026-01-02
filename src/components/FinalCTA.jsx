import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';

export default function FinalCTA() {
    return (
        <section className="relative py-24 px-4 overflow-hidden bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
            {/* Interactive Grid Pattern Background */}
            <InteractiveGridPattern
                className="absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,white_20%,transparent_80%)]"
                width={50}
                height={50}
                squares={[40, 40]}
            />

            {/* Subtle gradient overlays for depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-transparent pointer-events-none"></div>

            <div className="max-w-5xl mx-auto text-center relative z-10">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-full text-gray-700 text-sm font-medium mb-8 border border-gray-200 transition-shadow">
                    <Sparkles className="w-4 h-4 text-[#0166f6]" />
                    <span>Ready to transform your school?</span>
                </div>

                {/* Heading with depth effect */}
                <h2 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
                    <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                        Transform Your School
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-[#0166f6] via-[#0152d9] to-[#0145c4] bg-clip-text text-transparent">
                        Management Today
                    </span>
                </h2>

                {/* Description with subtle grey */}
                <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                    Experience the future of school management with EduBreezy.
                    Streamline operations, improve communication, and enhance the learning experience.
                </p>

                {/* CTA Buttons with shadow depth */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                    <Link href="/schoollogin">
                        <button className="group w-full flex items-center justify-center px-2 gap-3 bg-[#0166f6] text-white rounded-full text-lg font-semibold cursor-pointer transition-all duration-300 hover:bg-[#0152d9] hover:scale-105 ">
                            <span className='px-6 py-4'>Get Started Now</span>
                            <span className='bg-white/20 p-3 rounded-full group-hover:bg-white/30 transition-all'>
                                <ArrowRight size={20} strokeWidth={3} color='white' className='transition-transform duration-300 group-hover:-rotate-45' />
                            </span>
                        </button>
                    </Link>

                    <Link href="/contact">
                        <button className="group w-full flex items-center justify-center px-2 gap-3 border-2 border-gray-300 text-gray-700 bg-white rounded-full text-lg font-semibold cursor-pointer transition-all duration-300 hover:border-gray-400 hover:bg-gray-50 hover:scale-105 ">
                            <span className='px-6 py-4'>Request a Demo</span>
                            <span className='bg-gray-200 p-3 rounded-full group-hover:bg-gray-300 transition-all'>
                                <ArrowRight size={20} strokeWidth={3} color='black' className='transition-transform duration-300 group-hover:-rotate-45' />
                            </span>
                        </button>
                    </Link>
                </div>

                {/* Trust indicators with subtle styling */}
                <div className="flex flex-wrap items-center justify-center gap-8 text-gray-600 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="font-medium">Complete School Management</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                            <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="font-medium">24/7 Support Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                            <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="font-medium">Trusted by Schools</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
