'use client'
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
    CheckCircle, Star, Users, BookOpen, BarChart3,
    Clock, GraduationCap, CreditCard, ArrowRight,
    TrendingUp, PieChart, Calendar, FileText
} from 'lucide-react';
import Header from './components/Header';
import { DotPattern } from '@/components/ui/dot-pattern';
import { BorderBeam } from '@/components/ui/border-beam';
import { HyperText } from '@/components/ui/hyper-text';
import { Highlighter } from '@/components/ui/highlighter';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

export default function HomePage() {
    return (
        <div style={{ backgroundColor: '#ffffff', overflowX: 'hidden' }}>
            <HeroSection />
            <TrustedSection />
            <FeaturesSection />
            <BentoSection />
            <PricingSection />
            <TestimonialsSection />
            {/* <Footer /> */}
        </div>
    );
}


// Hero Section - Matching the design exactly
function HeroSection() {
    const heroRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.hero-text > *',
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.12, duration: 0.7, ease: 'power2.out' }
            );
            gsap.fromTo('.hero-dashboard',
                { y: 60, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.9, delay: 0.3, ease: 'power2.out' }
            );
        }, heroRef);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={heroRef} style={{
            minHeight: '100vh',
            height: 'fit-content',
            paddingTop: '100px',
            paddingBottom: '0',
            background: 'linear-gradient(120deg, #f8fafc 0%, #fff9f0 50%, #f0f7ff 100%)',
            position: 'relative',
            overflow: 'visible'
        }}>
            {/* Mesh Gradient Glow - Left */}
            <div style={{
                position: 'absolute',
                top: '10%',
                left: '-10%',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(5, 105, 255, 0.25) 0%, transparent 70%)',
                filter: 'blur(80px)',
                borderRadius: '50%',
                pointerEvents: 'none'
            }} />

            {/* Mesh Gradient Glow - Right */}
            <div style={{
                position: 'absolute',
                top: '20%',
                right: '-10%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(255, 150, 50, 0.2) 0%, transparent 70%)',
                filter: 'blur(100px)',
                borderRadius: '50%',
                pointerEvents: 'none'
            }} />

            {/* Mesh Gradient Glow - Bottom */}
            <div style={{
                position: 'absolute',
                bottom: '10%',
                left: '30%',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(100, 200, 255, 0.15) 0%, transparent 70%)',
                filter: 'blur(80px)',
                borderRadius: '50%',
                pointerEvents: 'none'
            }} />

            {/* Noise Overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                opacity: 0.03,
                pointerEvents: 'none'
            }} />

            {/* Dot Pattern Background */}
            <DotPattern
                width={24}
                height={24}
                cr={1}
                className="absolute inset-0 w-full h-full opacity-20"
            />
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '60px 20px 40px',
                textAlign: 'center'
            }}>
                <div className="hero-text">
                    {/* Badge */}
                    {/* <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        backgroundColor: '#e8f4ff',
                        padding: '6px 16px',
                        borderRadius: '50px',
                        marginBottom: '28px',
                        border: '1px solid #cce4ff'
                    }}>
                        <span style={{
                            backgroundColor: '#0569ff',
                            color: 'white',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                        }}>New</span>
                        <span style={{ color: '#555', fontSize: '13px' }}>
                            Introducing our new AI features
                        </span>
                    </div> */}

                    {/* Main Title */}
                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 5vw, 3.8rem)',
                        fontWeight: 700,
                        color: '#1a1a2e',
                        lineHeight: 1.15,
                        marginBottom: '20px',
                        maxWidth: '750px',
                        margin: '0 auto 20px'
                    }}>
                        <Highlighter action="underline" color="#FF9800">Simplify</Highlighter> School Management And       <Highlighter action="highlight" color="#87CEFA">Thrive </Highlighter>{' '}
                        <span style={{
                            fontFamily: '"Edu NSW ACT Cursive", cursive',
                            fontWeight: 600,
                            fontStyle: 'italic',
                            color: '#1a1a2e',
                            fontOpticalSizing: 'auto',
                            fontSize: '1em'
                        }}> Every Day</span>
                    </h1>



                    {/* Subtitle */}
                    <p style={{
                        fontSize: '1.05rem',
                        color: '#666',
                        maxWidth: '550px',
                        margin: '0 auto 28px',
                        lineHeight: 1.6
                    }}>
                        Transform the way schools operate and deliver education with our
                        intelligent, cloud-based management platform.
                    </p>

                    {/* CTA Row */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '24px',
                        flexWrap: 'wrap',
                        marginBottom: '50px'
                    }}>
                        <button style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '14px 28px',
                            backgroundColor: '#0569ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '100px',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(5, 105, 255, 0.3)'
                        }}>
                            Get Started <ArrowRight size={18} />
                        </button>

                        {/* Avatars + Rating */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex' }}>
                                {[1, 2, 3, 4].map(i => (
                                    <img
                                        key={i}
                                        src={`https://i.pravatar.cc/40?img=${i + 10}`}
                                        alt=""
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            border: '2px solid white',
                                            marginLeft: i > 1 ? '-10px' : 0
                                        }}
                                    />
                                ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ display: 'flex' }}>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <Star key={i} size={14} fill="#fbbf24" color="#fbbf24" />
                                    ))}
                                </div>
                                <span style={{ fontSize: '13px', color: '#666' }}>
                                    Trusted by 600+ schools
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Image */}
                {/* Dashboard Preview Frame */}
                <div className="hero-dashboard" style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
                    width: '100%',
                    maxWidth: '1100px',
                    margin: '0 auto',
                    border: '1px solid #e0e0e0',
                    overflow: 'hidden'
                }}>
                    <BorderBeam duration={8} size={100} colorFrom='#0569ff' colorTo='#000' />

                    {/* Browser Top Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        backgroundColor: '#f8f9fa',
                        borderBottom: '1px solid #e5e7eb',
                        gap: '8px'
                    }}>
                        {/* Window Controls */}
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ff5f57' }} />
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#28c840' }} />
                        </div>
                        {/* URL Bar */}
                        <div style={{
                            flex: 1,
                            marginLeft: '8px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            color: '#666',
                            border: '1px solid #e5e7eb',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            www.edubreezy.com/dashboard
                        </div>
                    </div>

                    {/* Dashboard Content Area */}
                    <div style={{ backgroundColor: '#f5f7fa', overflow: 'hidden' }}>
                        <img src="/dash.png" alt="EduBreezy Dashboard" style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            objectFit: 'cover'
                        }} />
                    </div>
                </div>
            </div>
        </section>
    );
}

// Trusted By Section
function TrustedSection() {
    return (
        <section style={{ padding: '50px 20px', backgroundColor: '#fff' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '28px' }}>
                    Used by the best schools and institutions around the country:
                </p>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '50px',
                    flexWrap: 'wrap',
                    opacity: 0.7
                }}>
                    {['Delhi Public', 'Ryan International', 'DAV School', 'Kendriya Vidyalaya', 'Modern School', 'St. Xavier'].map((name, i) => (
                        <span key={i} style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: '#444'
                        }}>
                            {name}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Features Section - Left text, right description, 3 cards below
function FeaturesSection() {
    const ref = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.feature-card',
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1, stagger: 0.1, duration: 0.5,
                    scrollTrigger: { trigger: ref.current, start: 'top 80%' }
                }
            );
        }, ref);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={ref} style={{ padding: '80px 20px', backgroundColor: '#fff' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                {/* Top row - title left, desc right */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '60px',
                    marginBottom: '50px',
                    alignItems: 'center'
                }}>
                    <h2 style={{
                        fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
                        fontWeight: 700,
                        color: '#1a1a2e',
                        lineHeight: 1.3
                    }}>
                        Manage your school with smart data and insights.
                    </h2>
                    <p style={{
                        fontSize: '1rem',
                        color: '#666',
                        lineHeight: 1.7
                    }}>
                        Our platform simplifies your school management process.
                        Discover how we can help you stay organized, save time,
                        and grow your institution.
                    </p>
                </div>

                {/* Feature cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '24px'
                }}>
                    {[
                        { icon: <Users size={24} />, title: 'Student Management', desc: 'Centrally manage student information including registrations, profiles, and more.' },
                        { icon: <BarChart3 size={24} />, title: 'Reports & Analytics', desc: 'Generate detailed reports on attendance, grades, fees, and performance.' },
                        { icon: <Clock size={24} />, title: 'Real-time Tracking', desc: 'Monitor attendance, transport, and activities in real-time with instant alerts.' }
                    ].map((f, i) => (
                        <div key={i} className="feature-card" style={{
                            padding: '28px',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#fafafa'
                        }}>
                            <div style={{
                                color: '#0569ff',
                                marginBottom: '16px'
                            }}>
                                {f.icon}
                            </div>
                            <h3 style={{
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                color: '#1a1a2e',
                                marginBottom: '10px'
                            }}>
                                {f.title}
                            </h3>
                            <p style={{
                                fontSize: '0.9rem',
                                color: '#666',
                                lineHeight: 1.6,
                                margin: 0
                            }}>
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Bento Section - Different sized cards
function BentoSection() {
    const ref = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.bento-card',
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1, stagger: 0.1, duration: 0.6,
                    scrollTrigger: { trigger: ref.current, start: 'top 80%' }
                }
            );
        }, ref);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={ref} style={{ padding: '80px 20px', backgroundColor: '#f8fafc' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                {/* Section header */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#0569ff',
                        fontSize: '14px',
                        fontWeight: 500
                    }}>
                        <span style={{ fontSize: '18px' }}>✦</span> Core Features
                    </span>
                </div>
                <h2 style={{
                    fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                    fontWeight: 700,
                    color: '#1a1a2e',
                    textAlign: 'center',
                    marginBottom: '16px'
                }}>
                    Simplifying School Management.
                </h2>
                <p style={{
                    textAlign: 'center',
                    color: '#666',
                    maxWidth: '500px',
                    margin: '0 auto 50px',
                    fontSize: '1rem'
                }}>
                    Our platform offers a range of features to help educators
                    and administrators streamline their tasks.
                </p>

                {/* Bento Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(12, 1fr)',
                    gridTemplateRows: 'auto auto',
                    gap: '20px'
                }}>
                    {/* Card 1 - Large left */}
                    <div className="bento-card" style={{
                        gridColumn: 'span 7',
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '28px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a1a2e', marginBottom: '8px' }}>
                            Live tracking and reporting
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
                            Access vital metrics in real-time through our analytics and reporting tools.
                        </p>
                        <a href="#" style={{ color: '#0569ff', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>
                            Learn More →
                        </a>
                        <div style={{
                            marginTop: '24px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '12px',
                            padding: '20px',
                            display: 'flex',
                            gap: '20px'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Total Students</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a1a2e' }}>₹1,41,467.00</div>
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'flex-end'
                            }}>
                                {[40, 65, 45, 80, 55, 70].map((h, i) => (
                                    <div key={i} style={{
                                        width: '24px',
                                        height: `${h}px`,
                                        backgroundColor: i === 3 ? '#0569ff' : '#e5e7eb',
                                        borderRadius: '4px'
                                    }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Card 2 - Right top */}
                    <div className="bento-card" style={{
                        gridColumn: 'span 5',
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '28px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a1a2e', marginBottom: '8px' }}>
                            Reduce costs
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '16px' }}>
                            Ensure accurate configurations and costs. Streamline your school process effortlessly.
                        </p>
                        <a href="#" style={{ color: '#0569ff', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>
                            Learn More →
                        </a>
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#888' }}>Weekly</span>
                            </div>
                            <div style={{
                                height: '80px',
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: '3px'
                            }}>
                                {[30, 45, 60, 40, 75, 50, 65].map((h, i) => (
                                    <div key={i} style={{
                                        flex: 1,
                                        height: `${h}%`,
                                        backgroundColor: '#0569ff20',
                                        borderRadius: '4px 4px 0 0'
                                    }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Card 3 - Bottom left */}
                    <div className="bento-card" style={{
                        gridColumn: 'span 5',
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '28px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a1a2e', marginBottom: '8px' }}>
                            Drive revenue growth
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '16px' }}>
                            Optimize your fee management and boost your results with targeted offers.
                        </p>
                        <a href="#" style={{ color: '#0569ff', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>
                            Learn More →
                        </a>
                        <div style={{
                            marginTop: '20px',
                            padding: '16px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '10px'
                        }}>
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Revenue</div>
                            <svg viewBox="0 0 200 60" style={{ width: '100%' }}>
                                <path d="M0,50 Q40,45 60,35 T120,25 T180,20 L200,15"
                                    fill="none" stroke="#0569ff" strokeWidth="2" />
                            </svg>
                        </div>
                    </div>

                    {/* Card 4 - Bottom right */}
                    <div className="bento-card" style={{
                        gridColumn: 'span 7',
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '28px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a1a2e', marginBottom: '8px' }}>
                            Combined Analytics
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '16px' }}>
                            View all your school data in one unified dashboard with smart insights.
                        </p>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: '16px',
                            marginTop: '16px'
                        }}>
                            {[
                                { label: 'Attendance', value: '94%', color: '#10b981' },
                                { label: 'Fee Collection', value: '87%', color: '#0569ff' },
                                { label: 'Satisfaction', value: '4.8/5', color: '#f59e0b' }
                            ].map((stat, i) => (
                                <div key={i} style={{
                                    padding: '16px',
                                    backgroundColor: `${stat.color}10`,
                                    borderRadius: '10px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>
                                        {stat.value}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Pricing Section
function PricingSection() {
    const ref = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.pricing-card',
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1, stagger: 0.12, duration: 0.5,
                    scrollTrigger: { trigger: ref.current, start: 'top 80%' }
                }
            );
        }, ref);
        return () => ctx.revert();
    }, []);

    const plans = [
        {
            name: 'Basic Plan',
            price: 'Free',
            period: '',
            features: ['Access to all core functionalities', 'Regular feature updates', 'Limited usage quotas', 'Email support'],
            highlighted: false
        },
        {
            name: 'Business',
            price: '₹2999',
            period: '/per month',
            features: ['Access to all core functionalities', 'Regular feature updates', 'Unlimited usage', 'Priority support', '10 payment links per month'],
            highlighted: true
        },
        {
            name: 'Enterprise',
            price: '₹5999',
            period: '/per month',
            features: ['Everything in Business', 'Custom integrations', 'Dedicated account manager', 'On-premise option', 'Custom SLA'],
            highlighted: false
        }
    ];

    return (
        <section ref={ref} style={{ padding: '80px 20px', backgroundColor: '#fff' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                    <span style={{
                        display: 'inline-block',
                        backgroundColor: '#e8f4ff',
                        color: '#0569ff',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 500,
                        marginBottom: '16px'
                    }}>
                        Pricing Plans
                    </span>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 4vw, 2.5rem)',
                        fontWeight: 700,
                        color: '#1a1a2e',
                        marginBottom: '12px'
                    }}>
                        Transparent Pricing For Your Needs
                    </h2>
                    <p style={{ color: '#666', fontSize: '1rem' }}>
                        Choose a plan that works best for your school
                    </p>

                    {/* Toggle */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '24px'
                    }}>
                        <button style={{
                            padding: '8px 20px',
                            backgroundColor: '#0569ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}>Monthly</button>
                        <button style={{
                            padding: '8px 20px',
                            backgroundColor: '#f0f0f0',
                            color: '#666',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}>Yearly</button>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '24px'
                }}>
                    {plans.map((plan, i) => (
                        <div key={i} className="pricing-card" style={{
                            padding: '32px',
                            borderRadius: '16px',
                            border: plan.highlighted ? '2px solid #0569ff' : '1px solid #e5e7eb',
                            backgroundColor: plan.highlighted ? '#0569ff08' : 'white'
                        }}>
                            <div style={{
                                fontSize: '14px',
                                color: plan.highlighted ? '#0569ff' : '#888',
                                fontWeight: 500,
                                marginBottom: '8px'
                            }}>
                                {plan.name}
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <span style={{
                                    fontSize: '2.5rem',
                                    fontWeight: 700,
                                    color: '#1a1a2e'
                                }}>
                                    {plan.price}
                                </span>
                                <span style={{ color: '#888', fontSize: '14px' }}>{plan.period}</span>
                            </div>

                            <button style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: plan.highlighted ? '#0569ff' : 'white',
                                color: plan.highlighted ? 'white' : '#1a1a2e',
                                border: plan.highlighted ? 'none' : '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                marginBottom: '24px'
                            }}>
                                Select Plan
                            </button>

                            <div style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>Features:</div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {plan.features.map((f, j) => (
                                    <li key={j} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '8px 0',
                                        fontSize: '14px',
                                        color: '#444'
                                    }}>
                                        <CheckCircle size={16} color="#0569ff" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Testimonials Section
function TestimonialsSection() {
    const ref = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.testimonial-card',
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1, stagger: 0.1, duration: 0.5,
                    scrollTrigger: { trigger: ref.current, start: 'top 80%' }
                }
            );
        }, ref);
        return () => ctx.revert();
    }, []);

    const testimonials = [
        {
            text: "Keep track of what they've achieved, when, and through which channel. Quotes, orders, invoices listed here.",
            author: "Cameron Williamson",
            role: "Product Developer",
            avatar: "https://i.pravatar.cc/48?img=1"
        },
        {
            text: "Since adopting this platform, our admission time dropped by 60%. The unified real-time tracking has significantly improved trust.",
            author: "Danny Russell",
            role: "School Principal",
            avatar: "https://i.pravatar.cc/48?img=2"
        },
        {
            text: "Telehealth and automated workflows saved us hours every day. Highly recommended for school management.",
            author: "Brooklyn Simmons",
            role: "School Owner",
            avatar: "https://i.pravatar.cc/48?img=3"
        }
    ];

    return (
        <section ref={ref} style={{ padding: '80px 20px', backgroundColor: '#f8fafc' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                    <span style={{
                        display: 'inline-block',
                        backgroundColor: '#e8f4ff',
                        color: '#0569ff',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 500,
                        marginBottom: '16px'
                    }}>
                        Testimonials
                    </span>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 4vw, 2.5rem)',
                        fontWeight: 700,
                        color: '#1a1a2e'
                    }}>
                        What Our Happy Clients Say!
                    </h2>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '24px'
                }}>
                    {testimonials.map((t, i) => (
                        <div key={i} className="testimonial-card" style={{
                            padding: '28px',
                            borderRadius: '16px',
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb'
                        }}>
                            <div style={{ display: 'flex', gap: '3px', marginBottom: '16px' }}>
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={14} fill="#fbbf24" color="#fbbf24" />
                                ))}
                            </div>
                            <p style={{
                                fontSize: '0.95rem',
                                color: '#444',
                                lineHeight: 1.7,
                                marginBottom: '24px'
                            }}>
                                "{t.text}"
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img
                                    src={t.avatar}
                                    alt={t.author}
                                    style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%'
                                    }}
                                />
                                <div>
                                    <div style={{ fontWeight: 600, color: '#1a1a2e', fontSize: '0.95rem' }}>
                                        {t.author}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#888' }}>{t.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Footer
function Footer() {
    return (
        <footer style={{
            backgroundColor: '#0a2540',
            color: 'white',
            padding: '60px 20px 30px'
        }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                    gap: '40px',
                    marginBottom: '40px'
                }}>
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '16px',
                            fontSize: '1.25rem',
                            fontWeight: 700
                        }}>
                            <GraduationCap size={28} />
                            EduBreezy
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.6 }}>
                            Making school management simple and efficient for educators worldwide.
                        </p>
                    </div>

                    {[
                        { title: 'Quick Links', links: ['About Us', 'Careers', 'Contact'] },
                        { title: 'Resources', links: ['Help Center', 'Documentation', 'Blog'] },
                        { title: 'Legal', links: ['Privacy Policy', 'Terms of Service'] },
                        { title: 'Contact Us', links: ['support@edubreezy.com', '+91 98765 43210'] }
                    ].map((col, i) => (
                        <div key={i}>
                            <div style={{ fontWeight: 600, marginBottom: '16px', fontSize: '14px' }}>
                                {col.title}
                            </div>
                            {col.links.map((link, j) => (
                                <a key={j} href="#" style={{
                                    display: 'block',
                                    color: 'rgba(255,255,255,0.7)',
                                    textDecoration: 'none',
                                    fontSize: '14px',
                                    marginBottom: '10px'
                                }}>
                                    {link}
                                </a>
                            ))}
                        </div>
                    ))}
                </div>

                <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '24px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '14px'
                }}>
                    © 2024 EduBreezy. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
