'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { X, ArrowRight, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';

// Pages where the popup SHOULD appear
const ALLOWED_PATHS = ['/', '/features/docs', '/about', '/partners', '/contact'];

const STORAGE_KEY = 'edubreezy_demo_popup_dismissed';
const DELAY_MS = 6000; // 6 seconds

const initialFormData = {
  name: '', email: '', phone: '', schoolName: '',
  role: '', studentCount: '', message: '', demoPreferred: '',
};

export default function BookDemoPopup() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    // Check if already dismissed this session
    if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY)) {
      return;
    }

    // Only show on allowed paths
    const isAllowed = ALLOWED_PATHS.some(
      (path) => pathname === path || pathname?.startsWith(path + '/')
    );
    if (!isAllowed) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
      // Small delay for animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [pathname]);

  const handleDismiss = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, 'true');
      }
    }, 300);
  }, []);

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

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] transition-opacity duration-300"
        style={{
          backgroundColor: isAnimating ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
          backdropFilter: isAnimating ? 'blur(4px)' : 'blur(0px)',
        }}
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 border border-gray-800 z-[9999] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="relative w-full max-w-[850px] bg-white rounded-2xl shadow-2xl pointer-events-auto overflow-hidden transition-all duration-300"
          style={{
            opacity: isAnimating ? 1 : 0,
            transform: isAnimating ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(16px)',
          }}
        >
          {/* Top gradient bar */}
          {/* <div className="absolute top-0 left-0 right-0 h-1 z-20" style={{ background: 'linear-gradient(90deg, #0569ff, #7c3aed, #0569ff)' }} /> */}

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white md:bg-[#f5f5f5] shadow-sm md:shadow-none hover:bg-[#eee] flex items-center justify-center transition-colors z-20"
            aria-label="Close popup"
          >
            <X size={16} className="text-[#666]" />
          </button>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 max-h-[85vh] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>

            {/* Left Column (Text + Benefits) */}
            <div className="md:col-span-2 bg-[#f8fafc] p-8 md:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-100 relative overflow-hidden pt-12 md:pt-10">
              {/* Subtle background glow */}
              <div className="absolute -bottom-20 -left-20 w-[200px] h-[200px] rounded-full bg-[#0569ff]/10 blur-[60px] pointer-events-none" />

              <div className="relative z-10">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0569ff]/8 mb-5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0569ff] animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0569ff]">Limited Slots</span>
                </div>

                <h3 className="text-[24px] md:text-[28px] font-black text-[#1a1a1a] leading-snug mb-4 tracking-tight">
                  See EduBreezy in action
                </h3>

                <p className="text-[15px] text-[#555] leading-relaxed mb-8">
                  Get a personalized walkthrough of how schools across India are saving
                  hours every week with smart automation.
                </p>

                {/* Benefits */}
                <div className="flex flex-col gap-3.5">
                  {['30-min personalized session', 'No credit card required', 'See all features live'].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                        <CheckCircle size={12} className="text-[#0569ff]" />
                      </div>
                      <span className="text-[13px] text-[#444] font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column (Form) */}
            <div className="md:col-span-3 p-8 md:p-10 bg-white flex flex-col justify-center">
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Your Name', name: 'name', type: 'text', placeholder: 'Full Name' },
                      { label: 'School Email', name: 'email', type: 'email', placeholder: 'principal@school.com' },
                      { label: 'Phone Number', name: 'phone', type: 'tel', placeholder: '+91 94705 56016' },
                      { label: 'School Name', name: 'schoolName', type: 'text', placeholder: 'ABC Public School' },
                    ].map((f) => (
                      <div key={f.name}>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#888] mb-1.5">
                          {f.label}
                        </label>
                        <input
                          type={f.type} name={f.name} value={formData[f.name]}
                          onChange={handleChange} required placeholder={f.placeholder}
                          className="w-full bg-[#f9fafb] text-[#1a1a1a] placeholder:text-[#bbb] px-4 py-3 text-sm outline-none border border-[#e0e0e0] rounded-xl transition-all focus:border-[#0569ff] focus:shadow-[0_0_0_3px_rgba(5,105,255,0.1)] focus:bg-white"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#888] mb-1.5">
                      Number of Students
                    </label>
                    <div className="relative">
                      <select
                        name="studentCount" value={formData.studentCount} onChange={handleChange}
                        className="w-full appearance-none bg-[#f9fafb] text-[#1a1a1a] px-4 py-3 text-sm outline-none border border-[#e0e0e0] rounded-xl transition-all focus:border-[#0569ff] focus:shadow-[0_0_0_3px_rgba(5,105,255,0.1)] focus:bg-white"
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
                    className="w-full flex items-center justify-center gap-2 active:scale-[0.97] text-white font-bold py-4 text-sm tracking-wide rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-4 bg-black"


                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting&hellip;
                      </span>
                    ) : 'Book A Demo →'}
                  </button>
                  <p className="text-center text-[11px] text-[#bbb] mt-3">
                    No spam, no commitment — just a quick walkthrough.
                  </p>
                </form>
              ) : (
                <div className="text-center py-12 md:py-20 flex flex-col items-center justify-center h-full">
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
                  <button
                    onClick={handleDismiss}
                    className="inline-flex items-center justify-center gap-2 text-white px-7 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-[#0569ff]/25"
                    style={{ background: 'linear-gradient(135deg, #0569ff, #7c3aed)' }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
