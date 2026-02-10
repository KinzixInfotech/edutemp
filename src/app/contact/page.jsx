'use client'
import React, { useState } from 'react';
import {
    Mail, Phone, Clock, Send, ArrowRight,
    MessageCircle, Users, CheckCircle,
    Sparkles, Calendar, GraduationCap, BarChart3, Star
} from 'lucide-react';
import Header from '../components/Header';
import Link from 'next/link';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import QuoteSection from '@/components/QuoteSection';
import { Highlighter } from '@/components/ui/highlighter';
import CalEmbed from '@/components/cal';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        schoolName: '',
        role: '',
        studentCount: '',
        message: '',
        demoPreferred: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        setIsSubmitted(true);
    };

    const faqs = [
        {
            q: "How long is the demo session?",
            a: "Our personalized demo sessions typically last 30-45 minutes, depending on your questions and requirements."
        },
        {
            q: "Is the demo free?",
            a: "Yes, the demo is completely free with no strings attached. We believe in showing value before asking for commitment."
        },
        {
            q: "Can I invite my team to the demo?",
            a: "Absolutely! We encourage you to invite key decision-makers and stakeholders to get a comprehensive view of how EduBreezy can help."
        },
        {
            q: "What happens after the demo?",
            a: "After the demo, we'll send you a detailed proposal based on your requirements. You can take your time to decide — no pressure!"
        }
    ];

    return (
        <div className="bg-white min-h-screen">

            {/* Hero Section - Matching Homepage Style */}
            <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-white pt-24">
                {/* Interactive Grid Pattern Background */}
                <InteractiveGridPattern
                    className="absolute opacity-80 inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,white_40%,transparent_70%)]"
                    squares={[60, 60]}
                />

                {/* Large Background Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <span className="text-[clamp(6rem,20vw,16rem)] font-black text-gray-100/30 leading-none tracking-tighter">
                        CONTACT
                    </span>
                </div>

                {/* Gradient Orb */}
                <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-[#0469ff]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-[#10B981]/5 rounded-full blur-3xl" />

                <div className="relative max-w-[1200px] mx-auto px-6 py-16 z-10 w-full">
                    <div className="text-center space-y-6">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#0469ff]/20 bg-[#0469ff]/5">
                            <div className="w-2 h-2 rounded-full bg-[#0469ff] animate-pulse" />
                            <span className="text-sm font-semibold text-[#0469ff]">Get In Touch</span>
                        </div>

                        {/* Main Heading */}
                        <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[1.05] tracking-tight">
                            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                                Let's Transform Your
                            </span>
                            <br />
                            <span className="relative inline-block mt-2">
                                <span className="text-[#0469ff]">
                                    School Together
                                </span>
                                <svg className="absolute -bottom-3 left-0 w-full" height="10" viewBox="0 0 300 12" fill="none">
                                    <path d="M2 8C70 3 150 1 298 8" stroke="#0469ff" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg md:text-xl text-gray-600 max-w-[600px] mx-auto leading-relaxed font-medium">
                            Book a free demo, ask questions, or get personalized guidance. We're here to help you modernize your school management.
                        </p>

                        {/* Trust indicators */}
                        <div className="flex flex-wrap justify-center gap-6 pt-4">
                            <div className="flex items-center gap-2 text-[#555]">
                                <div className="w-8 h-8 bg-[#10B981]/10 rounded-full flex items-center justify-center">
                                    <CheckCircle size={16} className="text-[#10B981]" />
                                </div>
                                <span className="text-sm font-medium">Free Demo</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#555]">
                                <div className="w-8 h-8 bg-[#10B981]/10 rounded-full flex items-center justify-center">
                                    <CheckCircle size={16} className="text-[#10B981]" />
                                </div>
                                <span className="text-sm font-medium">No Commitment</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#555]">
                                <div className="w-8 h-8 bg-[#10B981]/10 rounded-full flex items-center justify-center">
                                    <CheckCircle size={16} className="text-[#10B981]" />
                                </div>
                                <span className="text-sm font-medium">24hr Response</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-16 md:py-24 px-5">
                <div className="max-w-[1200px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

                        {/* Left Side - Contact Info */}
                        <div className="lg:col-span-2 space-y-8">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] mb-4">
                                    Contact Information
                                </h2>
                                <p className="text-[#666]">
                                    Have questions? Reach out to us through any of these channels.
                                </p>
                            </div>

                            {/* Contact Cards */}
                            <div className="space-y-4">
                                {[
                                    {
                                        icon: Phone,
                                        title: "Phone",
                                        value: "+91 9471 532 682",
                                        subtext: "Mon-Sat, 9AM-6PM IST",
                                        color: "#0569ff"
                                    },
                                    {
                                        icon: Mail,
                                        title: "Email",
                                        value: "hello@edubreezy.com",
                                        subtext: "We reply within 24 hours",
                                        color: "#10B981"
                                    }
                                ].map((item, index) => {
                                    const IconComponent = item.icon;
                                    return (
                                        <div
                                            key={index}
                                            className="flex items-start gap-4 p-5 rounded-2xl bg-[#f8fafc] border border-gray-100 hover:border-[#0569ff]/20 transition-all duration-300"
                                        >
                                            <div
                                                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: `${item.color}15` }}
                                            >
                                                <IconComponent size={22} style={{ color: item.color }} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-[#888] mb-1">{item.title}</p>
                                                <p className="font-semibold text-[#1a1a2e]">{item.value}</p>
                                                <p className="text-sm text-[#666]">{item.subtext}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Why Book a Demo */}
                            <div className="bg-gradient-to-br from-[#0569ff]/5 to-[#0569ff]/10 p-6 rounded-2xl">
                                <h3 className="font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
                                    <Sparkles size={18} className="text-[#0569ff]" />
                                    Why Book a Demo?
                                </h3>
                                <ul className="space-y-3">
                                    {[
                                        "See all features in action",
                                        "Get answers to your questions",
                                        "Learn about custom pricing",
                                        "No commitment required"
                                    ].map((item, index) => (
                                        <li key={index} className="flex items-center gap-3 text-sm text-[#555]">
                                            <CheckCircle size={16} className="text-[#10B981] shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Right Side - Form */}
                        <div className="lg:col-span-3">
                            {!isSubmitted ? (
                                <div className="bg-[#f8fafc] p-8 md:p-10 rounded-3xl border border-gray-100">
                                    <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">
                                        Book a Free Demo
                                    </h2>
                                    <p className="text-[#666] mb-8">
                                        Fill out the form and we'll get back to you within 24 hours.
                                    </p>

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {/* Name & Email Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                                                    Your Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#0569ff] focus:ring-2 focus:ring-[#0569ff]/20 outline-none transition-all"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                                                    Email Address *
                                                </label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#0569ff] focus:ring-2 focus:ring-[#0569ff]/20 outline-none transition-all"
                                                    placeholder="john@school.com"
                                                />
                                            </div>
                                        </div>

                                        {/* Phone & School Name Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                                                    Phone Number *
                                                </label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#0569ff] focus:ring-2 focus:ring-[#0569ff]/20 outline-none transition-all"
                                                    placeholder="+91 9471 532 682"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                                                    School Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="schoolName"
                                                    value={formData.schoolName}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#0569ff] focus:ring-2 focus:ring-[#0569ff]/20 outline-none transition-all"
                                                    placeholder="ABC Public School"
                                                />
                                            </div>
                                        </div>

                                        {/* Role & Student Count Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                                                    Your Role
                                                </label>
                                                <select
                                                    name="role"
                                                    value={formData.role}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#0569ff] focus:ring-2 focus:ring-[#0569ff]/20 outline-none transition-all"
                                                >
                                                    <option value="">Select your role</option>
                                                    <option value="owner">School Owner</option>
                                                    <option value="principal">Principal</option>
                                                    <option value="administrator">Administrator</option>
                                                    <option value="teacher">Teacher</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                                                    Number of Students
                                                </label>
                                                <select
                                                    name="studentCount"
                                                    value={formData.studentCount}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#0569ff] focus:ring-2 focus:ring-[#0569ff]/20 outline-none transition-all"
                                                >
                                                    <option value="">Select range</option>
                                                    <option value="0-100">0 - 100</option>
                                                    <option value="100-500">100 - 500</option>
                                                    <option value="500-1000">500 - 1,000</option>
                                                    <option value="1000-5000">1,000 - 5,000</option>
                                                    <option value="5000+">5,000+</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Preferred Demo Time */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                                                Preferred Demo Time
                                            </label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {['Morning', 'Afternoon', 'Evening', 'Anytime'].map((time) => (
                                                    <label
                                                        key={time}
                                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.demoPreferred === time
                                                            ? 'border-[#0569ff] bg-[#0569ff]/10 text-[#0569ff]'
                                                            : 'border-gray-200 bg-white hover:border-[#0569ff]/50'
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="demoPreferred"
                                                            value={time}
                                                            checked={formData.demoPreferred === time}
                                                            onChange={handleChange}
                                                            className="sr-only"
                                                        />
                                                        <Clock size={16} />
                                                        <span className="text-sm font-medium">{time}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Message */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                                                Message (Optional)
                                            </label>
                                            <textarea
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                rows={4}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#0569ff] focus:ring-2 focus:ring-[#0569ff]/20 outline-none transition-all resize-none"
                                                placeholder="Tell us about your requirements..."
                                            />
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full flex items-center justify-center gap-3 bg-[#0569ff] text-white px-8 py-4 rounded-full font-bold text-base hover:bg-[#0569ff]/90 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    Book Free Demo
                                                    <Send size={18} />
                                                </>
                                            )}
                                        </button>

                                        <p className="text-center text-sm text-[#888]">
                                            By submitting, you agree to our{' '}
                                            <Link href="/privacy" className="text-[#0569ff] hover:underline">Privacy Policy</Link>
                                        </p>
                                    </form>
                                </div>
                            ) : (
                                /* Success State */
                                <div className="bg-[#f8fafc] p-10 md:p-16 rounded-3xl border border-gray-100 text-center">
                                    <div className="w-20 h-20 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle size={40} className="text-[#10B981]" />
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] mb-4">
                                        Thank You! 🎉
                                    </h2>
                                    <p className="text-[#666] max-w-md mx-auto mb-8">
                                        Your demo request has been submitted successfully.
                                        Our team will contact you within 24 hours to schedule your personalized demo.
                                    </p>
                                    <Link
                                        href="/"
                                        className="inline-flex items-center gap-2 bg-[#0569ff] text-white px-8 py-4 rounded-full font-bold hover:bg-[#0569ff]/90 transition-all"
                                    >
                                        Back to Home
                                        <ArrowRight size={18} />
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>



            {/* Book a Meeting Section */}
            <section className="py-16 md:py-24 px-5 bg-gradient-to-b from-white to-[#f8fafc]">
                <div className="max-w-[1200px] mx-auto">
                    <div className="text-left md:text-center mb-10">
                        <span className="inline-flex items-center gap-2 bg-[#10B981]/10 text-[#10B981] px-4 py-2 rounded-full text-sm font-semibold mb-4">
                            <MessageCircle size={16} />
                            Have Questions?
                        </span>
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#1a1a2e] mb-4">
                            Schedule a <Highlighter action="underline" color="#FF9800"><span className="text-[#0569ff]">Quick Call</span></Highlighter>
                        </h2>
                        <p className="text-[#666] text-lg max-w-2xl md:mx-auto">
                            Got questions? Book a quick 30-minute call with our team to get all your answers.
                        </p>
                    </div>

                    <div className="relative">
                        {/* Gradient glow behind */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#0569ff]/20 via-[#FF9800]/20 to-[#0569ff]/20 rounded-[2rem] blur-xl opacity-70" />

                        {/* Main container */}
                        <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
                            {/* Mac-style dark header bar */}
                            <div className="bg-[#2d2d2d] px-4 py-3 flex items-center gap-3">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                                </div>
                                <div className="flex-1 mx-4">
                                    <div className="bg-[#3f3f3f] rounded-md px-3 py-1.5 text-xs text-gray-300 text-center">
                                        cal.com/edubreezy-meet
                                    </div>
                                </div>
                            </div>

                            {/* Calendar embed */}
                            <div className="h-[550px] md:h-[650px]">
                                <CalEmbed />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* FAQ Section with Accordion */}
            <section className="py-16 px-5 bg-white">
                <div className="max-w-[800px] mx-auto">
                    <div className="text-center mb-10">
                        <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-4">
                            <MessageCircle size={16} />
                            FAQs
                        </span>
                        <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e]">
                            Frequently Asked Questions
                        </h2>
                    </div>

                    <Accordion type="single" collapsible className="space-y-3">
                        {faqs.map((faq, index) => (
                            <AccordionItem
                                key={index}
                                value={`item-${index}`}
                                className="bg-[#f8fafc] border border-gray-100 rounded-2xl px-6 data-[state=open]:bg-[#0569ff]/5 data-[state=open]:border-[#0569ff]/20 transition-all"
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
            {/* Motivational Quote */}
            <QuoteSection
                quote="We're not just building software. We're building the future of how schools connect, communicate, and create impact."
                author="Co-Founder, EduBreezy"
                variant="gradient"
            />
        </div>
    );
}
