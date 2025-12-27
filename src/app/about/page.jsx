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
      <Header />

      {/* Shimmer animation keyframe */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center pt-24 pb-16 overflow-hidden bg-[linear-gradient(120deg,#f8fafc_0%,#fff9f0_50%,#f0f7ff_100%)]">
        {/* Mesh Gradients */}
        <div className="absolute top-[10%] -left-[10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(5,105,255,0.2)_0%,transparent_70%)] blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[10%] -right-[10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(255,150,50,0.15)_0%,transparent_70%)] blur-[100px] rounded-full pointer-events-none" />
        <DotPattern width={24} height={24} cr={1} className="absolute inset-0 w-full h-full opacity-15" />

        {/* Floating Icons */}
        <div className="hidden md:block absolute top-[15%] left-[8%] opacity-10 animate-[float_6s_ease-in-out_infinite]">
          <GraduationCap size={80} className="text-black" />
        </div>
        <div className="hidden md:block absolute top-[20%] right-[10%] opacity-10 animate-[float_7s_ease-in-out_infinite_1s]">
          <BookOpen size={70} className="text-black" />
        </div>
        <div className="hidden md:block absolute bottom-[20%] left-[15%] opacity-10 animate-[float_8s_ease-in-out_infinite_2s]">
          <Award size={60} className="text-black" />
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0569ff]/10 text-[#0569ff] text-sm font-semibold border border-[#0569ff]/20 mb-6">
                <Sparkles className="w-4 h-4" />
                About EduBreezy
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1a1a2e] leading-[1.15] mb-6"
            >
              Transforming Education,{' '}
              <span className="relative inline-block">
                <Highlighter action="underline" color="#FF9800"><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0569ff] to-[#0450d4]">One School</span></Highlighter>

                {/* <span className="absolute bottom-1 left-0 w-full h-3 bg-[#FF9800]/30 -rotate-1 rounded -z-10"></span> */}
              </span>{' '}
              at a Time
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              We're on a mission to simplify school management and empower educators with modern technology that just works.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap gap-4 justify-center">
              <Link href="/contact">
                <button className="group flex items-center pr-1 gap-2 bg-[#0569ff] text-white border-0 rounded-full text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  <span className='px-1 pl-6 py-3'>Get Started</span>
                  <span className='bg-white p-2.5 rounded-full group-hover:bg-gray-50 transition-colors'>
                    <ArrowRight size={20} strokeWidth={3} color='#0569ff' className='transition-transform duration-300 group-hover:-rotate-45' />
                  </span>
                </button>
              </Link>
              <Link href="/features">
                <button className="px-6 py-3.5 bg-white border-2 border-[#0569ff] text-[#0569ff] rounded-full text-base font-semibold hover:bg-[#0569ff] hover:text-white transition-all duration-300 shadow-md">
                  Explore Features
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
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
      </section>

      {/* Story Section - Image Left, Text Right */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Image */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInLeft}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="./schl.jpeg"
                  alt="Modern EduBreezy Dashboard Interface"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
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
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
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
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&h=600&fit=crop"
                  alt="Teacher with students"
                  className="w-full h-[400px] object-cover"
                />
              </div>
              {/* Floating Card */}
              <div className="absolute -bottom-6 -left-6 md:-left-8 bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#FF9800]/10 flex items-center justify-center">
                    <Star className="w-6 h-6 text-[#FF9800]" />
                  </div>
                  <div>
                    <div className="font-bold text-[#1a1a2e]">4.9/5 Rating</div>
                    <div className="text-sm text-gray-500">From 500+ Schools</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#0569ff]/10 text-[#0569ff] text-sm font-semibold mb-4">
              Our Values
            </span>
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
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${value.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                  <value.icon className="w-7 h-7 text-white" />
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