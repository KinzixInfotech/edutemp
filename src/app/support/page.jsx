'use client'
import React, { useState } from 'react';
import {
    Mail, Phone, Send, ArrowRight,
    MessageCircle, CheckCircle,
    Sparkles, HelpCircle, AlertCircle, Bug,
    Lightbulb, FileQuestion, Clock, Headphones,
    LifeBuoy, Ticket
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
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';

export default function SupportPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        schoolName: '',
        category: '',
        priority: 'medium',
        subject: '',
        description: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [ticketId, setTicketId] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        setIsSubmitted(true);
        // Generate a mock ticket ID
        setTicketId(`TKT-${Date.now().toString().slice(-8)}`);
    };

    const categories = [
        { value: 'technical', label: 'Technical Issue', icon: Bug },
        { value: 'billing', label: 'Billing & Payments', icon: FileQuestion },
        { value: 'feature', label: 'Feature Request', icon: Lightbulb },
        { value: 'account', label: 'Account Issues', icon: HelpCircle },
        { value: 'other', label: 'Other', icon: MessageCircle },
    ];

    const faqs = [
        {
            q: "How long does it take to get a response?",
            a: "We typically respond to all support tickets within 24 hours. Priority tickets are addressed within 4 hours during business hours."
        },
        {
            q: "Can I track my support ticket?",
            a: "Yes! After submitting your ticket, you'll receive a ticket ID. You can use this ID to track the status of your request via email or by contacting our support team."
        },
        {
            q: "What information should I include in my ticket?",
            a: "Please include as much detail as possible: your school name, the specific issue you're facing, steps to reproduce the problem, and any error messages you've seen."
        },
        {
            q: "Is phone support available?",
            a: "Yes, phone support is available Monday to Saturday, 9 AM to 6 PM IST. For urgent issues, please call our support hotline directly."
        }
    ];

    return (
        <div className="bg-white min-h-screen">
            <Header />

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
                        SUPPORT
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
                            <span className="text-sm font-semibold text-[#0469ff]">Support Center</span>
                        </div>

                        {/* Main Heading */}
                        <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[1.05] tracking-tight">
                            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                                We're Here To
                            </span>
                            <br />
                            <span className="relative inline-block mt-2">
                                <span className="text-[#0469ff]">
                                    Help You
                                </span>
                                <svg className="absolute -bottom-3 left-0 w-full" height="10" viewBox="0 0 300 12" fill="none">
                                    <path d="M2 8C70 3 150 1 298 8" stroke="#0469ff" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg md:text-xl text-gray-600 max-w-[600px] mx-auto leading-relaxed font-medium">
                            Raise a support ticket and our dedicated team will assist you. We're committed to resolving your issues quickly.
                        </p>

                        {/* Trust indicators */}
                        <div className="flex flex-wrap justify-center gap-6 pt-4">
                            <div className="flex items-center gap-2 text-[#555]">
                                <div className="w-8 h-8 bg-[#10B981]/10 rounded-full flex items-center justify-center">
                                    <CheckCircle size={16} className="text-[#10B981]" />
                                </div>
                                <span className="text-sm font-medium">24hr Response</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#555]">
                                <div className="w-8 h-8 bg-[#10B981]/10 rounded-full flex items-center justify-center">
                                    <CheckCircle size={16} className="text-[#10B981]" />
                                </div>
                                <span className="text-sm font-medium">Expert Support</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#555]">
                                <div className="w-8 h-8 bg-[#10B981]/10 rounded-full flex items-center justify-center">
                                    <CheckCircle size={16} className="text-[#10B981]" />
                                </div>
                                <span className="text-sm font-medium">Track Progress</span>
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
                                    Need Immediate Help?
                                </h2>
                                <p className="text-[#666]">
                                    For urgent issues, reach out to us directly through these channels.
                                </p>
                            </div>

                            {/* Contact Cards */}
                            <div className="space-y-4">
                                {[
                                    {
                                        icon: Phone,
                                        title: "Phone Support",
                                        value: "+91 9471 532 682",
                                        subtext: "Mon-Sat, 9AM-6PM IST",
                                        color: "#0569ff"
                                    },
                                    {
                                        icon: Mail,
                                        title: "Email Support",
                                        value: "support@edubreezy.com",
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

                            {/* What to expect */}
                            <div className="bg-gradient-to-br from-[#0569ff]/5 to-[#0569ff]/10 p-6 rounded-2xl">
                                <h3 className="font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
                                    <Sparkles size={18} className="text-[#0569ff]" />
                                    What to Expect
                                </h3>
                                <ul className="space-y-3">
                                    {[
                                        "Confirmation email with ticket ID",
                                        "Response within 24 hours",
                                        "Regular status updates",
                                        "Resolution & follow-up"
                                    ].map((item, index) => (
                                        <li key={index} className="flex items-center gap-3 text-sm text-[#555]">
                                            <CheckCircle size={16} className="text-[#10B981] shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Priority Levels */}
                            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-gray-100">
                                <h3 className="font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
                                    <Clock size={18} className="text-[#F59E0B]" />
                                    Response Times
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#555] flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                            Critical
                                        </span>
                                        <span className="text-sm font-semibold text-[#1a1a2e]">Within 4 hours</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#555] flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                            High
                                        </span>
                                        <span className="text-sm font-semibold text-[#1a1a2e]">Within 8 hours</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#555] flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            Medium
                                        </span>
                                        <span className="text-sm font-semibold text-[#1a1a2e]">Within 24 hours</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#555] flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                            Low
                                        </span>
                                        <span className="text-sm font-semibold text-[#1a1a2e]">Within 48 hours</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Form */}
                        <div className="lg:col-span-3">
                            {!isSubmitted ? (
                                <div className="bg-[#f8fafc] p-8 md:p-10 rounded-3xl border border-gray-100">
                                    <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">
                                        Raise a Support Ticket
                                    </h2>
                                    <p className="text-[#666] mb-8">
                                        Fill out the form below and our team will get back to you shortly.
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
                                                    Phone Number
                                                </label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#0569ff] focus:ring-2 focus:ring-[#0569ff]/20 outline-none transition-all"
                                                    placeholder="+91 9471 532 682"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                                                    School Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="schoolName"
                                                    value={formData.schoolName}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#0569ff] focus:ring-2 focus:ring-[#0569ff]/20 outline-none transition-all"
                                                    placeholder="ABC Public School"
                                                />
                                            </div>
                                        </div>

                                        {/* Category Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                                                Issue Category *
                                            </label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                                {categories.map((cat) => {
                                                    const IconComponent = cat.icon;
                                                    return (
                                                        <label
                                                            key={cat.value}
                                                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-all ${formData.category === cat.value
                                                                ? 'border-[#0569ff] bg-[#0569ff]/10'
                                                                : 'border-gray-200 bg-white hover:border-[#0569ff]/50'
                                                                }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="category"
                                                                value={cat.value}
                                                                checked={formData.category === cat.value}
                                                                onChange={handleChange}
                                                                className="sr-only"
                                                                required
                                                            />
                                                            <IconComponent
                                                                size={20}
                                                                className={formData.category === cat.value ? 'text-[#0569ff]' : 'text-[#666]'}
                                                            />
                                                            <span className={`text-xs font-medium text-center ${formData.category === cat.value ? 'text-[#0569ff]' : 'text-[#666]'
                                                                }`}>
                                                                {cat.label}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Priority Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                                                Priority Level
                                            </label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {[
                                                    { value: 'low', label: 'Low', color: 'gray' },
                                                    { value: 'medium', label: 'Medium', color: 'blue' },
                                                    { value: 'high', label: 'High', color: 'amber' },
                                                    { value: 'critical', label: 'Critical', color: 'red' },
                                                ].map((priority) => (
                                                    <label
                                                        key={priority.value}
                                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.priority === priority.value
                                                            ? `border-${priority.color}-500 bg-${priority.color}-50`
                                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="priority"
                                                            value={priority.value}
                                                            checked={formData.priority === priority.value}
                                                            onChange={handleChange}
                                                            className="sr-only"
                                                        />
                                                        <span className={`w-2 h-2 rounded-full ${priority.color === 'gray' ? 'bg-gray-400' :
                                                            priority.color === 'blue' ? 'bg-blue-500' :
                                                                priority.color === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                                                            }`}></span>
                                                        <span className={`text-sm font-medium ${formData.priority === priority.value ? 'text-[#1a1a2e]' : 'text-[#666]'
                                                            }`}>{priority.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Subject */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                                                Subject *
                                            </label>
                                            <input
                                                type="text"
                                                name="subject"
                                                value={formData.subject}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#0569ff] focus:ring-2 focus:ring-[#0569ff]/20 outline-none transition-all"
                                                placeholder="Brief summary of your issue"
                                            />
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-sm font-medium text-[#1a1a2e] mb-2">
                                                Describe Your Issue *
                                            </label>
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                required
                                                rows={5}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#0569ff] focus:ring-2 focus:ring-[#0569ff]/20 outline-none transition-all resize-none"
                                                placeholder="Please provide as much detail as possible. Include steps to reproduce the issue, error messages, and any relevant information..."
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
                                                    Submit Ticket
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
                                        Ticket Created! 🎉
                                    </h2>
                                    <div className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-6">
                                        <Ticket size={16} />
                                        Ticket ID: {ticketId}
                                    </div>
                                    <p className="text-[#666] max-w-md mx-auto mb-8">
                                        Your support ticket has been submitted successfully.
                                        A confirmation email has been sent to your email address.
                                        Our team will respond within 24 hours.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        <Link
                                            href="/"
                                            className="inline-flex items-center justify-center gap-2 bg-[#0569ff] text-white px-8 py-4 rounded-full font-bold hover:bg-[#0569ff]/90 transition-all"
                                        >
                                            Back to Home
                                            <ArrowRight size={18} />
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setIsSubmitted(false);
                                                setFormData({
                                                    name: '',
                                                    email: '',
                                                    phone: '',
                                                    schoolName: '',
                                                    category: '',
                                                    priority: 'medium',
                                                    subject: '',
                                                    description: '',
                                                });
                                            }}
                                            className="inline-flex items-center justify-center gap-2 border-2 border-[#1a1a2e] text-[#1a1a2e] px-8 py-4 rounded-full font-bold hover:bg-[#1a1a2e] hover:text-white transition-all"
                                        >
                                            Submit Another Ticket
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-16 px-5 bg-white">
                <div className="max-w-[800px] mx-auto">
                    <div className="text-center mb-10">
                        <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-4">
                            <HelpCircle size={16} />
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
                quote="Your success is our priority. We're here to ensure EduBreezy works seamlessly for your school — every day, every step of the way."
                author="Support Team, EduBreezy"
                variant="gradient"
            />
        </div>
    );
}
