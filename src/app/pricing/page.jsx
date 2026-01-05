'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
    Calculator, Users, ArrowRight, CheckCircle,
    IndianRupee, Calendar, Zap, Building2, Phone, Sparkles
} from 'lucide-react';
import Header from '../components/Header';


export default function PricingCalculatorPage() {
    const [students, setStudents] = useState(100);

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

    return (
        <div className="min-h-screen bg-white">
            <Header />
            <main className="pt-24 pb-20">
                {/* Hero Section */}
                <section className="px-5 py-16 ">
                    <div className="max-w-4xl mx-auto text-center">
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
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-slate-200 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">

                            {/* Input Section */}
                            <div className="mb-10">
                                <label className="block text-lg font-semibold text-[#1a1a2e] mb-4">
                                    How many students does your school have?
                                </label>

                                {/* Number Input */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="relative flex-1 max-w-xs">
                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="number"
                                            value={students}
                                            onChange={(e) => setStudents(Math.max(1, parseInt(e.target.value) || 0))}
                                            className="w-full pl-12 pr-4 py-4 text-xl font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0569ff] focus:border-transparent"
                                            min="1"
                                            max="10000"
                                        />
                                    </div>
                                    <span className="text-slate-500 font-medium">students</span>
                                </div>

                                {/* Slider */}
                                <input
                                    type="range"
                                    value={students}
                                    onChange={(e) => setStudents(parseInt(e.target.value))}
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
                                    <span>4000</span>
                                    <span>5000</span>
                                </div>
                            </div>

                            {/* Results Section */}
                            <div className="bg-gradient-to-br from-[#0569ff]/5 to-indigo-50/50 rounded-2xl p-6 md:p-8 border border-[#0569ff]/10">
                                <h3 className="text-lg font-bold text-[#1a1a2e] mb-6 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-[#0569ff]" />
                                    Your Pricing
                                </h3>

                                {/* Main Stats Grid */}
                                <div className="grid md:grid-cols-3 gap-4 mb-6">
                                    {/* Total Yearly */}
                                    <div className="bg-white rounded-xl p-5 border border-slate-100">
                                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                                            <Calendar className="w-4 h-4" />
                                            Total Yearly Cost
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <IndianRupee className="w-5 h-5 text-[#1a1a2e]" />
                                            <span className="text-2xl md:text-3xl font-black text-[#1a1a2e]">
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
                                            <span className="text-2xl md:text-3xl font-black text-green-600">
                                                {perStudentMonthly.toFixed(2)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-green-600 font-medium mt-1">Only ₹8.75/month!</p>
                                    </div>

                                    {/* Monthly Equivalent */}
                                    <div className="bg-white rounded-xl p-5 border border-slate-100">
                                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                                            <Calendar className="w-4 h-4" />
                                            Total Monthly (School)
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <IndianRupee className="w-4 h-4 text-[#1a1a2e]" />
                                            <span className="text-2xl md:text-3xl font-bold text-[#1a1a2e]">
                                                {monthlyEquivalent.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#0569ff] font-medium mt-1">(Paid yearly)</p>
                                    </div>
                                </div>

                                {/* Savings Card */}
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 mb-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Sparkles className="w-5 h-5 text-green-600" />
                                                <span className="font-bold text-green-700">30% yearly discount applied</span>
                                            </div>
                                            <p className="text-sm text-green-600">
                                                Original price: <span className="line-through">₹{originalYearlyPrice.toLocaleString('en-IN')}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-green-600">
                                                ₹{savings.toLocaleString('en-IN')}
                                            </div>
                                            <div className="text-xs text-green-600">saved per year!</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Fun Comparison */}
                                <div className="bg-white rounded-xl p-5 border border-slate-100 mb-6">
                                    <p className="text-center text-slate-600 font-medium mb-3">
                                        ₹8.75/month per child is...
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        {[
                                            { emoji: '📓', text: 'Less than a notebook' },
                                            { emoji: '🍦', text: 'Price of an ice cream' },
                                            { emoji: '☕', text: 'Half a cup of chai' },
                                        ].map((item, i) => (
                                            <span key={i} className="inline-flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full text-sm text-slate-600">
                                                <span className="text-lg">{item.emoji}</span>
                                                {item.text}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Breakdown */}
                                <div className="bg-white rounded-xl p-4 border border-slate-100 mb-4">
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
                                    <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-slate-100">
                                        <span className="text-slate-600">Per student monthly</span>
                                        <span className="font-bold text-green-600">₹{perStudentMonthly.toFixed(2)}/month</span>
                                    </div>
                                </div>

                                {/* Note */}
                                <p className="text-xs text-slate-500 text-center">
                                    💡 1 unit = 100 students. Pricing is calculated per unit.
                                </p>
                            </div>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 mt-8">
                                <Link href="/contact" className="flex-1">
                                    <button className="w-full py-4 bg-[#0569ff] text-white font-bold rounded-xl hover:bg-[#0358dd] transition-all duration-300 flex items-center justify-center gap-2 group">
                                        Get Started
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </Link>
                                <Link href="/contact" className="flex-1">
                                    <button className="w-full py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2">
                                        <Phone className="w-5 h-5" />
                                        Talk to Sales
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="px-5 py-20">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] text-center mb-10">
                            Everything Included
                        </h2>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                                    <span className="text-slate-700 font-medium">{feature}</span>
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
