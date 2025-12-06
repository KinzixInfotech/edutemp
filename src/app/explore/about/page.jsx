'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Search, Shield, Zap, Globe, Users } from 'lucide-react';

const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const stagger = {
    visible: { transition: { staggerChildren: 0.1 } }
};

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-background overflow-hidden relative">
            {/* Ambient Background Elements */}
            <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20" />
            </div>

            <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">

                {/* Hero Section */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={stagger}
                    className="max-w-4xl mx-auto text-center mb-24"
                >
                    <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                        <Zap className="w-4 h-4" />
                        <span>The Future of School Discovery</span>
                    </motion.div>

                    <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Find the Right School, <br /> Without the Stress.
                    </motion.h1>

                    <motion.p variants={fadeIn} className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                        EduBreezy Explorer is a next-generation platform designed to bring transparency, clarity, and ease to the school admission process. We connect parents with verified institutions using real-time data.
                    </motion.p>

                    <motion.div variants={fadeIn} className="flex flex-wrap justify-center gap-4">
                        <Link href="/explore/schools">
                            <Button size="lg" className="rounded-full h-12 px-8 text-base">
                                Start Exploring <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="https://edubreezy.com/contact-us">
                            <Button variant="outline" size="lg" className="rounded-full h-12 px-8 text-base bg-background/50 backdrop-blur-sm">
                                Partner with Us
                            </Button>
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Statistics */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto mb-32 border-y border-border/50 py-12 bg-background/30 backdrop-blur-sm"
                >
                    {[
                        { label: 'Verified Schools', value: '500+' },
                        { label: 'Parent Reviews', value: '10k+' },
                        { label: 'Cities Covered', value: '50+' },
                        { label: 'Happy Families', value: '1M+' },
                    ].map((stat, i) => (
                        <div key={i} className="text-center">
                            <div className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent mb-2">{stat.value}</div>
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>

                {/* Features Grid - Bento Style */}
                <div className="max-w-6xl mx-auto mb-32">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Parents Trust Us</h2>
                        <p className="text-muted-foreground text-lg">Everything you need to make an informed decision.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Feature 1 - Large */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="md:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900 overflow-hidden relative group"
                        >
                            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Globe className="w-64 h-64" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg shadow-blue-500/30">
                                    <Search className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3">Smart Location Discovery</h3>
                                <p className="text-muted-foreground text-lg max-w-md">
                                    Our advanced geolocation technology automatically detects your city to show you the best schools in your neighborhood. No more manual filtering—just relevant results instantly.
                                </p>
                            </div>
                        </motion.div>

                        {/* Feature 2 */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="p-8 rounded-3xl bg-background border border-border hover:shadow-xl transition-shadow shadow-sm group"
                        >
                            <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg shadow-green-500/30">
                                <Shield className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">100% Verified Data</h3>
                            <p className="text-muted-foreground">
                                Every school profile is verified by our team. We ensure that fee structures, facilities, and contact details are accurate and up-to-date.
                            </p>
                        </motion.div>

                        {/* Feature 3 */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="p-8 rounded-3xl bg-background border border-border hover:shadow-xl transition-shadow shadow-sm group"
                        >
                            <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg shadow-purple-500/30">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Community First</h3>
                            <p className="text-muted-foreground">
                                Read genuine reviews from other parents. Share your own experiences to help the community grow and make better choices together.
                            </p>
                        </motion.div>

                        {/* Feature 4 - Large */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="md:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-100 dark:border-orange-900 md:col-start-2 overflow-hidden relative"
                        >
                            <div className="absolute bottom-0 left-0 p-8 opacity-10">
                                <Zap className="w-64 h-64" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg shadow-orange-500/30">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3">Transparent Fee Structures</h3>
                                <p className="text-muted-foreground text-lg max-w-lg">
                                    No more hidden costs. We provide detailed, class-wise fee breakdowns so you can plan your finances effectively before you even apply.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Mission Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto py-20"
                >
                    <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
                    <p className="text-2xl text-muted-foreground italic font-light leading-relaxed">
                        "To democratize access to quality education information, empowering every parent to make the best possible choice for their child's future."
                    </p>
                </motion.div>

            </div>
        </div>
    );
}
