'use client';

import React, { Fragment, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    CheckCircle2,
    Crown,
    Layers3,
    ShieldCheck,
    Sparkles,
    Users,
    Zap,
    Check,
    Minus,
    Plus,
    Info
} from 'lucide-react';
import Header from '../components/Header';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import {
    PLAN_BILLING,
    SCHOOL_FEATURE_PLAN,
    getFeatureDefinition,
    getPlanFeatureKeys,
    getFeatureCatalogForAdmin,
} from '@/lib/school-feature-config';

const PLAN_COPY = {
    [SCHOOL_FEATURE_PLAN.BASE]: {
        eyebrow: 'Base Plan',
        title: 'Run the entire school without the clutter.',
        description: 'Built for schools that need admissions, students, attendance, academics, exams, documents, and day-to-day operations in one reliable system.',
        accent: 'from-[#0b6bff] to-[#5ea2ff]',
        cardTone: 'border-[#d7e7ff] bg-white',
        icon: ShieldCheck,
    },
    [SCHOOL_FEATURE_PLAN.PRO]: {
        eyebrow: 'Pro Plan',
        title: 'Unlock growth, finance, automation, and premium workflows.',
        description: 'Adds fees, payroll, transport, library, SMS, school app experiences, explorer growth tools, HPC, alumni, and other monetization-grade modules.',
        accent: 'from-[#0d122b] to-[#0569ff]',
        cardTone: 'border-[#dbe3ff] bg-[#f7faff]',
        icon: Crown,
    },
};

function formatCurrency(amount) {
    return amount.toLocaleString('en-IN');
}

function buildFeatureLabels(plan) {
    return getPlanFeatureKeys(plan)
        .map((key) => getFeatureDefinition(key))
        .filter(Boolean)
        .map((feature) => feature.label);
}

function FAQItem({ question, answer }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200 last:border-0 py-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between text-left focus:outline-none group"
            >
                <h3 className="text-xl font-bold text-[#0f172a] group-hover:text-[#0569ff] transition-colors">{question}</h3>
                <div className={`ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${isOpen ? 'border-[#0569ff] bg-[#0569ff] text-white' : 'border-slate-200 bg-white text-slate-500'} transition-all`}>
                    {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </div>
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] mt-4' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <p className="text-slate-600 text-lg leading-relaxed pr-12">{answer}</p>
                </div>
            </div>
        </div>
    );
}

const FAQS = [
    {
        question: "Is there any setup fee?",
        answer: "No, we do not charge any setup fee. You only pay for the active students in your school."
    },
    {
        question: "Can I upgrade from BASE to PRO later?",
        answer: "Yes, you can upgrade from BASE to PRO at any time. The billing will be prorated based on the remaining months in your billing cycle."
    },
    {
        question: "How is the active student count calculated?",
        answer: "We count only the students who are currently enrolled and active in the system. Alumni or inactive students do not count towards your billing."
    },
    {
        question: "Do you offer discounts for larger student counts?",
        answer: "Yes, for schools with over 5,000 students or multiple branches, we offer custom pricing. Please book a demo to discuss your requirements."
    },
    {
        question: "What kind of support is included?",
        answer: "Both BASE and PRO plans include 24/7 email support and access to our comprehensive knowledge base. PRO users also get priority phone support and a dedicated account manager."
    }
];

export default function PricingCalculatorPage() {
    const rootRef = useRef(null);
    const [students, setStudents] = useState(800);

    const baseFeatures = useMemo(() => buildFeatureLabels(SCHOOL_FEATURE_PLAN.BASE), []);
    const proFeatures = useMemo(() => buildFeatureLabels(SCHOOL_FEATURE_PLAN.PRO), []);

    const featureCatalog = useMemo(() => getFeatureCatalogForAdmin(), []);

    const featuresByCategory = useMemo(() => {
        const grouped = {};
        featureCatalog.forEach(feature => {
            if (!grouped[feature.category]) grouped[feature.category] = [];
            grouped[feature.category].push(feature);
        });
        return grouped;
    }, [featureCatalog]);

    const baseYearly = students * PLAN_BILLING[SCHOOL_FEATURE_PLAN.BASE].pricePerStudent;
    const proYearly = students * PLAN_BILLING[SCHOOL_FEATURE_PLAN.PRO].pricePerStudent;

    return (
        <div ref={rootRef} className="min-h-screen overflow-x-hidden bg-[#fbfdff] text-[#111827]">
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(36px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInUpSlow {
                    from { opacity: 0; transform: translateY(48px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes parallaxFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-18px); }
                }
                .pricing-hero-1 { animation: fadeInUp 0.9s cubic-bezier(0.215,0.61,0.355,1) both; }
                .pricing-hero-2 { animation: fadeInUp 0.9s 0.12s cubic-bezier(0.215,0.61,0.355,1) both; }
                .pricing-hero-3 { animation: fadeInUp 0.9s 0.24s cubic-bezier(0.215,0.61,0.355,1) both; }
                .pricing-hero-4 { animation: fadeInUp 0.9s 0.36s cubic-bezier(0.215,0.61,0.355,1) both; }
                .pricing-reveal { animation: fadeInUpSlow 0.9s cubic-bezier(0.215,0.61,0.355,1) both; animation-timeline: view(); animation-range: entry 0% entry 30%; }
                .plan-card-1 { animation: fadeInUpSlow 1s 0s cubic-bezier(0.215,0.61,0.355,1) both; animation-timeline: view(); animation-range: entry 0% entry 30%; }
                .plan-card-2 { animation: fadeInUpSlow 1s 0.18s cubic-bezier(0.215,0.61,0.355,1) both; animation-timeline: view(); animation-range: entry 0% entry 30%; }
                .parallax-orb { animation: parallaxFloat 8s ease-in-out infinite; }
                .parallax-orb-2 { animation: parallaxFloat 10s 2s ease-in-out infinite; }
            `}</style>
            <Header />
            <main className="pt-24">
                <section className="relative overflow-hidden px-5 pb-20 pt-14 md:pt-20">
                    <InteractiveGridPattern
                        className="absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_65%_58%_at_50%_40%,white_40%,transparent_78%)]"
                        squares={[62, 62]}
                    />
                    <div className="parallax-orb absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#0569ff]/12 blur-3xl" />
                    <div className="parallax-orb-2 absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-[#0f172a]/8 blur-3xl" />

                    <div className="relative mx-auto max-w-5xl">
                        <div className="flex flex-col items-center text-center">
                            <span className="pricing-hero-1 inline-flex items-center gap-2 rounded-full border border-[#cfe0ff] bg-white px-4 py-2 text-sm font-semibold text-[#0569ff] shadow-sm mb-6">
                                <Sparkles className="h-4 w-4" />
                                BASE + PRO ERP Pricing
                            </span>
                            <h1 className="pricing-hero-2 text-[clamp(2.6rem,6vw,5.8rem)] font-black leading-[0.96] tracking-tight text-[#0f172a] mb-6">
                                Pricing that scales with
                                <span className="block bg-gradient-to-r from-[#0569ff] via-[#3f89ff] to-[#0f172a] bg-clip-text text-transparent">
                                    real student count.
                                </span>
                            </h1>
                            <p className="pricing-hero-3 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl mb-10">
                                Choose the operating depth your school needs. Start with BASE for core school workflows or move to PRO for finance, automation, growth, and premium operations.
                            </p>
                            <div className="pricing-hero-4 flex flex-wrap justify-center gap-4">
                                <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-[#0569ff] px-8 py-4 font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#0569ff]/25 hover:bg-[#0459db]">
                                    Book a Demo
                                    <ArrowRight className="h-5 w-5" />
                                </Link>
                            </div>
                        </div>
                        <div className="pricing-hero-4 mx-auto max-w-3xl mt-16 rounded-[1.2rem] border border-slate-200 bg-white p-4 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                            <div className="flex items-center gap-6 w-full md:w-auto px-4">
                                <div>
                                    <p className="font-bold text-[#0f172a]">Students</p>
                                    <p className="text-xs text-slate-500">Active student count</p>
                                </div>
                                <div className="flex items-center gap-4 ml-auto md:ml-0">
                                    <button onClick={() => setStudents(s => Math.max(100, s - 50))} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-[#0569ff] hover:text-[#0569ff] transition-colors"><Minus className="h-4 w-4" /></button>
                                    <span className="font-bold text-lg w-16 text-center">{students}</span>
                                    <button onClick={() => setStudents(s => Math.min(100000, s + 50))} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-[#0569ff] hover:text-[#0569ff] transition-colors"><Plus className="h-4 w-4" /></button>
                                </div>
                            </div>
                            <div className="hidden md:block w-px h-10 bg-slate-200"></div>
                            <div className="flex items-center gap-6 w-full md:w-auto px-4">
                                <div>
                                    <p className="font-bold text-[#0f172a]">Billing</p>
                                    <p className="text-xs text-slate-500">Preferred billing schedule</p>
                                </div>
                                <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1 ml-auto md:ml-0">
                                    <div className="rounded-full bg-white px-5 py-1.5 text-sm font-bold shadow-sm text-[#0f172a]">Yearly</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="pricing-reveal px-5 pb-10 mt-6">
                    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
                        {[SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO].map((plan, index) => {
                            const planFeatures = plan === SCHOOL_FEATURE_PLAN.BASE ? baseFeatures : proFeatures;
                            const yearlyPrice = plan === SCHOOL_FEATURE_PLAN.BASE ? baseYearly : proYearly;
                            return (
                                <div
                                    key={plan}
                                    className={`rounded-[1.2rem] border border-slate-200 bg-white p-8 flex flex-col transition-all hover:border-[#0569ff] hover:shadow-lg ${index === 0 ? 'plan-card-1' : 'plan-card-2'}`}
                                >
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="text-2xl font-bold text-[#0f172a]">{plan}</div>
                                        {index === 1 && (
                                            <span className="rounded-full bg-green-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700">Recommended</span>
                                        )}
                                    </div>
                                    <div className="flex items-end gap-1">
                                        <div className="text-6xl font-black text-[#0f172a] leading-none">₹{PLAN_BILLING[plan].pricePerStudent}</div>
                                        <div className="text-sm font-bold text-slate-600 mb-1">/ student</div>
                                    </div>
                                    <div className="mt-3 text-sm text-slate-500 font-medium">
                                        {students} students · ₹{formatCurrency(yearlyPrice)} billed yearly
                                    </div>

                                    <Link href="/contact" className={`mt-8 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-bold transition-all ${index === 0 ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-[#0569ff] text-white hover:bg-[#0459db]'}`}>
                                        Let's go <ArrowRight className="h-4 w-4" />
                                    </Link>

                                    <div className="mt-10 flex-1">
                                        <p className="text-sm font-bold text-[#0f172a]">What's included</p>
                                        <div className="mt-5 space-y-3.5">
                                            {planFeatures.slice(0, 10).map((feature, fIdx) => (
                                                <div key={fIdx} className="flex items-start gap-3 group/feat">
                                                    <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-800 group-hover/feat:bg-[#0569ff] transition-colors" />
                                                    <span className="text-sm font-medium text-slate-600 flex-1 group-hover/feat:text-[#0f172a] transition-colors">{feature}</span>
                                                    <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5 cursor-help group-hover/feat:text-[#0569ff] transition-colors" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="text-center mt-12 mb-8">
                        <p className="text-base text-slate-700 font-medium">
                            Need more than 5,000 students for your school? <Link href="/contact" className="font-bold underline decoration-slate-300 underline-offset-4 hover:decoration-[#0569ff] hover:text-[#0569ff] transition-colors">Get in touch for a discount <ArrowRight className="inline h-4 w-4" /></Link>
                        </p>
                    </div>

                    <div className="text-center">
                        <a href="#compare" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                            Compare plans <ArrowRight className="h-4 w-4 rotate-90" />
                        </a>
                    </div>
                </section>
                <section id="compare" className="pricing-reveal px-5 py-24 bg-white relative">
                    <div className="mx-auto max-w-7xl">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-black leading-tight text-[#0f172a]">
                                Feature comparison
                            </h2>
                            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                                See exactly what is included in each plan to find the right fit for your school.
                            </p>
                        </div>

                        <div className="overflow-x-auto rounded-[2rem] border border-slate-200 shadow-[0_35px_90px_-40px_rgba(5,105,255,0.15)] bg-white">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr>
                                        <th className="w-[40%] p-6 bg-[#fbfdff] border-b border-slate-200 align-bottom">
                                            <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Core Features</span>
                                        </th>
                                        <th className="w-[30%] p-6 bg-[#fbfdff] border-b border-slate-200 border-l align-bottom text-center">
                                            <div className="inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold text-white from-[#0b6bff] to-[#5ea2ff] mb-4">
                                                Base Plan
                                            </div>
                                            <div className="text-3xl font-black text-[#0f172a]">BASE</div>
                                            <div className="mt-2 text-sm font-medium text-slate-500">₹{PLAN_BILLING[SCHOOL_FEATURE_PLAN.BASE].pricePerStudent} / student / year</div>
                                        </th>
                                        <th className="w-[30%] p-6 bg-[#fbfdff] border-b border-slate-200 border-l align-bottom text-center">
                                            <div className="inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold text-white from-[#0d122b] to-[#0569ff] mb-4">
                                                Pro Plan
                                            </div>
                                            <div className="text-3xl font-black text-[#0569ff]">PRO</div>
                                            <div className="mt-2 text-sm font-medium text-slate-500">₹{PLAN_BILLING[SCHOOL_FEATURE_PLAN.PRO].pricePerStudent} / student / year</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(featuresByCategory).map(([category, features], idx) => (
                                        <Fragment key={category}>
                                            <tr className="bg-[#f4f8ff]">
                                                <td colSpan="3" className="px-8 py-5 text-sm font-black uppercase tracking-[0.15em] text-[#0569ff] border-b border-slate-200">
                                                    {category}
                                                </td>
                                            </tr>
                                            {features.map((feature, featureIdx) => {
                                                const isLast = featureIdx === features.length - 1 && idx === Object.keys(featuresByCategory).length - 1;
                                                const baseHas = feature.plans.includes(SCHOOL_FEATURE_PLAN.BASE);
                                                const proHas = feature.plans.includes(SCHOOL_FEATURE_PLAN.PRO);

                                                return (
                                                    <tr key={feature.key} className="hover:bg-[#fbfdff] transition-colors group">
                                                        <td className={`p-6 px-8 border-slate-200 ${!isLast ? 'border-b' : ''}`}>
                                                            <div className="text-base font-bold text-slate-800">{feature.label}</div>
                                                            <div className="mt-1.5 text-sm leading-relaxed text-slate-500 max-w-sm">{feature.description}</div>
                                                        </td>
                                                        <td className={`p-6 border-slate-200 border-l text-center bg-white/50 group-hover:bg-transparent transition-colors ${!isLast ? 'border-b' : ''}`}>
                                                            {baseHas ? (
                                                                <Check className="mx-auto h-6 w-6 text-[#0569ff] drop-shadow-sm" strokeWidth={3} />
                                                            ) : (
                                                                <Minus className="mx-auto h-5 w-5 text-slate-300" strokeWidth={2} />
                                                            )}
                                                        </td>
                                                        <td className={`p-6 border-slate-200 border-l text-center bg-[#f8fbff]/50 group-hover:bg-transparent transition-colors ${!isLast ? 'border-b' : ''}`}>
                                                            {proHas ? (
                                                                <Check className="mx-auto h-6 w-6 text-[#0569ff] drop-shadow-sm" strokeWidth={3} />
                                                            ) : (
                                                                <Minus className="mx-auto h-5 w-5 text-slate-300" strokeWidth={2} />
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}