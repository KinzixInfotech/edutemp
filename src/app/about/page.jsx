import React from 'react';
import Head from 'next/head';

const AboutPage = () => {
    return (
        <>
            <Head>
                <title>About Edubreezy - One Platform. One App. Total Control.</title>
                <meta name="description" content="Edubreezy is an AI-driven school management platform built to simplify operations, boost efficiency, and give educational institutions complete control." />
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
                {/* Hero Section */}
                <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20 px-4">
                    <div className="absolute inset-0 bg-black opacity-5"></div>
                    <div className="relative max-w-7xl mx-auto text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            One App. Total Control.
                        </h1>
                        <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed">
                            Edubreezy is an AI-driven school management platform built to simplify operations,
                            boost efficiency, and give educational institutions complete control.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                            <button className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg">
                                Get Started Free
                            </button>
                            <button className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300">
                                Watch Demo
                            </button>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
                </section>

                {/* Stakeholders Section */}
                <section className="py-20 px-4 bg-white">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-gray-800">
                            Connect All Key Stakeholders
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { icon: '👩‍🏫', title: 'Teaching Staff', desc: 'Manage attendance, timetables, classes, assignments, syllabus uploads, and student reports.' },
                                { icon: '🧑‍💻', title: 'Non-Teaching Staff', desc: 'Handle administrative workflows, communication, and records with ease.' },
                                { icon: '🧑‍🎓', title: 'Students', desc: 'View class schedules, assignments, notices, circulars, results, and syllabus.' },
                                { icon: '👨‍👩‍👧', title: 'Parents', desc: 'Access attendance reports, performance updates, fees, transport details, and announcements.' },
                                { icon: '🏫', title: 'Principal & Director', desc: 'Monitor the entire school through centralized dashboards and AI insights.' },
                                { icon: '🧑‍💼', title: 'Admin', desc: 'Control modules, user permissions, and ensure smooth operations across departments.' }
                            ].map((stakeholder, index) => (
                                <div key={index} className="text-center p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300 border border-blue-100">
                                    <div className="text-5xl mb-4">{stakeholder.icon}</div>
                                    <h3 className="text-xl font-semibold mb-3 text-gray-800">{stakeholder.title}</h3>
                                    <p className="text-gray-600 leading-relaxed">{stakeholder.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20 px-4 bg-gray-50">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-gray-800">
                            Comprehensive Management Modules
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { icon: '🏫', title: 'Admissions & Fee Management', desc: 'Streamlined process with real-time collections and reports.' },
                                { icon: '⏰', title: 'Attendance Management', desc: 'Automated tracking for students and employees.' },
                                { icon: '🗓️', title: 'Timetable Management', desc: 'Auto-generate, manage, and update timetables with ease.' },
                                { icon: '📚', title: 'Library Management', desc: 'Digital cataloging, issuing, and return tracking.' },
                                { icon: '🚌', title: 'Transport Management', desc: 'GPS tracking, route optimization, and safety compliance.' },
                                { icon: '🧑‍🎓', title: 'Alumni Management', desc: 'Build networks and manage alumni engagement programs.' },
                                { icon: '🪪', title: 'Certificate Creation', desc: 'Instantly generate academic and co-curricular certificates.' },
                                { icon: '📝', title: 'Form Builder Tool', desc: 'Create admission, feedback, or survey forms in minutes.' },
                                { icon: '📢', title: 'Notice & Circulars', desc: 'Send announcements securely with access control.' }
                            ].map((feature, index) => (
                                <div key={index} className="p-6 rounded-xl bg-white hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                                    <div className="text-4xl mb-4">{feature.icon}</div>
                                    <h3 className="text-xl font-semibold mb-3 text-gray-800">{feature.title}</h3>
                                    <p className="text-gray-600">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* AI Insights Section */}
                <section className="py-20 px-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
                    <div className="relative max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
                                    Real-Time Dashboard & AI Insights
                                </h2>
                                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                                    Empower school leadership with real-time control and clarity through AI-powered analytics and predictive insights.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">📊</div>
                                        <div>
                                            <h4 className="font-semibold text-gray-800">Business Performance Metrics</h4>
                                            <p className="text-gray-600">Fee collection, admissions, revenue, and expenses at a glance.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">🎓</div>
                                        <div>
                                            <h4 className="font-semibold text-gray-800">Academic Analytics</h4>
                                            <p className="text-gray-600">Track student performance, attendance patterns, and exam results.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">⚡</div>
                                        <div>
                                            <h4 className="font-semibold text-gray-800">AI Alerts & Predictions</h4>
                                            <p className="text-gray-600">Get early warnings and recommendations for smarter planning.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-8 text-white">
                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        <div className="text-center p-4 bg-white/10 rounded-2xl">
                                            <div className="text-2xl font-bold">₹2.5M</div>
                                            <div className="text-sm opacity-90">Fee Collection</div>
                                        </div>
                                        <div className="text-center p-4 bg-white/10 rounded-2xl">
                                            <div className="text-2xl font-bold">98%</div>
                                            <div className="text-sm opacity-90">Attendance</div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-semibold mb-2">AI Insights</div>
                                        <div className="text-sm opacity-90">Predictive analytics for better decisions</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Security Section */}
                <section className="py-20 px-4 bg-white">
                    <div className="max-w-7xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
                            Hierarchy-Based Access & Data Security
                        </h2>
                        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
                            Complete control over who can access what with role-based permissions and layered security.
                        </p>
                        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                            {[
                                { role: 'Admins & Directors', desc: 'Full system control with top-level dashboards', color: 'from-blue-500' },
                                { role: 'Principals & HODs', desc: 'Departmental performance, analytics, and approvals', color: 'from-green-500' },
                                { role: 'Teachers & Staff', desc: 'Access to assigned classes, timetables, and notices', color: 'from-purple-500' },
                                { role: 'Students & Parents', desc: 'Limited access to personal records and communication', color: 'from-orange-500' }
                            ].map((access, index) => (
                                <div key={index} className={`p-6 rounded-2xl bg-gradient-to-br ${access.color} to-gray-100 text-white hover:shadow-xl transition-all duration-300`}>
                                    <h3 className="text-xl font-semibold mb-2">{access.role}</h3>
                                    <p className="opacity-90">{access.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Why Choose Section */}
                <section className="py-20 px-4 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
                    <div className="max-w-7xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-12">
                            Why Schools Choose Edubreezy
                        </h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { icon: '⚙️', title: 'End-to-End Automation', desc: 'All core school operations in one platform' },
                                { icon: '📈', title: 'AI-Powered Analytics', desc: 'Real-time insights for better decisions' },
                                { icon: '📱', title: 'Single App for All', desc: 'Connect everyone in one ecosystem' },
                                { icon: '🔐', title: 'Role-Based Access', desc: 'Secure and controlled data visibility' },
                                { icon: '🧭', title: 'Smarter Governance', desc: 'Streamlined communication and accountability' },
                                { icon: '💰', title: 'Cost-Effective', desc: 'Scalable solution for all school sizes' }
                            ].map((feature, index) => (
                                <div key={index} className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl hover:bg-white/20 transition-all duration-300">
                                    <div className="text-4xl mb-4">{feature.icon}</div>
                                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                                    <p className="opacity-90">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 px-4 bg-gray-900 text-white">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">
                            Experience the Future of School Management
                        </h2>
                        <p classByName="text-xl mb-8 opacity-90">
                            Edubreezy is more than a management tool — it's a strategic platform for institutional excellence.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 shadow-lg">
                                Start Free Trial
                            </button>
                            <button className="border-2 border-white hover:bg-white hover:text-gray-900 px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300">
                                Schedule Demo
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default AboutPage;