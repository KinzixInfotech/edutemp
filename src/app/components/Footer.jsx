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
                { label: "Careers", link: "/careers" },
                { label: "Events", link: "/events" },
                { label: "Blog", link: "/blog" },
                { label: "Investor Relations", link: "/investors" },
                { label: "Press Kit", link: "/press" },
                { label: "Contact", link: "/contact" },
            ],
        },
        {
            heading: "Products",
            items: [
                { label: "EduBreezy", link: "https://edutemp.vercel.app/login" },
                { label: "School Cloud", link: "/products/school-cloud" },
                { label: "Admin Panel", link: "/products/admin-panel" },
                { label: "Parent App", link: "/products/parent-app" },
                { label: "Teacher Tools", link: "/products/teacher-tools" },
                { label: "Library Manager", link: "/products/library-manager" },
                { label: "Transport Tracker", link: "/products/transport-tracker" },
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
        {
            heading: "Learn",
            items: [
                { label: "Training & Certification", link: "/learn/training" },
                { label: "Developer Docs", link: "/docs" },
                { label: "Enterprise Services", link: "/enterprise" },
                { label: "Partner Program", link: "/partners" },
                { label: "See all resources →", link: "/resources" },
            ],
        },
    ],
};

export default function Footer() {
    return (
        <footer className="bg-[#f8f8f8] border-t-black rounded-none relative overflow-hidden  px-4 md:px-6 border-t border-gray-200 pb-3">
            <div
                className="absolute inset-0 rotate-180 bg-[url('/cloud.png')] object-cover bg-top top-3.5"
            // style={{  }} // control cloud size
            ></div>
            <div className="max-w-7xl mx-auto relative container pt-16 z-40">
                <div className="flex flex-wrap justify-between items-center mb-10">
                    <div className="w-full md:w-auto mb-6 md:mb-0">
                        <Image
                            src={footerData.logo.src}
                            alt={footerData.logo.alt}
                            width={footerData.logo.width}
                            height={footerData.logo.height}
                            priority
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm text-slate-800 md:px-7 px-2">
                    {footerData.columns.map((column, idx) => (
                        <div key={idx}>
                            <h4 className="font-bold mb-4">{column.heading}</h4>
                            <ul className="space-y-2">
                                {column.items.map((item, i) => (
                                    <li key={i}>
                                        <a href={item.link} target="_blank" className="hover:underline">
                                            {item.label}
                                        </a>
                                    </li>
                                ))}

                            </ul>
                        </div>
                    ))}
                </div>

                {/* Footer bottom section */}
                <div className="border-t border-gray-300 mt-12 pt-6 text-xs text-gray-500 flex flex-col md:flex-row justify-between items-center px-4">
                    {/* Left - Copyright and Links */}
                    <div className="text-center md:text-left space-y-2">
                        <p>© {new Date().getFullYear()} EduBreezy. All rights reserved.</p>
                        <div className="space-x-4">
                            <a href="/privacy" className="hover:underline">
                                Privacy Policy
                            </a>
                            <a href="/terms" className="hover:underline">
                                Terms & Conditions
                            </a>
                        </div>
                        <p>
                            EduBreezy —{" "}
                            <a
                                href="https://www.kinzix.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:underline"
                            >
                                A Kinzix Product <br />
                            </a>
                        </p>
                        <span>Under Development</span>
                    </div>

                    {/* Right - Kinzix Logo */}
                    <div className="mt-4 md:mt-0">
                        <a
                            href="https://www.kinzix.com"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Image
                                src="/kinzix-black.webp" // replace with your actual logo path
                                alt="Kinzix"
                                width={100}
                                height={40}
                            />
                        </a>
                    </div>
                </div>

            </div>
        </footer>
    );
}
