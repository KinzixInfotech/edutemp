'use client'
import React, { useState } from 'react';
import {
    ArrowRight, CheckCircle, Users, TrendingUp, DollarSign,
    Handshake, Award, BarChart3, Gift, Shield, Zap,
    Clock, Globe, Phone, Mail, Star, Target,
    Briefcase, Building2, UserPlus, Wallet, Sparkles,
    ChevronRight, Play, HeartHandshake
} from 'lucide-react';
import Header from '../components/Header';
import Link from 'next/link';
import { NumberTicker } from '@/components/ui/number-ticker';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import QuoteSection from '@/components/QuoteSection';
import { Highlighter } from '@/components/ui/highlighter';

export default function PartnersPage() {
    return (
        <div className="bg-white min-h-screen">
            <Header />

            {/* Hero Section */}
            <HeroSection />

            {/* Stats Section */}
            <StatsSection />

            {/* Why Partner Section */}
            <WhyPartnerSection />

            {/* Partner Types Section */}
            <PartnerTypesSection />

            {/* How It Works Section */}
            <HowItWorksSection />

            {/* Commission Structure */}
            <CommissionSection />

            {/* Benefits Section */}
            <BenefitsSection />

            {/* Testimonials */}
            <TestimonialsSection />

            {/* FAQ Section */}
            <FAQSection />

            {/* Final CTA */}
            <FinalCTASection />

            {/* Quote */}
            <QuoteSection
                quote="Together, we're transforming education across India. Join us and be part of the change."
                author="EduBreezy Team"
                variant="gradient"
            />
        </div>
    );
}

// Hero Section
function HeroSection() {
    return (
        <section className="min-h-[85vh] pt-32 pb-28 px-5 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_50%,#f0f7ff_100%)] relative flex items-center overflow-x-clip">
            {/* Mesh Gradient Glows */}
            <div className="absolute top-[10%] -left-[10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(5,105,255,0.2)_0%,transparent_70%)] blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[10%] -right-[10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(16,185,129,0.15)_0%,transparent_70%)] blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(139,92,246,0.1)_0%,transparent_70%)] blur-[100px] rounded-full pointer-events-none" />

            {/* Floating Icons - positioned to not overlap with content */}
            <div className="absolute hidden xl:flex top-28 left-[5%] w-14 h-14 bg-white rounded-2xl shadow-lg items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
                <Handshake size={28} className="text-[#0569ff]" />
            </div>
            <div className="absolute hidden xl:flex top-48 right-[5%] w-12 h-12 bg-white rounded-xl shadow-lg items-center justify-center animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
                <DollarSign size={24} className="text-[#10B981]" />
            </div>
            <div className="absolute hidden xl:flex bottom-40 left-[3%] w-11 h-11 bg-white rounded-xl shadow-lg items-center justify-center animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}>
                <TrendingUp size={22} className="text-[#F59E0B]" />
            </div>
            <div className="absolute hidden xl:flex bottom-28 right-[3%] w-14 h-14 bg-white rounded-2xl shadow-lg items-center justify-center animate-bounce" style={{ animationDuration: '2.8s', animationDelay: '0.3s' }}>
                <Award size={28} className="text-[#8B5CF6]" />
            </div>

            <div className="max-w-[1200px] mx-auto relative z-10 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Left Content */}
                    <div>
                        <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-6">
                            <Handshake size={16} />
                            EduBreezy Partner Program
                        </span>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1a1a2e] mb-6 leading-tight">
                            <Highlighter action="underline" color="#FF9800">Grow</Highlighter> With Us. <br />
                            <span className="text-[#0569ff]">Earn</span> With Us.
                        </h1>
                        <p className="text-[#666] text-lg md:text-xl max-w-xl mb-8 leading-relaxed">
                            Join India's fastest-growing EdTech partner network. Help schools transform their
                            management while earning attractive commissions and building a sustainable business.
                        </p>

                        <div className="flex flex-wrap gap-4 mb-10">
                            <Link href="/partners/register">
                                <button className="group flex items-center pr-1 gap-2 bg-[#0569ff] text-white border-0 rounded-full text-base font-semibold cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300">
                                    <span className='px-1 pl-6 py-3.5'>Become a Partner</span>
                                    <span className='bg-white p-2.5 rounded-full group-hover:bg-gray-50 transition-colors'>
                                        <ArrowRight size={18} strokeWidth={3} color='#0569ff' className='transition-transform duration-300 group-hover:-rotate-45' />
                                    </span>
                                </button>
                            </Link>
                            <Link href="/contact">
                                <button className="px-6 py-3.5 bg-white border-2 border-[#1a1a2e] text-[#1a1a2e] rounded-full text-base font-semibold hover:bg-[#1a1a2e] hover:text-white transition-all duration-300">
                                    Talk to Sales
                                </button>
                            </Link>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex flex-wrap gap-6">
                            {[
                                { icon: CheckCircle, text: "No Investment Required" },
                                { icon: CheckCircle, text: "Instant Onboarding" },
                                { icon: CheckCircle, text: "Lifetime Earnings" }
                            ].map((item, index) => (
                                <div key={index} className="flex items-center gap-2 text-[#555]">
                                    <item.icon size={18} className="text-[#10B981]" />
                                    <span className="text-sm font-medium">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right - Visual */}
                    <div className="relative hidden lg:block pb-8">
                        <div className="relative bg-gradient-to-br from-[#0569ff] to-[#0a52c6] rounded-3xl p-8 text-white shadow-2xl">
                            {/* Decorative elements */}
                            <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                            <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/10 rounded-full blur-lg" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-white/80">Partner Dashboard</p>
                                        <p className="font-bold text-lg">Your Earnings</p>
                                    </div>
                                </div>

                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-4">
                                    <p className="text-white/70 text-sm mb-2">Total Commission Earned</p>
                                    <p className="text-4xl font-bold">₹2,45,000</p>
                                    <div className="flex items-center gap-2 mt-2 text-green-300">
                                        <TrendingUp size={16} />
                                        <span className="text-sm">+32% this month</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                        <p className="text-white/70 text-xs mb-1">Active Referrals</p>
                                        <p className="text-2xl font-bold">48</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                        <p className="text-white/70 text-xs mb-1">Conversion Rate</p>
                                        <p className="text-2xl font-bold">67%</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating notification - positioned inside the card area */}
                        {/* <div className="absolute bottom-0 left-4 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 z-20 animate-bounce" style={{ animationDuration: '4s' }}>
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <DollarSign size={20} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">New Commission</p>
                                <p className="font-bold text-gray-900">₹15,000 received!</p>
                            </div>
                        </div> */}
                    </div>
                </div>
            </div>
        </section>
    );
}

// Stats Section
function StatsSection() {
    return (
        <section className="py-12 bg-[#0a2540]">
            <div className="max-w-[1200px] mx-auto px-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { value: 500, suffix: "+", label: "Active Partners", icon: Users },
                        { value: 50, suffix: "L+", label: "Commission Paid", icon: Wallet },
                        { value: 2000, suffix: "+", label: "Schools Onboarded", icon: Building2 },
                        { value: 98, suffix: "%", label: "Partner Satisfaction", icon: Star }
                    ].map((stat, index) => {
                        const IconComponent = stat.icon;
                        return (
                            <div key={index} className="text-center">
                                <div className="flex justify-center mb-3">
                                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                                        <IconComponent size={22} className="text-white" />
                                    </div>
                                </div>
                                <div className="text-3xl md:text-4xl font-bold text-white mb-1 flex items-center justify-center">
                                    <NumberTicker value={stat.value} delay={0.2 * index} className="text-white" />
                                    <span>{stat.suffix}</span>
                                </div>
                                <div className="text-white/70 text-sm">{stat.label}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// Why Partner Section
function WhyPartnerSection() {
    const reasons = [
        {
            icon: TrendingUp,
            title: "Growing EdTech Market",
            description: "India's EdTech market is booming. Schools are actively seeking digital solutions, making it the perfect time to join.",
            color: "#0569ff"
        },
        {
            icon: DollarSign,
            title: "Attractive Commissions",
            description: "Earn up to 30% commission on every successful referral. Plus, recurring income on renewals.",
            color: "#10B981"
        },
        {
            icon: Zap,
            title: "Easy to Sell",
            description: "Our product sells itself. With a free demo and clear ROI, conversions happen naturally.",
            color: "#F59E0B"
        },
        {
            icon: Shield,
            title: "Trusted Brand",
            description: "Partner with a recognized name in school management. Our reputation helps you close deals faster.",
            color: "#8B5CF6"
        }
    ];

    return (
        <section className="py-20 md:py-28 px-5 bg-white">
            <div className="max-w-[1200px] mx-auto">
                <div className="text-center mb-16">
                    <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        <Target size={16} />
                        Why Partner With Us
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] mb-4">
                        A <Highlighter action="underline" color="#FF9800">Win-Win</Highlighter> Partnership
                    </h2>
                    <p className="text-[#666] text-lg max-w-2xl mx-auto">
                        We&apos;ve built a partner program that rewards your efforts and helps you grow alongside us.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {reasons.map((reason, index) => {
                        const IconComponent = reason.icon;
                        return (
                            <div
                                key={index}
                                className="group p-6 rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 bg-white"
                            >
                                <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                                    style={{ backgroundColor: `${reason.color}15` }}
                                >
                                    <IconComponent size={26} style={{ color: reason.color }} />
                                </div>
                                <h3 className="text-lg font-bold text-[#1a1a2e] mb-3 group-hover:text-[#0569ff] transition-colors">
                                    {reason.title}
                                </h3>
                                <p className="text-[#666] text-sm leading-relaxed">
                                    {reason.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// Partner Types Section
function PartnerTypesSection() {
    const [selectedType, setSelectedType] = useState('affiliate');

    const partnerTypes = [
        {
            id: 'affiliate',
            name: 'Affiliate Partner',
            tagline: 'Perfect for individuals',
            icon: UserPlus,
            color: '#0569ff',
            description: 'Refer schools and earn commissions. No investment, no targets — just share and earn.',
            benefits: [
                'Zero investment required',
                'Work from anywhere',
                'Earn per successful referral',
                'No minimum targets',
                'Marketing materials provided'
            ],
            commission: 'Up to 15%',
            ideal: 'Teachers, Educators, Freelancers, Influencers'
        },
        {
            id: 'reseller',
            name: 'Reseller Partner',
            tagline: 'For active sellers',
            icon: Briefcase,
            color: '#10B981',
            description: 'Actively sell EduBreezy to schools in your region. Get dedicated support and higher commissions.',
            benefits: [
                'Higher commission rates',
                'Dedicated account manager',
                'Sales training & certification',
                'Co-branded materials',
                'Priority support for leads'
            ],
            commission: 'Up to 25%',
            ideal: 'Sales Professionals, IT Companies, Education Consultants'
        },
        {
            id: 'enterprise',
            name: 'Enterprise Partner',
            tagline: 'Strategic partnerships',
            icon: Building2,
            color: '#8B5CF6',
            description: 'Large-scale partnerships with school chains, education groups, or government bodies.',
            benefits: [
                'Highest commission tier',
                'Custom pricing for clients',
                'White-label options available',
                'Dedicated partnership team',
                'Joint marketing initiatives'
            ],
            commission: 'Up to 30%',
            ideal: 'Ed-Tech Companies, School Chains, Government Bodies'
        }
    ];

    const selectedPartner = partnerTypes.find(p => p.id === selectedType);

    return (
        <section className="py-20 md:py-28 px-5 bg-[#f8fafc]">
            <div className="max-w-[1200px] mx-auto">
                <div className="text-center mb-16">
                    <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        <Users size={16} />
                        Partner Types
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] mb-4">
                        Choose Your <Highlighter action="underline" color="#FF9800">Partnership</Highlighter> Level
                    </h2>
                    <p className="text-[#666] text-lg max-w-2xl mx-auto">
                        Whether you&apos;re an individual or an organization, we have a partnership model for you.
                    </p>
                </div>

                {/* Partner Type Selector */}
                <div className="flex flex-wrap justify-center gap-4 mb-12">
                    {partnerTypes.map((type) => {
                        const IconComponent = type.icon;
                        return (
                            <button
                                key={type.id}
                                onClick={() => setSelectedType(type.id)}
                                className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all duration-300 ${selectedType === type.id
                                    ? 'border-[#0569ff] bg-[#0569ff] text-white shadow-lg'
                                    : 'border-gray-200 bg-white text-[#1a1a2e] hover:border-[#0569ff]/50'
                                    }`}
                            >
                                <IconComponent size={22} />
                                <div className="text-left">
                                    <p className="font-bold">{type.name}</p>
                                    <p className={`text-xs ${selectedType === type.id ? 'text-white/80' : 'text-gray-500'}`}>
                                        {type.tagline}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Selected Partner Details */}
                {selectedPartner && (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            {/* Left - Info */}
                            <div className="p-8 lg:p-12">
                                <div className="flex items-center gap-3 mb-6">
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                        style={{ backgroundColor: `${selectedPartner.color}15` }}
                                    >
                                        <selectedPartner.icon size={28} style={{ color: selectedPartner.color }} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-[#1a1a2e]">{selectedPartner.name}</h3>
                                        <p className="text-[#666]">{selectedPartner.tagline}</p>
                                    </div>
                                </div>

                                <p className="text-[#555] text-lg mb-8 leading-relaxed">
                                    {selectedPartner.description}
                                </p>

                                <div className="mb-8">
                                    <h4 className="font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
                                        <Sparkles size={18} className="text-[#0569ff]" />
                                        Benefits
                                    </h4>
                                    <ul className="space-y-3">
                                        {selectedPartner.benefits.map((benefit, index) => (
                                            <li key={index} className="flex items-center gap-3 text-[#555]">
                                                <CheckCircle size={18} className="text-[#10B981] shrink-0" />
                                                {benefit}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-4 bg-[#f8fafc] rounded-xl mb-6">
                                    <p className="text-sm text-[#666] mb-1">Ideal For</p>
                                    <p className="font-semibold text-[#1a1a2e]">{selectedPartner.ideal}</p>
                                </div>

                                <Link href="/partners/register">
                                    <button className="w-full flex items-center justify-center gap-2 bg-[#0569ff] text-white py-4 rounded-full font-bold hover:bg-[#0569ff]/90 transition-all">
                                        Apply as {selectedPartner.name}
                                        <ArrowRight size={18} />
                                    </button>
                                </Link>
                            </div>

                            {/* Right - Commission Highlight */}
                            <div
                                className="p-8 lg:p-12 flex flex-col justify-center items-center text-white"
                                style={{ background: `linear-gradient(135deg, ${selectedPartner.color} 0%, ${selectedPartner.color}dd 100%)` }}
                            >
                                <div className="text-center">
                                    <p className="text-white/80 text-lg mb-2">Commission Rate</p>
                                    <p className="text-6xl md:text-7xl font-bold mb-4">{selectedPartner.commission}</p>
                                    <p className="text-white/70 text-sm max-w-xs mx-auto">
                                        On every successful school onboarding. Plus recurring commissions on renewals.
                                    </p>
                                </div>

                                <div className="mt-12 grid grid-cols-2 gap-6 w-full max-w-sm">
                                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                                        <p className="text-white/80 text-sm">Avg. Earning/Month</p>
                                        <p className="text-2xl font-bold">₹50K+</p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                                        <p className="text-white/80 text-sm">Top Partner Earns</p>
                                        <p className="text-2xl font-bold">₹5L+</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

// How It Works Section
function HowItWorksSection() {
    const steps = [
        {
            number: "01",
            title: "Register",
            description: "Fill out a simple form. No documents needed. Get approved within 24 hours.",
            icon: UserPlus,
            color: "#0569ff"
        },
        {
            number: "02",
            title: "Get Trained",
            description: "Access our partner portal. Watch training videos. Understand the product inside out.",
            icon: Play,
            color: "#10B981"
        },
        {
            number: "03",
            title: "Refer Schools",
            description: "Share your unique referral link. Connect us with schools. We handle the demos.",
            icon: Users,
            color: "#F59E0B"
        },
        {
            number: "04",
            title: "Earn Commissions",
            description: "Get paid when schools sign up. Monthly payouts directly to your bank account.",
            icon: Wallet,
            color: "#8B5CF6"
        }
    ];

    return (
        <section className="py-20 md:py-28 px-5 bg-white">
            <div className="max-w-[1200px] mx-auto">
                <div className="text-center mb-16">
                    <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        <Zap size={16} />
                        Simple Process
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] mb-4">
                        How It <Highlighter action="underline" color="#FF9800">Works</Highlighter>
                    </h2>
                    <p className="text-[#666] text-lg max-w-2xl mx-auto">
                        Start earning in just 4 simple steps. No complicated processes.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {steps.map((step, index) => {
                        const IconComponent = step.icon;
                        return (
                            <div key={index} className="relative">
                                {/* Connector line */}
                                {index < steps.length - 1 && (
                                    <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-gray-200 to-gray-100" />
                                )}

                                <div className="group p-6 rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 bg-white relative z-10">
                                    {/* Step Number */}
                                    <div
                                        className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                        style={{ backgroundColor: step.color }}
                                    >
                                        {step.number}
                                    </div>

                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                                        style={{ backgroundColor: `${step.color}15` }}
                                    >
                                        <IconComponent size={26} style={{ color: step.color }} />
                                    </div>

                                    <h3 className="text-lg font-bold text-[#1a1a2e] mb-3 group-hover:text-[#0569ff] transition-colors">
                                        {step.title}
                                    </h3>
                                    <p className="text-[#666] text-sm leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// Commission Structure
function CommissionSection() {
    return (
        <section className="py-20 md:py-28 px-5 bg-gradient-to-br from-[#0569ff] to-[#0a52c6] text-white">
            <div className="max-w-[1200px] mx-auto">
                <div className="text-center mb-16">
                    <span className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        <DollarSign size={16} />
                        Earning Potential
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                        Transparent Commission Structure
                    </h2>
                    <p className="text-white/80 text-lg max-w-2xl mx-auto">
                        No hidden terms. Clear payouts. Earn more as you grow.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        {
                            tier: "Bronze",
                            referrals: "1-5 Schools",
                            commission: "15%",
                            bonus: "₹5,000 welcome bonus"
                        },
                        {
                            tier: "Silver",
                            referrals: "6-15 Schools",
                            commission: "20%",
                            bonus: "₹15,000 quarterly bonus",
                            featured: true
                        },
                        {
                            tier: "Gold",
                            referrals: "16+ Schools",
                            commission: "30%",
                            bonus: "₹50,000 annual bonus + rewards"
                        }
                    ].map((plan, index) => (
                        <div
                            key={index}
                            className={`p-8 rounded-2xl ${plan.featured
                                ? 'bg-white text-[#1a1a2e] shadow-2xl scale-105'
                                : 'bg-white/10 backdrop-blur-sm'
                                }`}
                        >
                            {plan.featured && (
                                <span className="inline-block bg-[#0569ff] text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                                    MOST POPULAR
                                </span>
                            )}
                            <h3 className={`text-xl font-bold mb-2 ${plan.featured ? 'text-[#1a1a2e]' : 'text-white'}`}>
                                {plan.tier} Partner
                            </h3>
                            <p className={`text-sm mb-6 ${plan.featured ? 'text-gray-500' : 'text-white/70'}`}>
                                {plan.referrals}
                            </p>
                            <div className="mb-6">
                                <span className={`text-5xl font-bold ${plan.featured ? 'text-[#0569ff]' : 'text-white'}`}>
                                    {plan.commission}
                                </span>
                                <span className={`text-sm ${plan.featured ? 'text-gray-500' : 'text-white/70'}`}> commission</span>
                            </div>
                            <div className={`p-4 rounded-xl ${plan.featured ? 'bg-[#f8fafc]' : 'bg-white/10'}`}>
                                <p className={`text-sm ${plan.featured ? 'text-[#1a1a2e]' : 'text-white'}`}>
                                    <Gift size={16} className="inline mr-2" />
                                    {plan.bonus}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <p className="text-white/80 mb-6">
                        Plus, earn <span className="font-bold text-white">recurring commissions</span> on every renewal!
                    </p>
                    <Link href="/partners/register">
                        <button className="inline-flex items-center gap-2 bg-white text-[#0569ff] px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition-all shadow-lg">
                            Start Earning Today
                            <ArrowRight size={18} />
                        </button>
                    </Link>
                </div>
            </div>
        </section>
    );
}

// Benefits Section
function BenefitsSection() {
    const benefits = [
        { icon: Gift, title: "Marketing Materials", description: "Ready-to-use brochures, presentations, and social media content" },
        { icon: BarChart3, title: "Partner Dashboard", description: "Track referrals, earnings, and performance in real-time" },
        { icon: HeartHandshake, title: "Dedicated Support", description: "Personal account manager for high-performing partners" },
        { icon: Award, title: "Certification", description: "Get certified as an EduBreezy expert after training" },
        { icon: Globe, title: "Pan-India Opportunity", description: "Refer schools from anywhere in India — no territory restrictions" },
        { icon: Clock, title: "Quick Payouts", description: "Monthly payouts directly to your bank account" }
    ];

    return (
        <section className="py-20 md:py-28 px-5 bg-[#f8fafc]">
            <div className="max-w-[1200px] mx-auto">
                <div className="text-center mb-16">
                    <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        <Gift size={16} />
                        Partner Benefits
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] mb-4">
                        Everything You Need To <Highlighter action="underline" color="#FF9800">Succeed</Highlighter>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {benefits.map((benefit, index) => {
                        const IconComponent = benefit.icon;
                        return (
                            <div
                                key={index}
                                className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-300"
                            >
                                <div className="w-12 h-12 bg-[#0569ff]/10 rounded-xl flex items-center justify-center shrink-0">
                                    <IconComponent size={22} className="text-[#0569ff]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#1a1a2e] mb-2">{benefit.title}</h3>
                                    <p className="text-[#666] text-sm">{benefit.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// Testimonials Section
function TestimonialsSection() {
    const testimonials = [
        {
            text: "I've been a partner for just 6 months and already earned over ₹2 lakhs. The product sells itself once schools see the demo!",
            author: "Rahul Sharma",
            role: "Affiliate Partner",
            location: "Delhi",
            earning: "₹2L+ earned"
        },
        {
            text: "As an education consultant, EduBreezy fits perfectly into my services. My clients love it, and I love the commissions!",
            author: "Priya Patel",
            role: "Reseller Partner",
            location: "Mumbai",
            earning: "₹5L+ earned"
        },
        {
            text: "The partner support team is incredible. They help with demos, follow-ups, and closing. It's truly a partnership.",
            author: "Vikram Singh",
            role: "Enterprise Partner",
            location: "Bangalore",
            earning: "₹12L+ earned"
        }
    ];

    return (
        <section className="py-20 md:py-28 px-5 bg-white">
            <div className="max-w-[1200px] mx-auto">
                <div className="text-center mb-16">
                    <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        <Star size={16} />
                        Partner Stories
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] mb-4">
                        Hear From Our <Highlighter action="underline" color="#FF9800">Partners</Highlighter>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={index}
                            className="p-8 rounded-2xl bg-[#f8fafc] border border-gray-100 relative"
                        >
                            {/* Quote icon */}
                            <div className="absolute top-4 right-4 w-12 h-12 bg-[#0569ff]/10 rounded-full flex items-center justify-center">
                                <svg width="20" height="16" viewBox="0 0 32 24" fill="none">
                                    <path d="M0 24V14.4C0 11.7333 0.4 9.33333 1.2 7.2C2.06667 5.06667 3.26667 3.26667 4.8 1.8C6.4 0.333333 8.26667 -0.266667 10.4 0.133333V5.4C9.06667 5.66667 7.96667 6.26667 7.1 7.2C6.3 8.13333 5.9 9.26667 5.9 10.6V10.8H12V24H0ZM20 24V14.4C20 11.7333 20.4 9.33333 21.2 7.2C22.0667 5.06667 23.2667 3.26667 24.8 1.8C26.4 0.333333 28.2667 -0.266667 30.4 0.133333V5.4C29.0667 5.66667 27.9667 6.26667 27.1 7.2C26.3 8.13333 25.9 9.26667 25.9 10.6V10.8H32V24H20Z" fill="#0569ff" fillOpacity="0.3" />
                                </svg>
                            </div>

                            <p className="text-[#555] leading-relaxed mb-6 pr-16">{testimonial.text}</p>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-[#1a1a2e]">{testimonial.author}</p>
                                    <p className="text-sm text-[#666]">{testimonial.role}, {testimonial.location}</p>
                                </div>
                                <div className="bg-[#10B981]/10 text-[#10B981] px-3 py-1 rounded-full text-sm font-semibold">
                                    {testimonial.earning}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// FAQ Section
function FAQSection() {
    const faqs = [
        {
            q: "Is there any registration fee to become a partner?",
            a: "No, joining the EduBreezy Partner Program is completely free. There are no hidden charges or registration fees."
        },
        {
            q: "How and when do I receive my commissions?",
            a: "Commissions are paid monthly, directly to your bank account. You'll receive payment within 15 days of the school's subscription activation."
        },
        {
            q: "Do I need technical knowledge to become a partner?",
            a: "Not at all! We provide complete training and our sales team handles all technical demos. You just need to connect us with interested schools."
        },
        {
            q: "Can I partner with EduBreezy from any city in India?",
            a: "Yes! We welcome partners from all across India. There are no geographical restrictions on referrals."
        },
        {
            q: "What support do partners receive?",
            a: "Partners get access to marketing materials, training videos, a dedicated partner portal, and for high-performing partners, a personal account manager."
        },
        {
            q: "How long is the partner agreement valid?",
            a: "The partnership is ongoing as long as you're active. There's no fixed tenure, and you can pause or resume anytime."
        }
    ];

    return (
        <section className="py-20 md:py-28 px-5 bg-[#f8fafc]">
            <div className="max-w-[800px] mx-auto">
                <div className="text-center mb-12">
                    <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        <Award size={16} />
                        FAQs
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e]">
                        Frequently Asked Questions
                    </h2>
                </div>

                <Accordion type="single" collapsible className="space-y-3">
                    {faqs.map((faq, index) => (
                        <AccordionItem
                            key={index}
                            value={`item-${index}`}
                            className="bg-white border border-gray-100 rounded-2xl px-6 data-[state=open]:bg-[#0569ff]/5 data-[state=open]:border-[#0569ff]/20 transition-all"
                        >
                            <AccordionTrigger className="text-left font-bold text-[#1a1a2e] hover:no-underline py-5">
                                {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-[#666] pb-5">
                                {faq.a}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}

// Final CTA Section
function FinalCTASection() {
    return (
        <section className="py-20 md:py-28 px-5 bg-white">
            <div className="max-w-[900px] mx-auto text-center">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] mb-6">
                    Ready to Start Your <br />
                    <span className="text-[#0569ff]">Partner Journey?</span>
                </h2>
                <p className="text-[#666] text-lg mb-10 max-w-2xl mx-auto">
                    Join 500+ partners who are already earning with EduBreezy.
                    No investment. No targets. Just unlimited earning potential.
                </p>

                <div className="flex flex-wrap justify-center gap-4 mb-12">
                    <Link href="/partners/register">
                        <button className="group flex items-center pr-1 gap-2 bg-[#0569ff] text-white border-0 rounded-full text-lg font-semibold cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300">
                            <span className='px-1 pl-8 py-4'>Register as Partner</span>
                            <span className='bg-white p-3 rounded-full group-hover:bg-gray-50 transition-colors'>
                                <ArrowRight size={20} strokeWidth={3} color='#0569ff' className='transition-transform duration-300 group-hover:-rotate-45' />
                            </span>
                        </button>
                    </Link>
                    <Link href="/contact">
                        <button className="px-8 py-4 bg-white border-2 border-[#1a1a2e] text-[#1a1a2e] rounded-full text-lg font-semibold hover:bg-[#1a1a2e] hover:text-white transition-all duration-300">
                            Have Questions? Contact Us
                        </button>
                    </Link>
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap justify-center gap-8 text-[#666]">
                    <a href="mailto:partners@edubreezy.com" className="flex items-center gap-2 hover:text-[#0569ff] transition-colors">
                        <Mail size={18} />
                        partners@edubreezy.com
                    </a>
                    <a href="tel:+919876543210" className="flex items-center gap-2 hover:text-[#0569ff] transition-colors">
                        <Phone size={18} />
                        +91 98765 43210
                    </a>
                </div>
            </div>
        </section>
    );
}
