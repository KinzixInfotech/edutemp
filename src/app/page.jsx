import Image from "next/image";
import Hero from "./components/Hero";
import FeatureTabs from "./components/Feature";
import './product.css';

export default function Home() {
    return (
        <div className="">
            {/* hero section */}
            <Hero />
            {/* feature section */}
            <FeatureTabs />
            {/* alternate features */}
            <AlternatingFeatures />
        </div>
    );
}
const features = [
    {
        title: "Customize how your team’s work flows",
        description:
            "Set up, clean up, and automate even the most complex school workflows—from admissions to daily attendance.",
        image: "/features/board-ui.png", // replace with your image path
    },
    {
        title: "Stay on track – even when the track changes",
        description:
            "Use timeline views to map the full school year, schedule exams, communicate updates, and keep everyone aligned.",
        image: "/features/timeline-ui.png", // replace with your image path
    },
    {
        title: "Empower staff with intelligent dashboards",
        description:
            "Give your teachers and admins clarity with role-based dashboards for productivity, attendance, and performance.",
        image: "/features/dashboard-ui.png", // replace with your image path
    },
];

function AlternatingFeatures() {
    return (
        <section className="w-full  bg-[#e9f2ff] py-20 md:px-16 px-6 rounded-lg">
            <div className="max-w-7xl mx-auto space-y-24">
                {features.map((feature, index) => {
                    const isEven = index % 2 === 0;
                    return (
                        <div
                            key={index}
                            className={`flex flex-col-reverse ${isEven ? "md:flex-row" : "md:flex-row-reverse"
                                } items-center gap-10`}
                        >
                            {/* Text */}
                            <div className="w-full md:w-1/2 text-center md:text-left">
                                <h2 className="text-3xl md:text-4xl font-semibold text-slate-800 mb-4">
                                    {feature.title}
                                </h2>
                                <div className="w-full h-1 bg-[#cfe1fd] mb-6" />
                                <p className="text-slate-600 text-lg leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>

                            {/* Image */}
                            <div className="w-full md:w-1/2">
                                <Image
                                    src={feature.image}
                                    alt={feature.title}
                                    width={700}
                                    height={400}
                                    className="rounded-xl w-full shadow-xl object-contain"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
