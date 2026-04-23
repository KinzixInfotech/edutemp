"use client";
import { useState } from "react";
import Image from "next/image";

const tabs = ["Boards", "Timeline", "Reports", "Automation"];

const tabContent = {
    Boards: {
        title: "Powerful Boards",
        points: [
            {
                label: "Class boards",
                desc: "Manage class routines, tasks, and assignments with simple visual boards."
            },
            {
                label: "Staff boards",
                desc: "Track staff tasks, schedules, and responsibilities across departments."
            },
            {
                label: "Custom workflows",
                desc: "Design your own school workflows — from events to exam setup."
            },
        ],
        image: "/features/boards.png", // Replace with your image path
    },
    Timeline: {
        title: "Real-Time Timelines",
        points: [
            {
                label: "Academic calendar",
                desc: "Plan and share academic activities across the year."
            },
            {
                label: "Class schedules",
                desc: "Automatically sync and display daily schedules."
            },
            {
                label: "Staff availability",
                desc: "Coordinate between staff availability and workload."
            },
        ],
        image: "/features/timeline.png",
    },
    Reports: {
        title: "Smart Reports",
        points: [
            {
                label: "Performance reports",
                desc: "Generate real-time reports for students, staff, and attendance."
            },
            {
                label: "Export-ready",
                desc: "Download or print reports with a single click."
            },
            {
                label: "Custom insights",
                desc: "Get tailored analytics to help your school grow."
            },
        ],
        image: "/features/reports.png",
    },
    Automation: {
        title: "Powerful Automation",
        points: [
            {
                label: "Fee reminders",
                desc: "Send automated SMS/email alerts for due payments."
            },
            {
                label: "Attendance alerts",
                desc: "Auto-notify parents when a student is absent."
            },
            {
                label: "Bulk messaging",
                desc: "Send important circulars in seconds to the entire school."
            },
        ],
        image: "/features/automation.png",
    },
};

export default function FeatureTabs() {
    const [activeTab, setActiveTab] = useState("Boards");

    return (
        <section className="w-full py-16 px-4 bg-white">
            <div className="max-w-7xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-semibold text-slate-800 mb-6">
                    Discover the features that make EduBreezy so easy to <br />use
                </h2>

                {/* Tabs */}
                <div className="flex justify-center gap-4 mb-12 flex-wrap">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            className={`px-4 py-2 rounded-full text-lg font-medium ${activeTab === tab
                                ? "bg-blue-100 text-blue-700"
                                : "text-slate-600 hover:text-blue-700"
                                }`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex flex-col px-6 md:px-16 md:flex-row items-start gap-12 mt-6 text-left">
                    {/* Left Content */}
                    <div className="w-full md:w-1/2">
                        <h3 className="text-2xl font-semibold text-slate-800 mb-4">
                            {tabContent[activeTab].title}
                        </h3>
                        <ul className="space-y-4 text-slate-700">
                            {tabContent[activeTab].points.map((point, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <span className="text-blue-500 text-lg font-bold">✓</span>
                                    <div>
                                        <strong>{point.label}:</strong> {point.desc}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Right Image */}
                    <div className="w-full md:w-1/2">
                        <div className="w-full h-[300px] md:h-[400px] bg-gray-200 rounded-xl overflow-hidden shadow-md flex items-center justify-center">
                            <Image
                                src={tabContent[activeTab].image}
                                alt={tabContent[activeTab].title}
                                width={700}
                                height={400}
                                className="object-contain w-full h-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
