'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
    Calculator, Users, ArrowRight, CheckCircle,
    IndianRupee, Calendar, Zap, Building2, Phone, Sparkles,
    Minus, Plus
} from 'lucide-react';
import Header from '../components/Header';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';


export default function PricingCalculatorPage() {
    const [students, setStudents] = useState(100);
    const [inputValue, setInputValue] = useState('100');

    // Pricing calculation
    const PRICE_PER_100_STUDENTS = 10500;
    const ORIGINAL_PRICE_PER_100 = 15000; // Before 30% discount
    const units = Math.ceil(students / 100);
    const yearlyPrice = units * PRICE_PER_100_STUDENTS;
    const originalYearlyPrice = units * ORIGINAL_PRICE_PER_100;
    const savings = originalYearlyPrice - yearlyPrice;
    const perStudentYearly = 105;
    const perStudentMonthly = perStudentYearly / 12; // ₹8.75
    const monthlyEquivalent = Math.round(yearlyPrice / 12);

    // Handle input change - max 100,000 students (realistic limit)
    const MAX_STUDENTS = 100000;

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);

        // Parse and update students only if valid number
        const parsed = parseInt(value);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= MAX_STUDENTS) {
            setStudents(parsed);
        } else if (!isNaN(parsed) && parsed > MAX_STUDENTS) {
            setStudents(MAX_STUDENTS);
        } else if (value === '') {
            setStudents(1);
        }
    };

    // Handle input blur to validate
    const handleInputBlur = () => {
        const parsed = parseInt(inputValue);
        if (isNaN(parsed) || parsed < 1) {
            setStudents(1);
            setInputValue('1');
        } else if (parsed > MAX_STUDENTS) {
            setStudents(MAX_STUDENTS);
            setInputValue(String(MAX_STUDENTS));
        } else {
            setStudents(parsed);
            setInputValue(String(parsed));
        }
    };

    // Handle slider change
    const handleSliderChange = (e) => {
        const value = parseInt(e.target.value);
        setStudents(value);
        setInputValue(String(value));
    };

    // Increment/Decrement buttons
    const incrementStudents = (amount) => {
        const newValue = Math.min(MAX_STUDENTS, Math.max(1, students + amount));
        setStudents(newValue);
        setInputValue(String(newValue));
    };

    // Get slider value - clamp to slider range for display only
    const getSliderValue = () => {
        return Math.min(5000, Math.max(50, students));
    };

    return (
        <div className="min-h-screen bg-white">
            <Header />
            <main className="pt-24 pb-20">
                {/* Hero Section */}
                <section className="relative overflow-hidden px-5 py-16">
                    {/* Background Pattern */}
                    <InteractiveGridPattern
                        className="absolute opacity-50 inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,white_40%,transparent_70%)]"
                        squares={[60, 60]}
                    />

                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-5">
                            <Calculator className="w-4 h-4" />
                            PRICING CALCULATOR
                        </span>
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] leading-tight mb-4">
                            Calculate Your School's{' '}
                            <span className="text-[#0569ff]">Exact Price</span>
                        </h1>
                        <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto">
                            Enter your student count and see your yearly cost instantly.
                            No hidden fees, no surprises.
                        </p>
                    </div>
                </section>

                {/* Calculator Section */}
                <section className="px-5 -mt-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="bg-white rounded-[2rem] p-4 md:p-10 border border-slate-200 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">

                            {/* Grid Layout for Calculator */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

                                {/* Left Side - Input Section */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-lg font-semibold text-[#1a1a2e] mb-2">
                                            How many students does your school have?
                                        </label>
                                        <p className="text-sm text-slate-500 mb-6">
                                            Enter any number up to 1,00,000 students
                                        </p>
                                    </div>

                                    {/* Number Input with +/- Buttons */}
                                    <div className="bg-[#f8fafc] rounded-2xl p-4 md:p-6 border border-slate-100">
                                        <div className="flex items-center justify-center gap-2 md:gap-4 mb-6">
                                            <button
                                                onClick={() => incrementStudents(-50)}
                                                className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-[#0569ff] transition-all active:scale-95 flex-shrink-0"
                                            >
                                                <Minus className="w-5 h-5" />
                                            </button>

                                            <div className="relative flex-1 max-w-[200px]">
                                                <Users className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={inputValue}
                                                    onChange={handleInputChange}
                                                    onBlur={handleInputBlur}
                                                    className="w-full pl-10 pr-2 md:pl-12 md:pr-4 py-3 md:py-4 text-xl md:text-2xl font-bold text-center border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0569ff] focus:border-[#0569ff] transition-all bg-white"
                                                    min="1"
                                                    max="10000"
                                                />
                                            </div>

                                            <button
                                                onClick={() => incrementStudents(50)}
                                                className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-[#0569ff] transition-all active:scale-95 flex-shrink-0"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <p className="text-center text-slate-500 font-medium mb-4">students</p>

                                        {/* Slider - visual helper, clamped to 50-5000 range */}
                                        <div className="px-2">
                                            <input
                                                type="range"
                                                value={getSliderValue()}
                                                onChange={handleSliderChange}
                                                min="50"
                                                max="5000"
                                                step="50"
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0569ff]"
                                            />
                                            <div className="flex justify-between text-xs text-slate-400 mt-2">
                                                <span>50</span>
                                                <span>1000</span>
                                                <span>2000</span>
                                                <span>3000</span>
                                                <span>5000</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Select Buttons */}
                                    <div>
                                        <p className="text-sm text-slate-500 mb-3">Quick select:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {[100, 250, 500, 1000, 2000, 5000].map((num) => (
                                                <button
                                                    key={num}
                                                    onClick={() => {
                                                        setStudents(num);
                                                        setInputValue(String(num));
                                                    }}
                                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${students === num
                                                        ? 'bg-[#0569ff] text-white'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {num.toLocaleString()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Fun Comparison */}
                                    <div className="bg-gradient-to-br lg:block hidden from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
                                        <p className="text-center text-slate-700 font-medium mb-3">
                                            💡 ₹8.75/month per child is...
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {[
                                                { emoji: '📓', text: 'Less than a notebook' },
                                                { emoji: '🍦', text: 'An ice cream' },
                                                { emoji: '☕', text: 'Half a chai' },
                                            ].map((item, i) => (
                                                <span key={i} className="inline-flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-full text-xs text-slate-600">
                                                    <span>{item.emoji}</span>
                                                    {item.text}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Trust Indicators */}
                                    <div className="bg-white lg:block hidden rounded-xl p-5 border border-slate-100">
                                        <h4 className="font-semibold text-[#1a1a2e] mb-4 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            Why Schools Love Us
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { icon: '🚀', text: 'Go Live in 24hrs' },
                                                { icon: '📱', text: 'Free Mobile Apps' },
                                                { icon: '🎓', text: 'Free Training' },
                                                { icon: '🔒', text: '100% Data Secure' },
                                                { icon: '💬', text: '24/7 Support' },
                                                { icon: '♾️', text: 'Unlimited Users' },
                                            ].map((item, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                                    <span>{item.icon}</span>
                                                    <span>{item.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Need Help Card */}
                                    <div className="bg-gradient-to-br from-[#0569ff]/10 to-indigo-100/50 rounded-xl p-5 border border-[#0569ff]/20">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 bg-[#0569ff] rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Phone className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-[#1a1a2e] mb-1">Need Help?</h4>
                                                <p className="text-sm text-slate-600 mb-2">Talk to our sales team for custom pricing</p>
                                                <a href="tel:+919471532682" className="text-[#0569ff] font-semibold text-sm hover:underline">
                                                    +91 9471 532 682
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side - Results Section */}
                                <div className="bg-gradient-to-br from-[#0569ff]/5 to-indigo-50/50 rounded-2xl p-6 md:p-8 border border-[#0569ff]/10">
                                    <h3 className="text-lg font-bold text-[#1a1a2e] mb-6 flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-[#0569ff]" />
                                        Your Pricing
                                    </h3>

                                    {/* Main Stats Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                        {/* Total Yearly - Full Width */}
                                        <div className="sm:col-span-2 bg-white rounded-xl p-5 border border-slate-100">
                                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                                                <Calendar className="w-4 h-4" />
                                                Total Yearly Cost
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <IndianRupee className="w-6 h-6 text-[#1a1a2e]" />
                                                <span className="text-3xl md:text-4xl font-black text-[#1a1a2e]">
                                                    {yearlyPrice.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">Billed annually</p>
                                        </div>

                                        {/* Monthly per Child */}
                                        <div className="bg-white rounded-xl p-5 border-2 border-green-200 relative">
                                            <div className="absolute -top-2 -right-2">
                                                <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                                                    BEST VALUE
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                                                <Users className="w-4 h-4" />
                                                Per Child / Month
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <IndianRupee className="w-4 h-4 text-green-600" />
                                                <span className="text-2xl font-black text-green-600">
                                                    {perStudentMonthly.toFixed(2)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-green-600 font-medium mt-1">Only ₹8.75/month!</p>
                                        </div>

                                        {/* Monthly Equivalent */}
                                        <div className="bg-white rounded-xl p-5 border border-slate-100">
                                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                                                <Calendar className="w-4 h-4" />
                                                Monthly (School)
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <IndianRupee className="w-4 h-4 text-[#1a1a2e]" />
                                                <span className="text-2xl font-bold text-[#1a1a2e]">
                                                    {monthlyEquivalent.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[#0569ff] font-medium mt-1">(Paid yearly)</p>
                                        </div>
                                    </div>

                                    {/* Savings Card */}
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 mb-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Sparkles className="w-5 h-5 text-green-600" />
                                                    <span className="font-bold text-green-700">30% yearly discount</span>
                                                </div>
                                                <p className="text-sm text-green-600">
                                                    Original: <span className="line-through">₹{originalYearlyPrice.toLocaleString('en-IN')}</span>
                                                </p>
                                            </div>
                                            <div className="text-left sm:text-right">
                                                <div className="text-2xl font-black text-green-600">
                                                    ₹{savings.toLocaleString('en-IN')}
                                                </div>
                                                <div className="text-xs text-green-600">saved per year!</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Breakdown */}
                                    <div className="bg-white rounded-xl p-4 border border-slate-100 mb-6">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">
                                                {units} unit{units > 1 ? 's' : ''} × ₹10,500
                                            </span>
                                            <span className="font-bold text-[#1a1a2e]">
                                                = ₹{yearlyPrice.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-slate-100">
                                            <span className="text-slate-600">Per student yearly</span>
                                            <span className="font-bold text-green-600">₹{perStudentYearly}/year</span>
                                        </div>
                                    </div>

                                    {/* Note */}
                                    <p className="text-xs text-slate-500 text-center mb-6">
                                        💡 1 unit = 100 students. Pricing is calculated per unit.
                                    </p>

                                    {/* CTA Buttons */}
                                    <div className="flex flex-col gap-3">
                                        <Link href="/contact">
                                            <button className="w-full py-4 bg-[#0569ff] text-white font-bold rounded-xl hover:bg-[#0358dd] transition-all duration-300 flex items-center justify-center gap-2 group">
                                                Get Started
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </Link>
                                        <Link href="/contact">
                                            <button className="w-full py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2">
                                                <Phone className="w-5 h-5" />
                                                Talk to Sales
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="px-5 py-20">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] text-center mb-10">
                            Everything Included
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {[
                                'Student Management',
                                'Fee Collection',
                                'Attendance Tracking',
                                'Exam & Results',
                                'Timetable Management',
                                'Parent Communication',
                                'Staff & Payroll',
                                'Transport Module',
                                'Library Management',
                                'Reports & Analytics',
                                'Mobile Apps',
                                'Priority Support'
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="text-slate-700 font-medium text-sm">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="px-5 py-16 bg-[#f5f7fa]">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] text-center mb-10">
                            Frequently Asked Questions
                        </h2>
                        <div className="space-y-4">
                            {[
                                {
                                    q: 'What is a unit?',
                                    a: 'A unit covers up to 100 students. If you have 250 students, you need 3 units.'
                                },
                                {
                                    q: 'Is there a minimum commitment?',
                                    a: 'Minimum is 1 unit (100 students). The plan is billed annually.'
                                },
                                {
                                    q: 'What if our student count changes?',
                                    a: 'You can add more units anytime. Contact us to adjust your plan.'
                                },
                                {
                                    q: 'Is setup included?',
                                    a: 'Yes! Free setup, data migration, and staff training are included.'
                                }
                            ].map((faq, i) => (
                                <div key={i} className="bg-white rounded-xl p-6 border border-slate-100">
                                    <h3 className="font-bold text-[#1a1a2e] mb-2">{faq.q}</h3>
                                    <p className="text-slate-600">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
