'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  GraduationCap, Users, Target, Heart, Lightbulb, Shield,
  ArrowRight, CheckCircle, Award, Globe, Sparkles, BookOpen,
  Building2, Rocket, Star
} from 'lucide-react';
import Header from '../components/Header';
import { DotPattern } from '@/components/ui/dot-pattern';
import { NumberTicker } from '@/components/ui/number-ticker';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import { Highlighter } from '@/components/ui/highlighter';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

export default function AboutPage() {
  const stats = [
    { value: 500, suffix: '+', label: 'Schools Trust Us', icon: Building2 },
    { value: 50000, suffix: '+', label: 'Students Managed', icon: GraduationCap },
    { value: 10000, suffix: '+', label: 'Happy Parents', icon: Heart },
    { value: 99, suffix: '%', label: 'Uptime Guaranteed', icon: Shield },
  ];

  const values = [
    {
      icon: Target,
      title: 'Mission-Driven',
      description: 'Empowering educational institutions with technology that makes a difference.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Lightbulb,
      title: 'Innovation First',
      description: 'Constantly evolving our platform with the latest in EdTech innovation.',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: Heart,
      title: 'Student-Centric',
      description: 'Every feature is designed with student success as the ultimate goal.',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: Shield,
      title: 'Trust & Security',
      description: 'Enterprise-grade security to protect sensitive educational data.',
      color: 'from-green-500 to-emerald-500'
    }
  ];

  const team = [
    { name: 'Our Vision', role: 'To become the most trusted school management platform in India' },
    { name: 'Our Mission', role: 'Simplifying school operations so educators can focus on what matters most: teaching' }
  ];

  return (
    <div className="bg-white overflow-x-hidden">

      {/* Shimmer animation keyframe */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Hero Section - Matching Homepage Style */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-white pt-24">
        {/* Interactive Grid Pattern Background */}
        <InteractiveGridPattern
          className="absolute opacity-80 inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,white_40%,transparent_70%)]"
          squares={[60, 60]}
        />

        {/* Large Background Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span className="text-[clamp(8rem,25vw,20rem)] font-black text-gray-100/30 leading-none tracking-tighter">
            ABOUT
          </span>
        </div>

        {/* Gradient Orb */}
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-[#0469ff]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-[#F97316]/5 rounded-full blur-3xl" />

        <div className="relative max-w-[1400px] mx-auto px-6 py-20 z-10 w-full">
          <motion.div
            className="text-center space-y-8"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Badge */}
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#0469ff]/20 bg-[#0469ff]/5">
              <div className="w-2 h-2 rounded-full bg-[#0469ff] animate-pulse" />
              <span className="text-sm font-semibold text-[#0469ff]">About EduBreezy</span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1 variants={fadeInUp} className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[1.05] tracking-tight">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Transforming Education,
              </span>
              <br />
              <span className="relative inline-block mt-2">
                <span className="text-[#0469ff]">
                  One School at a Time
                </span>
                <svg className="absolute -bottom-4 left-0 w-full" height="12" viewBox="0 0 300 12" fill="none">
                  <path d="M2 8C70 3 150 1 298 8" stroke="#0469ff" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-gray-600 max-w-[800px] mx-auto leading-relaxed font-medium">
              We're on a mission to simplify school management and empower educators with modern technology that just works.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={fadeInUp} className="flex items-center justify-center gap-5 flex-wrap pt-6">
              <Link href="/contact">
                <button className="group relative px-10 py-4 rounded-full font-bold text-lg text-white bg-[#0469ff] hover:shadow-2xl transition-all duration-300 overflow-hidden">
                  <span className="absolute inset-0 bg-[#0358dd] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center gap-3">
                    Get Started
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 text-[#0469ff] transition-transform duration-300 group-hover:translate-x-0.5" />
                    </div>
                  </span>
                </button>
              </Link>
              <Link href="/features">
                <button className="group px-10 hover:shadow-lg py-4 rounded-full font-bold text-lg text-[#0469ff] bg-[#f8f9fb] border transition-all duration-300 flex items-center gap-3">
                  Explore Features
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-5">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="text-center p-6 rounded-2xl bg-gray-50/50 border border-gray-100 hover:shadow-lg hover:border-[#0569ff]/20 transition-all duration-300"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#0569ff]/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-[#0569ff]" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-1">
                  <NumberTicker value={stat.value} />{stat.suffix}
                </div>
                <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section> */}

      {/* Story Section - Image Left, Text Right */}
      <section className="py-20 md:py-28 bg-gray-50 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Image */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInLeft}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden max-w-lg mx-auto md:max-w-none">
                <img
                  src="./bulb_1.png"
                  alt="Modern EduBreezy Dashboard Interface"
                  className="w-full h-auto max-h-[500px] object-contain"
                />
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInRight}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#0569ff]/10 text-[#0569ff] text-sm font-semibold mb-4">
                Our Story
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-6 leading-tight">
                Born from a Simple Idea
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                Our goal was simple: make school ERP systems easy to use and modern. We noticed that most school management software out there was too outdated, with confusing interfaces that made daily tasks harder than they should be.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                So we built EduBreezy — a fresh, simple, and beautiful platform that anyone can understand and use. No complicated menus, no endless training sessions. Just a clean, modern system that helps schools save time and work smarter.
              </p>
              {/* <ul className="space-y-3">
                {['Easy to learn, even easier to use', 'Modern design that everyone loves', 'Built by listening to real schools'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-[#0569ff] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul> */}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission Section - Text Left, Image Right */}
      <section className="py-20 md:py-28 bg-white px-5">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Text */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInLeft}
              className="order-2 md:order-1"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#FF9800]/10 text-[#FF9800] text-sm font-semibold mb-4">
                Our Mission
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-6 leading-tight">
                Simplify. Empower. Transform.
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                We believe every school deserves access to world-class management tools, regardless of size or budget.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Our mission is to eliminate administrative burden so principals can lead, teachers can teach, and students can thrive.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <Rocket className="w-8 h-8 text-[#0569ff] mb-2" />
                  <div className="font-bold text-[#1a1a2e]">Fast Onboarding</div>
                  <div className="text-sm text-gray-500">Go live in 24 hours</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <Globe className="w-8 h-8 text-[#FF9800] mb-2" />
                  <div className="font-bold text-[#1a1a2e]">Cloud-Based</div>
                  <div className="text-sm text-gray-500">Access from anywhere</div>
                </div>
              </div>
            </motion.div>

            {/* Image */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInRight}
              className="relative order-1 md:order-2"
            >
              <div className="relative rounded-3xl overflow-hidden max-w-lg mx-auto md:max-w-none">
                <img
                  src="./gbh.png"
                  alt="Teacher with students"
                  className="w-full h-auto max-h-[500px] object-contain"
                />
              </div>
              {/* Floating Card */}
              {/* <div className="absolute -bottom-6 -left-6 md:-left-8 bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#FF9800]/10 flex items-center justify-center">
                    <Star className="w-6 h-6 text-[#FF9800]" />
                  </div>
                  <div>
                    <div className="font-bold text-[#1a1a2e]">4.9/5 Rating</div>
                    <div className="text-sm text-gray-500">From 500+ Schools</div>
                  </div>
                </div>
              </div> */}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      {/* Values Section */}
      <section className="py-20 md:py-28 bg-gray-50 px-5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#0469ff]/20 bg-[#0469ff]/5 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#0469ff] animate-pulse" />
              <span className="text-sm font-semibold text-[#0469ff]">Our Values</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-4">
              What We Stand For
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              These core values guide everything we do at EduBreezy.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {values.map((value, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-xl hover:border-[#0569ff]/20 transition-all duration-300 group"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${value.color}15` }}
                >
                  <value.icon className="w-7 h-7" style={{ color: value.color }} />
                </div>
                <h3 className="text-xl font-bold text-[#1a1a2e] mb-2 group-hover:text-[#0569ff] transition-colors">
                  {value.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="relative py-16 px-5 bg-[#1a1a2e] text-white overflow-hidden">
        <InteractiveGridPattern
          width={80}
          height={80}
          className="absolute inset-0 w-full h-full z-0 opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,white_0%,transparent_70%)]"
        />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your School?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Get started with EduBreezy today and experience the power of integrated school management.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/contact">
              <button className="min-w-[200px] px-8 py-4 bg-[#0569ff] text-white rounded-full font-bold text-lg hover:bg-[#0450d4] transition-all duration-300 shadow-xl">
                Book a Demo
              </button>
            </Link>
            <Link href="/features/docs">
              <button className="min-w-[200px] px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white text-white rounded-full font-bold text-lg hover:bg-white/20 transition-all duration-300">
                View Documentation
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}