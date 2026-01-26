// // Download App CTA Section Component
// import React from 'react';
// import { Android } from './ui/android';
// import { InteractiveGridPattern } from './ui/interactive-grid-pattern';
// import { Users, GraduationCap, Bell, Bus, CreditCard, Calendar, BookOpen, Wallet } from 'lucide-react';

// export default function DownloadAppCTA() {
//     return (
//         <section className="relative rounded-2xl bg-gradient-to-b from-[#0569ff] to-[#0041a8] overflow-hidden">
//             {/* Interactive Grid Pattern Background - Full Width */}
//             <InteractiveGridPattern
//                 width={80}
//                 height={80}
//                 className="absolute inset-0 w-full h-full z-0 opacity-40 [mask-image:radial-gradient(ellipse_100%_80%_at_50%_30%,white_20%,transparent_80%)]"
//             />

//             {/* Floating Icons */}
//             <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden">
//                 {/* Top Left */}
//                 <div className="absolute top-[20%] left-[20%] hidden md:flex animate-[float_6s_ease-in-out_infinite]">
//                     <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
//                         <Users className="w-6 h-6 text-white/80" />
//                     </div>
//                 </div>
//                 {/* Top Right */}
//                 <div className="absolute top-[18%] right-[20%] hidden md:flex animate-[float_7s_ease-in-out_infinite_0.5s]">
//                     <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
//                         <GraduationCap className="w-6 h-6 text-white/80" />
//                     </div>
//                 </div>
//                 {/* Middle Left */}
//                 <div className="absolute top-[45%] left-[15%] hidden md:flex animate-[float_5s_ease-in-out_infinite_1s]">
//                     <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
//                         <Bell className="w-5 h-5 text-white/80" />
//                     </div>
//                 </div>
//                 {/* Middle Right */}
//                 <div className="absolute top-[40%] right-[15%] hidden md:flex animate-[float_6s_ease-in-out_infinite_0.3s]">
//                     <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
//                         <CreditCard className="w-5 h-5 text-white/80" />
//                     </div>
//                 </div>
//                 {/* Bottom Left */}
//                 <div className="absolute top-[70%] left-[25%] hidden md:flex animate-[float_7s_ease-in-out_infinite_0.8s]">
//                     <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
//                         <Calendar className="w-5 h-5 text-white/80" />
//                     </div>
//                 </div>
//                 {/* Bottom Right */}
//                 <div className="absolute top-[65%] right-[22%] hidden md:flex animate-[float_5s_ease-in-out_infinite_0.2s]">
//                     <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
//                         <Bus className="w-5 h-5 text-white/80" />
//                     </div>
//                 </div>
//             </div>

//             {/* Text Content */}
//             <div className="relative z-10 max-w-4xl mx-auto px-5 pt-20 text-center">
//                 <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
//                     Manage Your School
//                     <br />
//                     On The Go
//                 </h2>

//                 <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
//                     Download the EduBreezy mobile app and access your school management system anytime, anywhere. Stay connected with students, parents, and staff.
//                 </p>

//                 {/* App Store Buttons */}
//                 <div className="flex flex-wrap gap-4 justify-center pb-16">
//                     <a href="#" className="hover:scale-105 transition-transform duration-300 opacity-50 cursor-not-allowed">
//                         <img
//                             src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
//                             alt="Download on the App Store"
//                             className="h-12 md:h-14"
//                         />
//                     </a>
//                     <a href="#" className="hover:scale-105 transition-transform duration-300">
//                         <img
//                             src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
//                             alt="Get it on Google Play"
//                             className="h-12 md:h-14"
//                         />
//                     </a>
//                 </div>
//             </div>

//             {/* Phone Mockups Container */}
//             <div className="relative z-10 max-w-3xl mx-auto">
//                 {/* Large White Circle Glow - Behind Both Mockups */}
//                 <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
//                     <div className="w-[500px] h-[500px] md:w-[600px] md:h-[600px] lg:w-[700px] lg:h-[700px] bg-white/25 blur-[100px] rounded-full" />
//                 </div>

//                 {/* Phones */}
//                 <div className="relative flex justify-center">
//                     {/* Phone 1 - Left */}
//                     <div className="w-[220px] md:w-[280px] hover:scale-[1.05] transtion-all duration-300 cursor-pointer lg:w-[320px] object-contain -mr-16 md:-mr-20 z-20">
//                         <Android src={'./ss.png'} className='object-contain' />
//                     </div>

//                     {/* Phone 2 - Right */}
//                     <div className="w-[200px] md:w-[260px] hover:scale-[1.05] transtion-all duration-300 cursor-pointer lg:w-[300px] -ml-16 md:-ml-20 mt-8 z-10 opacity-90">
//                         <Android src={'./ss3.png'} className='object-contain' />
//                     </div>
//                 </div>
//             </div>
//         </section>
//     );
// }


import React from 'react';
import { InteractiveGridPattern } from './ui/interactive-grid-pattern';

export default function DownloadAppCTA() {
    return (
        <section className="py-32 overflow-visible bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Main Card with grid background - overflow-visible is key for the pop-out effect */}
                <div className="relative bg-blue-600 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(37,99,235,0.3)] overflow-visible">

                    {/* Interactive Grid Pattern Background */}
                    <InteractiveGridPattern
                        width={50}
                        height={50}
                        squares={[30, 20]}
                        className="absolute inset-0 z-0 opacity-30 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,white_20%,transparent_80%)]"
                        squaresClassName="stroke-white/20 fill-white/5"
                    />

                    <div className="flex flex-col lg:flex-row items-center relative z-10">

                        {/* Left Content Area: Takes 60% width on large screens */}
                        <div className="lg:w-3/5 p-8 md:p-16 lg:py-24 z-10 text-center lg:text-left">
                            <span className="inline-block py-1.5 px-4 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-[0.2em] mb-8 backdrop-blur-md border border-white/20">
                                Mobile Experience
                            </span>
                            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-[1.1] tracking-tight">
                                Seamless School <br />
                                <span className="text-blue-200">Management.</span>
                            </h2>
                            <p className="text-blue-100 text-lg mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium opacity-90">
                                Access your dashboard, track performance, and stay updated with real-time notifications. Download the EduBreezy app today.
                            </p>

                            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                                {/* App Store */}
                                <a href="#" className="group flex items-center gap-3 bg-slate-950 hover:bg-black text-white px-8 py-4 rounded-2xl transition-all duration-300 border border-white/5 shadow-2xl hover:-translate-y-1">
                                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                                    </svg>
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase font-bold text-slate-500 leading-none mb-1 tracking-wider">Available on</div>
                                        <div className="text-xl font-bold leading-tight">App Store</div>
                                    </div>
                                </a>

                                {/* Play Store */}
                                <a href="#" className="group flex items-center gap-3 bg-slate-950 hover:bg-black text-white px-8 py-4 rounded-2xl transition-all duration-300 border border-white/5 shadow-2xl hover:-translate-y-1">
                                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 20.5v-17c0-.28.22-.5.5-.5.16 0 .32.08.42.21l11.08 8.79-11.08 8.79c-.1.13-.26.21-.42.21-.28 0-.5-.22-.5-.5zm12.35-8.5l-3.32-2.63L3.92 4.04l11.43 7.96zm1.18.82l3.05-1.74c.25-.14.42-.4.42-.68 0-.28-.17-.54-.42-.68l-3.05-1.74-2.73 2.16 2.73 2.68zm-1.18.82l-11.43 7.96 8.11-5.33 3.32-2.63z" />
                                    </svg>
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase font-bold text-slate-500 leading-none mb-1 tracking-wider">Get it on</div>
                                        <div className="text-xl font-bold leading-tight">Google Play</div>
                                    </div>
                                </a>
                            </div>
                        </div>

                        {/* Right Mockup Area: 3D "Pop-out" Effect */}
                        <div
                            className="lg:w-2/5 relative flex justify-center items-center py-20 lg:py-0"
                            onMouseMove={(e) => {
                                const phoneElement = e.currentTarget.querySelector('.phone-mockup');
                                if (!phoneElement) return;

                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const y = e.clientY - rect.top;
                                const centerX = rect.width / 2;
                                const centerY = rect.height / 2;

                                const rotateX = ((y - centerY) / centerY) * -15;
                                const rotateY = ((x - centerX) / centerX) * 15;

                                requestAnimationFrame(() => {
                                    phoneElement.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg) rotateZ(0deg)`;
                                });
                            }}
                            onMouseLeave={(e) => {
                                const phoneElement = e.currentTarget.querySelector('.phone-mockup');
                                if (!phoneElement) return;

                                requestAnimationFrame(() => {
                                    phoneElement.style.transition = 'transform 0.5s ease-out';
                                    phoneElement.style.transform = 'rotateY(-25deg) rotateX(12deg) rotateZ(3deg)';
                                    setTimeout(() => {
                                        phoneElement.style.transition = 'transform 0.1s ease-out';
                                    }, 500);
                                });
                            }}
                        >
                            <style dangerouslySetInnerHTML={{
                                __html: `
                                .grid-bg {
                                    background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0);
                                    background-size: 40px 40px;
                                }
                                .custom-shadow {
                                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
                                }
                            ` }} />
                            <div
                                className="relative z-20 transition-all duration-300 hover:scale-[1.03] group"
                                style={{
                                    perspective: '2000px',
                                    transformStyle: 'preserve-3d'
                                }}
                            >
                                {/* The Mockup - 3D Black Device */}
                                <div
                                    className="phone-mockup w-[300px] sm:w-[340px] h-[620px] sm:h-[700px] bg-[#0A0A0A] rounded-[3.8rem] p-3 shadow-[0_80px_150px_-30px_rgba(0,0,0,0.8)] border border-white/10 relative"
                                    style={{
                                        transform: 'rotateY(-25deg) rotateX(12deg) rotateZ(3deg)',
                                        marginTop: '-120px',
                                        marginBottom: '-120px',
                                        transition: 'transform 0.1s ease-out',
                                        willChange: 'transform'
                                    }}
                                >
                                    {/* Dynamic Gloss Overlay */}
                                    {/* <div className="absolute inset-0 rounded-[3.8rem] bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none z-40"></div> */}

                                    {/* Phone Bezel Details (Notch) */}
                                    {/* <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-8 bg-[#0A0A0A] rounded-b-3xl z-50 flex items-center justify-center gap-3">
                                        <div className="w-14 h-1.5 bg-slate-900 rounded-full border border-white/5"></div>
                                        <div className="w-2 h-2 bg-slate-900 rounded-full border border-white/5"></div>
                                    </div> */}

                                    {/* Screen Content ontainer - Replace the img src below with your actual image */}
                                    <div className="w-full h-full bg-slate-900 rounded-[3rem] overflow-hidden relative shadow-inner">
                                        <img
                                            src="./ss.png"
                                            alt="App Screenshot"
                                            className="w-full h-full object-cover object-top"
                                        />

                                        {/* Inner Screen Gloss/Shadow */}
                                        {/* <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.4)] pointer-events-none"></div> */}
                                    </div>

                                    {/* Physical Buttons (Side) */}
                                    <div className="absolute top-32 -left-[2px] w-1 h-12 bg-slate-800 rounded-r-md border-r border-white/10"></div>
                                    <div className="absolute top-48 -left-[2px] w-1 h-20 bg-slate-800 rounded-r-md border-r border-white/10"></div>
                                    <div className="absolute top-40 -right-[2px] w-1 h-24 bg-slate-800 rounded-l-md border-l border-white/10"></div>
                                </div>

                                {/* Dramatic Floating Shadow */}
                                {/* <div className="absolute -inset-16 bg-black/40 blur-[80px] rounded-[5rem] -z-10 transform -rotate-12 translate-y-20 translate-x-20 opacity-60"></div> */}
                            </div>

                            {/* Background ambient lighting */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-blue-400/10 rounded-full blur-[120px] -z-0"></div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Spacer to handle the pop-out height at the bottom */}
            <div className="h-24 lg:h-32"></div>
        </section>
    );
};

