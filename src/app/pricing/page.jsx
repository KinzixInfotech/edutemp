'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
    ArrowRight,
    CheckCircle2,
    Crown,
    IndianRupee,
    Layers3,
    ShieldCheck,
    Sparkles,
    Users,
    Zap,
} from 'lucide-react';
import Header from '../components/Header';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import {
    PLAN_BILLING,
    SCHOOL_FEATURE_PLAN,
    getFeatureDefinition,
    getPlanFeatureKeys,
} from '@/lib/school-feature-config';

gsap.registerPlugin(ScrollTrigger);

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

export default function PricingCalculatorPage() {
    const rootRef = useRef(null);
    const [students, setStudents] = useState(800);
    const [selectedPlan, setSelectedPlan] = useState(SCHOOL_FEATURE_PLAN.BASE);

    const baseFeatures = useMemo(() => buildFeatureLabels(SCHOOL_FEATURE_PLAN.BASE), []);
    const proFeatures = useMemo(() => buildFeatureLabels(SCHOOL_FEATURE_PLAN.PRO), []);

    const baseYearly = students * PLAN_BILLING[SCHOOL_FEATURE_PLAN.BASE].pricePerStudent;
    const proYearly = students * PLAN_BILLING[SCHOOL_FEATURE_PLAN.PRO].pricePerStudent;
    const activeYearly = selectedPlan === SCHOOL_FEATURE_PLAN.BASE ? baseYearly : proYearly;
    const monthlyEquivalent = Math.round(activeYearly / 12);
    const planCopy = PLAN_COPY[selectedPlan];
    const ActiveIcon = planCopy.icon;

    useEffect(() => {
        const context = gsap.context(() => {
            gsap.from('[data-pricing-hero]', {
                opacity: 0,
                y: 36,
                duration: 0.9,
                ease: 'power3.out',
                stagger: 0.12,
            });

            gsap.utils.toArray('[data-pricing-reveal]').forEach((item, index) => {
                gsap.from(item, {
                    scrollTrigger: {
                        trigger: item,
                        start: 'top 82%',
                    },
                    opacity: 0,
                    y: 48,
                    scale: 0.98,
                    duration: 0.9,
                    delay: index * 0.04,
                    ease: 'power3.out',
                });
            });

            gsap.from('[data-plan-card]', {
                scrollTrigger: {
                    trigger: '[data-plan-grid]',
                    start: 'top 78%',
                },
                opacity: 0,
                y: 56,
                duration: 1,
                stagger: 0.18,
                ease: 'power3.out',
            });

            gsap.to('[data-parallax-orb]', {
                yPercent: -18,
                ease: 'none',
                scrollTrigger: {
                    trigger: rootRef.current,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: true,
                },
            });
        }, rootRef);

        return () => context.revert();
    }, []);

    const sliderStudentCount = Math.min(5000, Math.max(100, students));

    return (
        <div ref={rootRef} className="min-h-screen overflow-x-hidden bg-[#fbfdff] text-[#111827]">
            <Header />

            <main className="pt-24">
                <section className="relative overflow-hidden px-5 pb-20 pt-14 md:pt-20">
                    <InteractiveGridPattern
                        className="absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_65%_58%_at_50%_40%,white_40%,transparent_78%)]"
                        squares={[62, 62]}
                    />
                    <div data-parallax-orb className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#0569ff]/12 blur-3xl" />
                    <div data-parallax-orb className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-[#0f172a]/8 blur-3xl" />

                    <div className="relative mx-auto max-w-7xl">
                        <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="space-y-6">
                                <span data-pricing-hero className="inline-flex items-center gap-2 rounded-full border border-[#cfe0ff] bg-white px-4 py-2 text-sm font-semibold text-[#0569ff] shadow-sm">
                                    <Sparkles className="h-4 w-4" />
                                    BASE + PRO ERP Pricing
                                </span>
                                <h1 data-pricing-hero className="max-w-4xl text-[clamp(2.6rem,6vw,5.8rem)] font-black leading-[0.96] tracking-tight text-[#0f172a]">
                                    Pricing that scales with
                                    <span className="block bg-gradient-to-r from-[#0569ff] via-[#3f89ff] to-[#0f172a] bg-clip-text text-transparent">
                                        real student count.
                                    </span>
                                </h1>
                                <p data-pricing-hero className="max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                                    Choose the operating depth your school needs. Start with BASE for core school workflows or move to PRO for finance, automation, growth, and premium operations.
                                </p>
                                <div data-pricing-hero className="flex flex-wrap gap-3">
                                    <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-[#0569ff] px-7 py-4 font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0459db]">
                                        Book a Demo
                                        <ArrowRight className="h-5 w-5" />
                                    </Link>
                                    <a href="#plan-calculator" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-4 font-bold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0569ff] hover:text-[#0569ff]">
                                        Calculate Your Cost
                                    </a>
                                </div>
                            </div>

                            <div data-pricing-hero className="rounded-[2rem] border border-[#dbe8ff] bg-white p-5 shadow-[0_30px_80px_-30px_rgba(5,105,255,0.28)]">
                                <div className="rounded-[1.6rem] bg-gradient-to-br from-[#0f172a] via-[#0c234a] to-[#0569ff] p-6 text-white">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm uppercase tracking-[0.22em] text-white/60">Live Quote</p>
                                            <p className="mt-2 text-2xl font-bold">{students.toLocaleString('en-IN')} students</p>
                                        </div>
                                        <div className="rounded-2xl bg-white/10 p-3">
                                            <Users className="h-7 w-7" />
                                        </div>
                                    </div>
                                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                        <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                                            <p className="text-sm text-white/70">BASE yearly</p>
                                            <p className="mt-2 text-3xl font-black">₹{formatCurrency(baseYearly)}</p>
                                            <p className="mt-2 text-sm text-white/60">₹10 per student / year</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                                            <p className="text-sm text-white/70">PRO yearly</p>
                                            <p className="mt-2 text-3xl font-black">₹{formatCurrency(proYearly)}</p>
                                            <p className="mt-2 text-sm text-white/60">₹20 per student / year</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/8 p-4">
                                        <p className="text-sm text-white/70">Current selection</p>
                                        <div className="mt-2 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-2xl bg-white/12 p-2">
                                                    <ActiveIcon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold">{selectedPlan}</p>
                                                    <p className="text-sm text-white/60">{planCopy.eyebrow}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black">₹{formatCurrency(activeYearly)}</p>
                                                <p className="text-sm text-white/60">about ₹{formatCurrency(monthlyEquivalent)}/month</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section data-pricing-reveal className="px-5 pb-10">
                    <div data-plan-grid className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
                        {[SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO].map((plan) => {
                            const copy = PLAN_COPY[plan];
                            const Icon = copy.icon;
                            const planFeatures = plan === SCHOOL_FEATURE_PLAN.BASE ? baseFeatures : proFeatures;

                            return (
                                <div
                                    key={plan}
                                    data-plan-card
                                    className={`rounded-[2rem] border p-7 shadow-[0_25px_65px_-35px_rgba(15,23,42,0.25)] ${copy.cardTone}`}
                                >
                                    <div className={`inline-flex rounded-full bg-gradient-to-r px-4 py-2 text-sm font-bold text-white ${copy.accent}`}>
                                        {copy.eyebrow}
                                    </div>
                                    <div className="mt-6 flex items-start justify-between gap-6">
                                        <div>
                                            <h2 className="text-3xl font-black text-[#0f172a]">{plan}</h2>
                                            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">{copy.description}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                            <Icon className="h-6 w-6 text-[#0569ff]" />
                                        </div>
                                    </div>
                                    <div className="mt-8 flex items-end gap-3">
                                        <span className="text-6xl font-black text-[#0f172a]">₹{PLAN_BILLING[plan].pricePerStudent}</span>
                                        <div className="pb-2 text-sm text-slate-500">
                                            <div>per student</div>
                                            <div>per year</div>
                                        </div>
                                    </div>
                                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                                        {planFeatures.slice(0, 8).map((feature) => (
                                            <div key={feature} className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4">
                                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0569ff]" />
                                                <span className="text-sm font-medium text-slate-700">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section id="plan-calculator" data-pricing-reveal className="px-5 py-20">
                    <div className="mx-auto max-w-7xl rounded-[2.2rem] border border-slate-200 bg-white p-6 shadow-[0_35px_90px_-40px_rgba(5,105,255,0.35)] md:p-10">
                        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                            <div className="space-y-6">
                                <div>
                                    <span className="inline-flex items-center gap-2 rounded-full bg-[#0569ff]/8 px-4 py-2 text-sm font-semibold text-[#0569ff]">
                                        <Layers3 className="h-4 w-4" />
                                        Interactive calculator
                                    </span>
                                    <h2 className="mt-4 text-4xl font-black leading-tight text-[#0f172a]">
                                        See the exact amount before you ever talk to sales.
                                    </h2>
                                    <p className="mt-4 text-base leading-7 text-slate-600">
                                        Switch between BASE and PRO, enter your active student count, and the page recalculates instantly. Same model we now use inside the ERP control system.
                                    </p>
                                </div>

                                <div className="rounded-[1.5rem] border border-slate-200 bg-[#f8fbff] p-5">
                                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Student count</p>
                                    <div className="mt-5 flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setStudents((current) => Math.max(100, current - 100))}
                                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition-all hover:border-[#0569ff] hover:text-[#0569ff]"
                                        >
                                            -100
                                        </button>
                                        <div className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-4">
                                            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Active students</div>
                                            <input
                                                value={students}
                                                onChange={(event) => {
                                                    const nextValue = Number(event.target.value || 0);
                                                    setStudents(Math.max(1, Math.min(100000, nextValue || 1)));
                                                }}
                                                className="mt-2 w-full bg-transparent text-4xl font-black text-[#0f172a] outline-none"
                                                inputMode="numeric"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setStudents((current) => Math.min(100000, current + 100))}
                                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition-all hover:border-[#0569ff] hover:text-[#0569ff]"
                                        >
                                            +100
                                        </button>
                                    </div>
                                    <input
                                        className="mt-6 w-full accent-[#0569ff]"
                                        type="range"
                                        min="100"
                                        max="5000"
                                        step="50"
                                        value={sliderStudentCount}
                                        onChange={(event) => setStudents(Number(event.target.value))}
                                    />
                                    <div className="mt-2 flex justify-between text-xs text-slate-400">
                                        <span>100</span>
                                        <span>1,500</span>
                                        <span>3,000</span>
                                        <span>5,000</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {[SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO].map((plan) => (
                                        <button
                                            key={plan}
                                            type="button"
                                            onClick={() => setSelectedPlan(plan)}
                                            className={`rounded-[1.4rem] border p-5 text-left transition-all duration-300 ${selectedPlan === plan
                                                ? 'border-[#0569ff] bg-[#0569ff] text-white shadow-lg'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-[#0569ff]/40'}`}
                                        >
                                            <div className="text-xs uppercase tracking-[0.18em] opacity-70">{plan}</div>
                                            <div className="mt-3 text-3xl font-black">₹{PLAN_BILLING[plan].pricePerStudent}</div>
                                            <div className="mt-1 text-sm opacity-80">per student / year</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-[2rem] bg-gradient-to-br from-[#0f172a] via-[#13264d] to-[#0569ff] p-6 text-white md:p-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm uppercase tracking-[0.22em] text-white/60">Selected plan</p>
                                        <p className="mt-2 text-3xl font-black">{selectedPlan}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white/10 p-3">
                                        <ActiveIcon className="h-7 w-7" />
                                    </div>
                                </div>

                                <div className="mt-8 grid gap-4 md:grid-cols-2">
                                    <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
                                        <p className="text-sm text-white/70">Yearly ERP cost</p>
                                        <p className="mt-3 text-4xl font-black">₹{formatCurrency(activeYearly)}</p>
                                        <p className="mt-2 text-sm text-white/60">
                                            {students.toLocaleString('en-IN')} × ₹{PLAN_BILLING[selectedPlan].pricePerStudent}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
                                        <p className="text-sm text-white/70">Monthly equivalent</p>
                                        <p className="mt-3 text-4xl font-black">₹{formatCurrency(monthlyEquivalent)}</p>
                                        <p className="mt-2 text-sm text-white/60">For internal budgeting only</p>
                                    </div>
                                </div>

                                <div className="mt-8 rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
                                    <div className="flex items-center gap-3">
                                        <Zap className="h-5 w-5 text-[#7ec3ff]" />
                                        <p className="font-semibold">What you unlock with {selectedPlan}</p>
                                    </div>
                                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                        {(selectedPlan === SCHOOL_FEATURE_PLAN.BASE ? baseFeatures : proFeatures).slice(0, 10).map((feature) => (
                                            <div key={feature} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/6 p-4">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7ec3ff]" />
                                                <span className="text-sm text-white/90">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                    <Link href="/contact" className="flex-1">
                                        <span className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-4 font-bold text-[#0569ff] transition-all duration-300 hover:-translate-y-0.5">
                                            Request Proposal
                                            <ArrowRight className="h-5 w-5" />
                                        </span>
                                    </Link>
                                    <Link href="/" className="flex-1">
                                        <span className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-4 font-bold text-white transition-all duration-300 hover:bg-white/16">
                                            Back to Homepage
                                        </span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
