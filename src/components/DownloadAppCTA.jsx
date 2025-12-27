// Download App CTA Section Component
import React from 'react';
import { Android } from './ui/android';
import { InteractiveGridPattern } from './ui/interactive-grid-pattern';
import { Users, GraduationCap, Bell, Bus, CreditCard, Calendar, BookOpen, Wallet } from 'lucide-react';

export default function DownloadAppCTA() {
    return (
        <section className="relative rounded-2xl bg-gradient-to-b from-[#0569ff] to-[#0041a8] overflow-hidden">
            {/* Interactive Grid Pattern Background - Full Width */}
            <InteractiveGridPattern
                width={80}
                height={80}
                className="absolute inset-0 w-full h-full z-0 opacity-40 [mask-image:radial-gradient(ellipse_100%_80%_at_50%_30%,white_20%,transparent_80%)]"
            />

            {/* Floating Icons */}
            <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden">
                {/* Top Left */}
                <div className="absolute top-[20%] left-[20%] hidden md:flex animate-[float_6s_ease-in-out_infinite]">
                    <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                        <Users className="w-6 h-6 text-white/80" />
                    </div>
                </div>
                {/* Top Right */}
                <div className="absolute top-[18%] right-[20%] hidden md:flex animate-[float_7s_ease-in-out_infinite_0.5s]">
                    <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                        <GraduationCap className="w-6 h-6 text-white/80" />
                    </div>
                </div>
                {/* Middle Left */}
                <div className="absolute top-[45%] left-[15%] hidden md:flex animate-[float_5s_ease-in-out_infinite_1s]">
                    <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                        <Bell className="w-5 h-5 text-white/80" />
                    </div>
                </div>
                {/* Middle Right */}
                <div className="absolute top-[40%] right-[15%] hidden md:flex animate-[float_6s_ease-in-out_infinite_0.3s]">
                    <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                        <CreditCard className="w-5 h-5 text-white/80" />
                    </div>
                </div>
                {/* Bottom Left */}
                <div className="absolute top-[70%] left-[25%] hidden md:flex animate-[float_7s_ease-in-out_infinite_0.8s]">
                    <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                        <Calendar className="w-5 h-5 text-white/80" />
                    </div>
                </div>
                {/* Bottom Right */}
                <div className="absolute top-[65%] right-[22%] hidden md:flex animate-[float_5s_ease-in-out_infinite_0.2s]">
                    <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                        <Bus className="w-5 h-5 text-white/80" />
                    </div>
                </div>
            </div>

            {/* Text Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-5 pt-20 text-center">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                    Manage Your School
                    <br />
                    On The Go
                </h2>

                <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
                    Download the EduBreezy mobile app and access your school management system anytime, anywhere. Stay connected with students, parents, and staff.
                </p>

                {/* App Store Buttons */}
                <div className="flex flex-wrap gap-4 justify-center pb-16">
                    <a href="#" className="hover:scale-105 transition-transform duration-300 opacity-50 cursor-not-allowed">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                            alt="Download on the App Store"
                            className="h-12 md:h-14"
                        />
                    </a>
                    <a href="#" className="hover:scale-105 transition-transform duration-300">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                            alt="Get it on Google Play"
                            className="h-12 md:h-14"
                        />
                    </a>
                </div>
            </div>

            {/* Phone Mockups Container */}
            <div className="relative z-10 max-w-3xl mx-auto">
                {/* Large White Circle Glow - Behind Both Mockups */}
                <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                    <div className="w-[500px] h-[500px] md:w-[600px] md:h-[600px] lg:w-[700px] lg:h-[700px] bg-white/25 blur-[100px] rounded-full" />
                </div>

                {/* Phones */}
                <div className="relative flex justify-center">
                    {/* Phone 1 - Left */}
                    <div className="w-[220px] md:w-[280px] hover:scale-[1.05] transtion-all duration-300 cursor-pointer lg:w-[320px] object-contain -mr-16 md:-mr-20 z-20">
                        <Android src={'./ss.png'} className='object-contain' />
                    </div>

                    {/* Phone 2 - Right */}
                    <div className="w-[200px] md:w-[260px] hover:scale-[1.05] transtion-all duration-300 cursor-pointer lg:w-[300px] -ml-16 md:-ml-20 mt-8 z-10 opacity-90">
                        <Android src={'./ss3.png'} className='object-contain' />
                    </div>
                </div>
            </div>
        </section>
    );
}
