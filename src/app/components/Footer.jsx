import { StatusIndicator } from "@/components/layout/client-layout";
import Image from "next/image";

const footerData = {
    logo: {
        src: "/edu.png",
        alt: "EduBreezy",
        width: 200,
        height: 200,
    },
    columns: [
        {
            heading: "Company",
            items: [
                { label: "About us", link: "/about" },
                // { label: "Events", link: "/events" },
                { label: "Partner Program", link: "/partnerProgram" },
                { label: "Blog", link: "/blog" },
                { label: "Contact", link: "/contact" },
            ],
        },
        {
            heading: "Resources",
            items: [
                { label: "Support", link: "/support" },
                { label: "Pricing", link: "/pricing" },
                { label: "Community", link: "/community" },
                { label: "Knowledge Base", link: "/kb" },
                { label: "My Account", link: "/account" },
                { label: "Create support ticket →", link: "/support/ticket" },
            ],
        },
    ],
};
const getStatusStyles = (indicator) => {
    switch (indicator) {
        case "none": // operational
            return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
        case "minor": // minor issues
            return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
        case "major": // major outage
            return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
        case "critical": // critical outage
            return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
        default:
            return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
    }
};

export default function Footer() {
    return (
        <footer className="bg-gradient-to-b from-slate-50 to-slate-100 border-t border-slate-200 relative overflow-hidden px-4 md:px-6 pb-6">
            {/* Decorative cloud background */}
            <div
                className="absolute inset-0 rotate-180 bg-[url('/cloud.png')] object-cover bg-top top-3.5 opacity-40"
            ></div>

            {/* Subtle gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto relative container pt-20 pb-8 z-40">
                {/* Top Section - Logo and Description */}
                <div className="flex flex-wrap justify-between items-start mb-16">
                    <div className="w-full md:w-1/3 mb-8 md:mb-0">
                        <Image
                            src={footerData.logo.src}
                            alt={footerData.logo.alt}
                            width={footerData.logo.width}
                            height={footerData.logo.height}
                            priority
                            className="mb-4"
                        />
                        <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
                            Empowering educational institutions with innovative management solutions for a brighter future.
                        </p>
                    </div>

                    {/* App Store Button & Social Media Icons */}
                    <div className="w-full md:w-auto flex flex-col md:flex-row items-start md:items-center gap-6">
                        {/* Google Play Button */}
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-900 transition-all duration-300 cursor-pointer group">
                            <Image
                                src="/playstore.png"
                                alt="Google Play"
                                width={24}
                                height={24}
                                className="w-6 h-6"
                            />
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] leading-none uppercase tracking-wide opacity-90">Get it on</span>
                                <span className="text-sm font-semibold leading-tight">Google Play</span>
                            </div>
                        </div>

                        {/* Social Media Icons */}
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-white shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center text-slate-600 hover:text-[#026df3] hover:scale-110 hover:bg-[#026df3]/5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                </svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-white shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center text-slate-600 hover:text-[#026df3] hover:scale-110 hover:bg-[#026df3]/5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                                </svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-white shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:scale-110">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                </svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-white shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:scale-110">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Middle Section - Links */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-sm mb-12">
                    {footerData.columns.map((column, idx) => (
                        <div key={idx} className="space-y-4">
                            <h4 className="font-semibold text-slate-900 text-base tracking-tight">
                                {column.heading}
                            </h4>
                            <ul className="space-y-3">
                                {column.items.map((item, i) => (
                                    <li key={i}>
                                        <a
                                            href={item.link}
                                            target="_blank"
                                            className="text-slate-600 hover:text-[#026df3] transition-all duration-300 inline-block hover:translate-x-1 transform relative group"
                                        >
                                            <span className="relative">
                                                {item.label}
                                                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#026df3] transition-all duration-300 group-hover:w-full"></span>
                                            </span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {/* Additional Contact Info Column */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-slate-900 text-base tracking-tight">
                            Get in Touch
                        </h4>
                        <ul className="space-y-3 text-slate-600">
                            <li className="flex items-start gap-2">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm">hello@edubreezy.com</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="text-sm">+91 9471 532 682</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Section - Copyright */}
                <div className="border-t border-slate-200 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        {/* Left - Copyright and Links */}
                        <div className="text-center md:text-left space-y-3">
                            {/* <p className="text-slate-600 text-sm font-medium">
                                © {new Date().getFullYear()} EduBreezy. All rights reserved.
                            </p> */}
                            <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm">
                                <a href="/privacy-policy" className="text-slate-500 hover:text-[#026df3] transition-colors duration-200 relative group">
                                    <span className="relative">
                                        Privacy Policy
                                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#026df3] transition-all duration-300 group-hover:w-full"></span>
                                    </span>
                                </a>
                                <span className="text-slate-300">•</span>
                                <a href="/terms" className="text-slate-500 hover:text-[#026df3] transition-colors duration-200 relative group">
                                    <span className="relative">
                                        Terms & Conditions
                                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#026df3] transition-all duration-300 group-hover:w-full"></span>
                                    </span>
                                </a>
                            </div>
                            <p className="text-sm text-slate-500">
                                EduBreezy —{" "}
                                <a
                                    href="https://www.kinzix.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                                >
                                    A Kinzix Product
                                </a>
                            </p>
                            <span className="inline-block px-2 py-1.5  bg-amber-100 border text-amber-800 rounded-full">
                                🚧 Under Development
                            </span>

                        </div>

                        {/* Right - Kinzix Logo */}
                        <div className="mt-4 md:mt-0 flex items-center justify-center flex-col">
                            <a
                                href="https://www.kinzix.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block transition-transform duration-300 hover:scale-105 relative overflow-hidden"
                            >
                                <Image
                                    src="/kinzix-black.webp"
                                    alt="Kinzix"
                                    width={100}
                                    height={40}
                                    className="opacity-80 hover:opacity-100 transition-opacity duration-300"
                                />
                                {/* Continuous shimmer overlay */}
                                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"></div>
                            </a>
                            <div className="block  transition-transform cursor-pointer border rounded-full duration-300 hover:scale-105">
                                <StatusIndicator />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Very Bottom - Developed By */}
                <div className="border-t border-slate-200 mt-8 pt-6">
                    <div className="flex flex-col items-center justify-center gap-2 text-sm text-slate-700">
                        <div className="flex items-center gap-2">
                            <span>Developed with</span>
                            <span className="text-red-500 animate-pulse text-base">❤️</span>
                            <span>by</span>
                            <a
                                href="https://www.kinzix.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold border-b text-[#026df3] hover:text-[#0256c4] transition-colors duration-200"
                            >
                                Kinzix Infotech
                            </a>
                            {/* <span>India</span>
                            <span className="text-base">🇮🇳</span> */}
                        </div>
                        <p className="text-xs text-slate-500">
                            © {new Date().getFullYear()} Kinzix Infotech. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}