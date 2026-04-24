'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, ArrowRight, MessageCircle, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import CalEmbed from '@/components/cal';

const initialFormData = {
  name: '', email: '', phone: '', schoolName: '',
  role: '', studentCount: '', message: '', demoPreferred: '',
};

const STATS = [
  { value: '10K+', label: 'Admin hours saved every month', org: 'EduBreezy Platform' },
  { value: '98%', label: 'reduction in manual admin work reported' },
  { value: '3x', label: 'faster fee collection with digital workflows', org: 'RC Mission Schools' },
]

export default function ContactPage() {
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submissionResult, setSubmissionResult] = useState(null);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Something went wrong. Please try again.');
      setSubmissionResult(payload);
      setIsSubmitted(true);
      setFormData(initialFormData);
    } catch (error) {
      setSubmitError(error.message || 'Unable to submit your request right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen font-sans">

      {/* ══ HERO ══ */}
      <section className="pt-[var(--header-height,96px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: 'calc(100vh - 96px)' }}>

          {/* LEFT */}
          <div className="flex flex-col justify-center bg-white px-8 md:px-12 lg:px-20 py-16">
            <h1
              className="font-black leading-[0.95] tracking-[-0.03em] text-[#1a1a1a] mb-8"
              style={{ fontSize: 'clamp(3.5rem,7vw,6.5rem)' }}
            >
              Better schools<br />start here.
            </h1>

            <p
              className="font-semibold text-[#1a1a1a] mb-5 leading-tight"
              style={{ fontSize: 'clamp(1.25rem,2.5vw,1.75rem)' }}
            >
              Manage more. Stress less. See how.
            </p>

            <p
              className="text-[#555] leading-relaxed max-w-md mb-12"
              style={{ fontSize: 'clamp(0.95rem,1.5vw,1.125rem)' }}
            >
              Get a personalized walkthrough of EduBreezy. Learn how attendance automation,
              smart fee collection, and real-time reports help schools like yours run smoother
              from day one.
            </p>

            <div className="flex flex-col gap-4">
              <a
                href="tel:+919470556016"
                className="flex items-center gap-3 text-[15px] text-[#444] hover:text-[#1a1a1a] transition-colors"
              >
                <span className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0">
                  <Phone size={16} />
                </span>
                +91 94705 56016 &nbsp;&middot;&nbsp; Mon&ndash;Sat, 9AM&ndash;6PM IST
              </a>
              <a
                href="mailto:hello@edubreezy.com"
                className="flex items-center gap-3 text-[15px] text-[#444] hover:text-[#1a1a1a] transition-colors"
              >
                <span className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0">
                  <Mail size={16} />
                </span>
                hello@edubreezy.com &nbsp;&middot;&nbsp; Reply within 24 hrs
              </a>
            </div>
          </div>

          {/* RIGHT — form section */}
          <div
            className="relative flex items-center justify-center px-8 md:px-12 lg:px-16 py-16 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #ffffff 40%, #f8f6ff 70%, #eef4ff 100%)' }}
          >
            {/* Decorative gradient orbs */}
            <div className="absolute -top-20 -right-20 w-[350px] h-[350px] rounded-full bg-[#0569ff]/10 blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-[280px] h-[280px] rounded-full bg-[#7c3aed]/8 blur-[80px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-[#0569ff]/5 blur-[60px] pointer-events-none" />

            {!isSubmitted ? (
              <div className="relative bg-white rounded-2xl p-12 z-10 w-full border border-[#000]">
                {/* Accent bar */}
                <div className="w-12 h-1 rounded-full mb-6" style={{ background: 'linear-gradient(90deg, #0569ff, #7c3aed)' }} />

                <h2 className="text-2xl font-black text-[#1a1a1a] leading-snug mb-2 tracking-tight">
                  Book a demo and see how<br />schools across India are growing.
                </h2>
                <p className="text-sm text-[#888] mb-8">
                  Fill out the form and we&apos;ll reach out in 24 hrs or less.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[
                      { label: 'Your Name', name: 'name', type: 'text', placeholder: 'Full Name' },
                      { label: 'School Email', name: 'email', type: 'email', placeholder: 'principal@school.com' },
                      { label: 'Phone Number', name: 'phone', type: 'tel', placeholder: '+91 94705 56016' },
                      { label: 'School Name', name: 'schoolName', type: 'text', placeholder: 'ABC Public School' },
                    ].map((f) => (
                      <div key={f.name}>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#888] mb-2">
                          {f.label}
                        </label>
                        <input
                          type={f.type} name={f.name} value={formData[f.name]}
                          onChange={handleChange} required placeholder={f.placeholder}
                          className="w-full bg-white/80 backdrop-blur-sm text-[#1a1a1a] placeholder:text-[#000] px-4 py-3.5 text-sm outline-none border border-[#e0e0e0] rounded-xl transition-all focus:border-[#0569ff] focus:shadow-[0_0_0_3px_rgba(5,105,255,0.1)] focus:bg-white"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#888] mb-2">
                      Number of Students
                    </label>
                    <div className="relative">
                      <select
                        name="studentCount" value={formData.studentCount} onChange={handleChange}
                        className="w-full appearance-none bg-white/80 backdrop-blur-sm text-[#1a1a1a] px-4 py-3.5 text-sm outline-none border border-[#e0e0e0] rounded-xl transition-all focus:border-[#0569ff] focus:shadow-[0_0_0_3px_rgba(5,105,255,0.1)] focus:bg-white"
                      >
                        <option value="">Select range</option>
                        <option value="0-100">0 &ndash; 100</option>
                        <option value="100-500">100 &ndash; 500</option>
                        <option value="500-1000">500 &ndash; 1,000</option>
                        <option value="1000-5000">1,000 &ndash; 5,000</option>
                        <option value="5000+">5,000+</option>
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#999]" />
                    </div>
                  </div>

                  <input type="hidden" name="role" value={formData.role} />
                  <input type="hidden" name="demoPreferred" value={formData.demoPreferred} />
                  <input type="hidden" name="message" value={formData.message} />

                  {submitError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <button
                    type="submit" disabled={isSubmitting}
                    className="w-full active:scale-[0.97] text-white font-bold py-4 text-sm tracking-wide rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2 bg-black "

                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting&hellip;
                      </span>
                    ) : 'Book A Demo →'}
                  </button>

                  {/* Trust signals */}
                  <div className="flex items-center justify-center gap-6 pt-4">
                    {['Free Demo', 'No Commitment', '24hr Response'].map((item) => (
                      <div key={item} className="flex items-center gap-1.5">
                        <CheckCircle size={13} className="text-[#0569ff]" />
                        <span className="text-[11px] text-[#888] font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </form>
              </div>
            ) : (
              <div className="relative z-10 w-full max-w-[520px] text-center py-12">
                <div className="w-16 h-16 bg-[#0569ff]/10 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle size={32} className="text-[#0569ff]" />
                </div>
                <h2 className="text-2xl font-black text-[#1a1a1a] mb-3">Thank You!</h2>
                <p className="text-sm text-[#666] mb-2">
                  {submissionResult?.message || 'Demo request submitted. Our team will reach out shortly.'}
                </p>
                <p className="text-xs text-[#999] mb-8">
                  {submissionResult?.emailSent
                    ? 'A confirmation email has been sent to your inbox.'
                    : 'Request saved — confirmation email may take a moment.'}
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-white px-7 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-[#0569ff]/25"
                  style={{ background: 'linear-gradient(135deg, #0569ff, #7c3aed)' }}
                >
                  Back to Home <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </div>

        </div>{/* end grid */}

        {/* Stats bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#000000] border-t border-[#000] border-b bg-white">
          {STATS.map((s) => (
            <div key={s.value} className="px-8 lg:px-16 py-8 flex items-center gap-5">
              <span
                className="font-black text-[#1a1a1a] leading-none shrink-0"
                style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}
              >
                {s.value}
              </span>
              <div>
                <p className="text-sm text-[#555] leading-snug mb-1">{s.label}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#aaa]">{s.org}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}