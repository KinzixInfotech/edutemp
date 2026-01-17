import { StatusIndicator } from "@/components/layout/client-layout";
import Link from "next/link";
import Image from "next/image";
import { Instagram, Youtube, Linkedin } from "lucide-react";

const footerData = {
    logo: {
        src: "/edu.png",
        alt: "EduBreezy",
        width: 200,
        height: 200,
    },
    columns: [
        {
            heading: "Product",
            items: [
                { label: "Features", link: "/features" },
                // { label: "Pricing", link: "/pricing" },
                { label: "Download", link: "#download" },
                { label: "Developer Login", link: "/developer-login" },
                { label: "Support", link: "/support" },
                // { label: "Changelog", link: "/changelog" },
            ],
        },
        // {
        //     heading: "Resources",
        //     items: [
        //         { label: "Blog", link: "/blog" },
        //         { label: "Support", link: "/support" },
        //         { label: "Use Cases", link: "/use-cases" },
        //         { label: "Knowledge Base", link: "/kb" },
        //     ],
        // },
        {
            heading: "Company",
            items: [
                { label: "About us", link: "/about" },
                { label: "Partner Program", link: "/partners" },
                { label: "Contact", link: "/contact" },
                // { label: "Careers", link: "/careers" },
            ],
        },
    ],
};

export default function Footer() {
    return (
        <footer className="relative  overflow-hidden bg-white px-4 lg:px-16 py-16">
            {/* Main content section */}
            {/* Centered large branding */}

            <div className="max-w-7xl mx-auto">
                {/* Links grid - top section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-16">
                    {footerData.columns.map((column, idx) => (
                        <div key={idx} className="space-y-4">
                            <h4 className="font-semibold text-slate-900 text-sm">
                                {column.heading}
                            </h4>
                            <ul className="space-y-2.5">
                                {column.items.map((item, i) => (
                                    <li key={i}>
                                        <Link
                                            href={item.link}
                                            className="text-slate-600 hover:text-slate-900 transition-colors duration-200 text-sm block relative group w-fit"
                                        >
                                            {item.label}
                                            <span className="absolute left-0 -bottom-0.5 w-0 h-[1.5px] bg-slate-900 transition-all duration-300 group-hover:w-full" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {/* Get in Touch */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-slate-900 text-sm">
                            Get in Touch
                        </h4>
                        <ul className="space-y-2.5">
                            <li>
                                <a href="mailto:hello@edubreezy.com" className="text-slate-600 hover:text-slate-900 transition-colors text-sm block relative group w-fit">
                                    hello@edubreezy.com
                                    <span className="absolute left-0 -bottom-0.5 w-0 h-[1.5px] bg-slate-900 transition-all duration-300 group-hover:w-full" />
                                </a>
                            </li>
                            <li>
                                <a href="mailto:partners@edubreezy.com" className="text-slate-600 hover:text-slate-900 transition-colors text-sm block relative group w-fit">
                                    partners@edubreezy.com
                                    <span className="absolute left-0 -bottom-0.5 w-0 h-[1.5px] bg-slate-900 transition-all duration-300 group-hover:w-full" />
                                </a>
                            </li>
                            <li>
                                <a href="tel:+919471532682" className="text-slate-600 hover:text-slate-900 transition-colors text-sm block relative group w-fit">
                                    +91 9471 532 682
                                    <span className="absolute left-0 -bottom-0.5 w-0 h-[1.5px] bg-slate-900 transition-all duration-300 group-hover:w-full" />
                                </a>
                            </li>
                            {/* <li className="pt-2">
                                <StatusIndicator />
                            </li> */}
                        </ul>
                    </div>
                </div>

                {/* Social icons and download */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-8 border-t border-slate-200">
                    {/* Social icons */}
                    <div className="flex gap-4">
                        <a href="https://www.instagram.com/edubreezyindia/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-all duration-300 flex items-center justify-center text-slate-700 hover:scale-110">
                            <Instagram className="w-5 h-5" />
                        </a>
                        <a href="https://www.youtube.com/@edubreezy" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-all duration-300 flex items-center justify-center text-slate-700 hover:scale-110">
                            <Youtube className="w-5 h-5" />
                        </a>
                        <a href="https://www.linkedin.com/company/edubreezy/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-all duration-300 flex items-center justify-center text-slate-700 hover:scale-110">
                            <Linkedin className="w-5 h-5" />
                        </a>
                    </div>

                    {/* Google Play button */}
                    <a href="#" className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-300 group">
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
                    </a>
                </div>



                {/* Bottom section */}
                <div className="border-t border-slate-200 pt-8 mt-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Company info */}
                        <div className="flex items-center flex-col gap-1">
                            <span className="text-gray-400 text-sm">Powered by</span>
                            <a href="https://www.kinzix.com" target="_blank" rel="noopener noreferrer">
                                <Image
                                    src="/kinzix-black.webp"
                                    alt="Kinzix"
                                    width={80}
                                    height={32}
                                    className="opacity-60 hover:opacity-100 transition-opacity"
                                />
                            </a>
                        </div>

                        {/* Legal links */}
                        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600">
                            <a href="/privacy-policy" className="hover:text-slate-900 transition-colors">
                                Privacy
                            </a>
                            <span>•</span>
                            <a href="/terms" className="hover:text-slate-900 transition-colors">
                                Terms
                            </a>
                            <span>•</span>
                            <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                                🚧 In Development
                            </span>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="text-center mt-8 text-sm text-slate-500">
                        <p className="mt-2 text-xs">
                            © {new Date().getFullYear()} Kinzix Infotech. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
            {/* <div className="text-center mb-2">
                <h1 className="text-[clamp(4rem,15vw,12rem)] font-black leading-none tracking-normal text-slate-900">
                    edu<span style={{ color: "#076bfd" }}>breezy</span>
                </h1>
                <p className="text-slate-600 text-lg mt-6 max-w-2xl mx-auto">
                    Empowering educational institutions with innovative management solutions for a brighter future.
                </p>
            </div> */}
        </footer>
    );
}