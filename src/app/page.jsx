'use client'
import React, { useEffect, useRef, useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Camera, Upload, Globe, Palette, CheckCircle, Database, Shield, RefreshCw, Users, BookOpen, Calendar, Bell, Star } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

// Content JSON
const content = {
    header: {
        logo: "EduBreezy",
        nav: ["Home", "About", "Solutions", "Apps", "Resources"],
        ctaButton: "Request Free Demo"
    },
    hero: {
        badge: "NOW SIMPLY SCHOOL MANAGEMENT SYSTEM",
        title: "Simplify Your Daily School Tasks with",
        highlightedText: "Smart School Management Software",
        description: "Imagine manually handling daily school tasks like attendance, timetables, fees, report cards, and certificates - it's tricky. But fear not! We provide all in one school ERP Software to save your time, money, and energy. An eco-friendly choice for schools, it's like a helpful friend, making school life a breeze",
        features: [
            "90+ Useful Modules meshed with Mobile Apps",
            "100% Secure and Reliable Cloud System",
            "SMS, WhatsApp, Email, Payment Gateway Integrations",
            "GPS, RFID, QR Scanner, Biometrics Supported",
            "Flexible Payment System and Low Cost of Ownership",
            "24/7 Dedicated Support Team",
            "Every Month New Update Guaranteed"
        ],
        ctaButton: "Call Us Now",
        imagePlaceholder: "https://classonapp.com/frontend-assets/images/school-parent-app.webp"
    },
    apps: {
        badge: "ONE STOP SOLUTIONS",
        title: "Improve Your School Management with",
        highlightedText: "Smart Apps",
        description: "Mobile apps provide a simple communication link between students, parents, teachers, staff, and the school, keeping everyone connected easily.",
        points: [
            "Boost your school's efficiency with our advanced apps, offering a complete solution that effortlessly integrates various aspects of school management software.",
            "Improve teamwork among teachers, students, and parents with our easy-to-use platform, keeping everyone informed and engaged."
        ],
        ctaButton: "Make Your School Digital",
        cards: [
            {
                icon: "school",
                title: "School App",
                description: "Your All-in-One Solution for Easy Management and Communication.",
                color: "#FF6B6B"
            },
            {
                icon: "parent",
                title: "Parent App",
                description: "Easily track your child's progress, fees, attendance, and other activities effortlessly.",
                color: "#FFA94D"
            },
            {
                icon: "teacher",
                title: "Teacher App",
                description: "The Teacher App helps teachers manage classrooms and connect with parents easily.",
                color: "#FF6B6B"
            },
            {
                icon: "driver",
                title: "Driver App",
                description: "Easily find your child routes & communicate with drivers in real time.",
                color: "#FFA94D"
            }
        ]
    },
    upgrade: {
        title: "Are you Ready to",
        highlightedText: "Upgrade your School",
        subtitle: "with Smart AI-powered",
        image: "https://classonapp.com/frontend-assets/images/best-school-software.webp",
        highlightedSubtitle: "School Management Software?",
        description: "EduBreezy is one of the most experienced school service providers in India, with 20 years of experience in the IT field and over 8 years of experience in the Ed-tech industry",
        features: [
            {
                icon: "modules",
                title: "Built with more than 100+ Modules",
                description: "Over 100+ modules are designed to simplify school operations and improve the experience for everyone involved, including students, teachers, and parents."
            },
            {
                icon: "portal",
                title: "User Friendly Portal & Apps",
                description: "Simplicity meets efficiency! Our easy-to-use design ensures smooth navigation for all users. Save time effortlessly with our user-friendly solution."
            },
            {
                icon: "updates",
                title: "Free Lifetime Updates",
                description: "We believe in continuous innovation, delivering updates every month to ensure your school is always at the forefront. Get everything you need, first-hand, for your school's success."
            }
        ],
        ctaButtons: ["Call Us Now", "Book a free demo"]
    },
    smarterSchool: {
        badge: "SAY GOODBYE TO STRESS WITH EDU BREEZY",
        title: "Here's How We Make Your School",
        highlightedText: "Smarter",
        features: [
            "Say goodbye to paperwork overload with digital assignments, submissions, and grading. Save time and trees!",
            "Effortlessly create and manage class schedules, events, attendance, homework, and activities.",
            "Enjoy auto reminders for school fees, track school buses, manage visitors and gate passes, and effortlessly generate certificates and ID cards.",
            "Keep your lesson plans, teaching materials, and school documents organized in one central hub. Find what you need instantly!"
        ],
        imagePlaceholder: "https://classonapp.com/frontend-assets/images/home_page_icon/best-school-erp-software.webp"
    },
    statistics: {
        title: "Your School is Unique",
        highlightedText: "We've got it Covered",
        stats: [
            { value: "15+", label: "Years of Experience" },
            { value: "600+", label: "Partner Schools" },
            { value: "400000+", label: "Registered Students" },
            { value: "16000+", label: "Teachers Enrolled" },
            { value: "30+", label: "School Services" }
        ]
    },
    whyClassOn: {
        title: "Why Is EduBreezy India's Fastest-growing",
        highlightedText: "School Management Software?",
        description: "Experience Triple Assurance from us: Best Value, Peace of Mind, and Continuous updates. We stand apart from other school management software providers with our mission to make every school 100% Smart & Digital. Our unique strategies and modules are designed to save your school money, paper, and time.",
        title2: "With EduBreezy App, you get:",
        features: [
            "Zero Hardware Costs",
            "100% Data Security & Privacy",
            "Guaranteed New Updates Every Month",
            "No Technical Skills Required",
            "Reliable Support System",
            "User-Friendly Interface",
            "Effortlessly Boost Admissions"
        ],
        imagePlaceholder: "https://classonapp.com/frontend-assets/images/smart-school-app.webp"
    },
    smartFeatures: {
        title: "Make your School",
        highlightedText: "100% Smart",
        subtitle: "with Our Smart Features",
        description: "Manage Every Aspect of Your School with EduBreezy",
        features: [
            "Admission Management",
            "Certificate Creator",
            "Attendance Manager",
            "Homework Manager",
            "Live Classes",
            "Smart Gatepass",
            "Institute Setup",
            "Academic Portal",
            "Admission Manager"
        ],
        ctaButton: "View all Features"
    },
    services: {
        title: "Explore Our Variety of",
        highlightedText: "School Related Services!",
        description: "We are One of Few Indian Companies that Provides Unique and Top Quality School Essential Products along with School management ERP Software.",
        services: [
            {
                title: "School ID Cards",
                description: "Use our easy ID card creator with ready-made templates and customization options.",
                icon: "id-card"
            },
            {
                title: "School Logo Designing",
                description: "Our team of experienced designers creates unique and impactful logos that capture your school's essence.",
                icon: "palette"
            },
            {
                title: "School Website",
                description: "Build beautiful and user-friendly websites that effectively engage parents, students, and communities.",
                icon: "globe"
            },
            {
                title: "School Branding",
                description: "Our experts analyze your school's unique needs and make a complete branding strategy.",
                icon: "star"
            }
        ]
    },
    schoolLogos: {
        title: "Proudly Supported & Trusted by many",
        highlightedText: "Schools around India",
        logos: [
            "/api/placeholder/120/120",
            "/api/placeholder/120/120",
            "/api/placeholder/120/120",
            "/api/placeholder/120/120",
            "/api/placeholder/120/120",
            "/api/placeholder/120/120"
        ]
    },
    testimonials: {
        title: "Read what",
        highlightedText: "our users",
        subtitle: "have to say about us",
        description: "We firmly believe that our client's success is our success. Here's a glimpse of our client's experience with us.",
        reviews: [
            {
                text: "This school software has revolutionized our school management. The School ERP Software effortlessly lightens the workload on our dedicated staff, replacing manual efforts with ...",
                author: "LAKHVIR SINGH",
                role: "Manager",
                school: "Kalgidhar Academy, Ludhiana"
            },
            {
                text: "As the President of the Federation of Private Schools and Associations of Punjab, I understand the technical challenges faced by schools in Punjab. Until now, I haven't come across a single solution that ...",
                author: "DR. JAGJIT SINGH DHURI",
                role: "Director",
                school: "Group Of Modern Secular Public School"
            },
            {
                text: "I used to face a lot of difficulties in fee collection. I started using EduBreezy's school fee software, and within 2-3 days, my staff's efficiency increased, and fee recovery became faster. Auto reminders and notifications kept ...",
                author: "AARTI SOBIT",
                role: "Principal",
                school: "Shree Hanumat International Public School, Goraya"
            }
        ]
    },
    faq: {
        title: "FAQs - Answers to Your Questions",
        highlightedText: "About EduBreezy",
        description: "Explore common questions and find answers about EduBreezy, tailored to help you understand our features and benefits.",
        questions: [
            "What is School ERP Software?",
            "How Does School ERP Software Work for My School?",
            "Why is EduBreezy School Software Different from Others?",
            "How to Choose the Right School ERP Software?",
            "Is there any hardware required to run EduBreezy ERP?",
            "How easy is it to implement EduBreezy in my school?"
        ]
    },
    finalCta: {
        badge: "Real-time Updates and Clear Communication Between Teachers, Parents & Students.",
        title: "Ready to make your school smarter?",
        description: "Make the smart choice! Get EduBreezy today.",
        buttons: ["Get Started Now", "Read FAQs"],
        imagePlaceholder: "/api/placeholder/600/400"
    },
    ratings: {
        platforms: [
            { name: "Google", rating: "4.8/5" },
            { name: "Software Suggest", rating: "5/5" },
            { name: "Trustpilot", rating: "4.5/5" }
        ]
    }
};
export default function HeroSection() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        schoolName: '',
        email: '',
        contact: '',
        designation: '',
        website: '',
        notRobot: false
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        alert('Demo request submitted successfully!');
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <div >
            <div className="min-h-screen pt-15  pb-20 lg:pb-0 lg:pt-0 bg-gradient-to-br bg-[#0569ff] relative overflow-hidden">
                {/* Tilted Wave Pattern Background */}
                {/* <div className="absolute inset-0 opacity-10">
                <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="wave-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                            <path d="M0 50 Q 25 30, 50 50 T 100 50" stroke="white" strokeWidth="0.5" fill="none" />
                            <path d="M0 60 Q 25 40, 50 60 T 100 60" stroke="white" strokeWidth="0.5" fill="none" />
                            <path d="M0 70 Q 25 50, 50 70 T 100 70" stroke="white" strokeWidth="0.5" fill="none" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#wave-pattern)" transform="rotate(-5 50 50)" />
                </svg>
            </div> */}
                <AnimatedWavePattern />
                {/* Hero Content */}
                <div className="relative z-10 flex items-center justify-center  px-6 lg:px-16 py-12 lg:py-40">
                    <div className="max-w-7xl text-center lg:text-start mx-auto grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Content */}
                        <div className="text-white space-y-8">
                            <h1 className="text-4xl  lg:text-6xl font-bold leading-tight">
                                AI-Powered School Management Software for Indian Schools
                            </h1>
                            <p className="text-lg lg:text-xl text-red-100 leading-relaxed">
                                India's first AI-powered school Management Software with a powerful toolkit to boost school management systems! We provide a complete education management software solution featuring over 90 modules, 4 mobile apps, and 15+ specialized services tailored for Indian schools. Our School ERP Software streamlines administration, enhances communication, and ensures seamless learning with automation and real-time analytics.
                            </p>
                            <div className="flex flex-col lg:flex-row items-center space-x-4">
                                <div className="text-6xl lg:text-7xl font-bold">100<span className="text-4xl">%</span></div>
                                <div className="text-lg">
                                    <div className="font-semibold">Secure & Reliable Cloud Based</div>
                                    <div className="text-red-100">School Management System</div>
                                </div>
                            </div>
                        </div>

                        {/* Right Form */}
                        <div className="bg-white rounded-2xl shadow-2xl p-8 lg:p-10">
                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-3">Book Your Free Demo</h2>
                            <p className="text-gray-600 mb-8">We are available to serve you always!</p>

                            <div className="space-y-5">
                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="Your Full Name*"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b7fff] focus:border-transparent"
                                />
                                <input
                                    type="text"
                                    name="schoolName"
                                    placeholder="School Name"
                                    value={formData.schoolName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b7fff] focus:border-transparent"
                                />
                                <div className="grid md:grid-cols-2 gap-5">
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Email Address"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b7fff] focus:border-transparent"
                                    />
                                    <input
                                        type="tel"
                                        name="contact"
                                        placeholder="Contact Number*"
                                        value={formData.contact}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b7fff] focus:border-transparent"
                                    />
                                </div>
                                <div className="grid md:grid-cols-2 gap-5">
                                    <select
                                        name="designation"
                                        value={formData.designation}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b7fff] focus:border-transparent appearance-none bg-white"
                                    >
                                        <option value="">Your Designation</option>
                                        <option value="principal">Principal</option>
                                        <option value="administrator">Administrator</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="other">Other</option>
                                    </select>
                                    <input
                                        type="text"
                                        name="website"
                                        placeholder="School Website"
                                        value={formData.website}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2b7fff] focus:border-transparent"
                                    />
                                </div>

                                <div className="flex items-start space-x-3 pt-2">
                                    <input
                                        type="checkbox"
                                        id="robot"
                                        name="notRobot"
                                        checked={formData.notRobot}
                                        onChange={handleChange}
                                        className="mt-1 w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-[#2b7fff]"
                                    />
                                    <label htmlFor="robot" className="text-sm text-gray-600">
                                        I'm not a robot
                                    </label>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-4 rounded-lg font-semibold text-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl"
                                >
                                    Submit
                                </button>

                                <p className="text-xs text-center text-gray-500 pt-2">
                                    By submitting this form, you accept our{' '}
                                    <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                                    {' '}and{' '}
                                    <a href="#" className="text-blue-600 hover:underline">Terms and Conditions</a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Diagonal Wave Cut at Bottom */}
                <AnimatedWave />
                {/* <div className="absolute bottom-0 left-0 right-0 z-10">
                <svg className="w-full h-24 md:h-32 lg:h-40" viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fill="#ffffff"
                        fillOpacity="1"
                        d="M0,192 C240,100 360,280 720,160 C1080,40 1200,220 1440,128 L1440,320 L0,320 Z"
                    ></path>
                </svg>
            </div> */}
            </div>

            <div className='px-5 lg:px-0'>

                <Himage />
                <AppsSection />
                <UpgradeSection />
                <SmarterSchoolSection />
                <StatisticsSection />
                <WhyClassOnSection />
                <SmartFeaturesSection />

                <TestimonialsSection />
                <FAQSection />
            </div>
                <FinalCTASection />
                {/* <Footer /> */}
        </div>
    );
}
// Ratings Bar Component
const RatingsBar = () => (
    <section className="py-8 bg-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
            <div className="text-center mb-4">
                <p className="text-gray-600">Our Users value us as much as we value them</p>
            </div>
            <div className="grid grid-cols-3 gap-4 md:gap-8 items-center justify-items-center">
                {content.ratings.platforms.map((platform, idx) => (
                    <div key={idx} className="text-center">
                        <p className="font-bold text-gray-900 mb-1 text-sm md:text-base">{platform.name}</p>
                        <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-3 h-3 md:w-4 md:h-4 fill-current" />
                            ))}
                        </div>
                        <p className="text-xs md:text-sm text-gray-600">{platform.rating}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);



{/* // School Logos Section Component */ }
const SchoolLogosSection = () => (
    <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                    {content.schoolLogos.title} <span className="text-[#0569ff]">{content.schoolLogos.highlightedText}</span>
                </h2>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-8 items-center">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div key={idx} className="bg-gray-100 rounded-full p-4 aspect-square flex items-center justify-center">
                        <div className="text-center">
                            <Shield className="w-8 h-8 text-gray-400 mx-auto" />
                            <p className="text-xs text-gray-400 mt-1">Logo {idx}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

// Testimonials Section Component
const TestimonialsSection = () => (
    <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    {content.testimonials.title} <span className="text-[#0569ff]">{content.testimonials.highlightedText}</span> {content.testimonials.subtitle}
                </h2>
                <p className="text-gray-600">{content.testimonials.description}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {content.testimonials.reviews.map((review, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-lg shadow-md">
                        <div className="mb-4">
                            <div className="flex text-yellow-500 mb-2">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-current" />
                                ))}
                            </div>
                        </div>
                        <p className="text-gray-600 mb-6 italic line-clamp-4">{review.text}</p>
                        <div className="border-t pt-4">
                            <p className="font-bold text-[#0569ff]">{review.author}</p>
                            <p className="text-sm text-gray-600">{review.role}</p>
                            <p className="text-sm text-gray-500">{review.school}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

// FAQ Section Component
const FAQSection = () => {
    const [openIndex, setOpenIndex] = React.useState(null);

    return (
        <section className="py-16">
            <div className="max-w-7xl mx-auto px-6 lg:px-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        {content.faq.title} <span className="text-[#0569ff]">{content.faq.highlightedText}</span>
                    </h2>
                    <p className="text-gray-600 max-w-3xl mx-auto">{content.faq.description}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {content.faq.questions.map((question, idx) => (
                        <Accordion type="single" collapsible className={'border-b'} key={idx} >
                            <AccordionItem value={`item-${idx}`}>
                                <AccordionTrigger className="text-gray-800 text-lg font-medium text-left">
                                    {question}
                                </AccordionTrigger>
                                <AccordionContent className="text-gray-600 text-lg">
                                    This is where the answer would appear. Click to toggle.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    ))}
                </div>
            </div>
        </section>
    );
};

// Final CTA Section Component
const FinalCTASection = () => (
    <section className="py-16 bg-[#0569ff]">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="text-white">
                    <p className="text-white mb-4">{content.finalCta.badge}</p>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.finalCta.title}</h2>
                    <p className="text-xl mb-8">{content.finalCta.description}</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        {content.finalCta.buttons.map((btn, idx) => (
                            <button
                                key={idx}
                                className={`px-8 py-3  hover:cursor-pointer rounded-md text-3xl font-semibold text-left transition ${idx === 0 ? 'bg-white text-[#0469ff] hover:bg-gray-100' : 'border-2 border-white text-white hover:bg-white hover:text-[#0469ff]'}`}
                            >
                                {btn}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl overflow-hidden aspect-video">
                    <img src={'https://classonapp.com/frontend-assets/images/7.webp'} alt="School Management App" className="max-w-[100%] object-cover h-auto" />
                </div>
            </div>
        </div>
    </section>
);

// Footer Component
const Footer = () => (
    <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                <div>
                    <h3 className="text-2xl font-bold text-[#0569ff] mb-4">EduBreezy</h3>
                    <p className="text-gray-400">Making education management simple and efficient.</p>
                </div>
                <div>
                    <h4 className="font-bold mb-4">Quick Links</h4>
                    <ul className="space-y-2 text-gray-400">
                        <li><a href="#" className="hover:text-white transition">Home</a></li>
                        <li><a href="#" className="hover:text-white transition">About</a></li>
                        <li><a href="#" className="hover:text-white transition">Solutions</a></li>
                        <li><a href="#" className="hover:text-white transition">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold mb-4">Services</h4>
                    <ul className="space-y-2 text-gray-400">
                        <li><a href="#" className="hover:text-white transition">School ERP</a></li>
                        <li><a href="#" className="hover:text-white transition">Mobile Apps</a></li>
                        <li><a href="#" className="hover:text-white transition">ID Cards</a></li>
                        <li><a href="#" className="hover:text-white transition">Website Design</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold mb-4">Contact</h4>
                    <ul className="space-y-2 text-gray-400">
                        <li>Email: info@classon.com</li>
                        <li>Phone: +91 1234567890</li>
                        <li>Address: India</li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
                <p>&copy; 2024 EduBreezy. All rights reserved.</p>
            </div>
        </div>
    </footer>
);



// Apps Section Component
const AppsSection = () => (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 lg:gap-12 grid lg:grid-cols-2 auto-rows-auto gap-5">
            <div className='h-fit'>
                <div className="text-left mb-4">
                    <div className="text-2xl font-semibold text-gray-500 mb-2">{content.apps.badge}</div>
                    <h2 className="text-6xl tracking-tight leading-tight font-semibold text-gray-900 mb-4">
                        {content.apps.title} <span className="text-[#0569ff]">{content.apps.highlightedText}</span>
                    </h2>
                    <p className="text-muted-foreground max-w-3xl text-[1rem] mx-auto">{content.apps.description}</p>
                </div>

                <div className="mb-12">
                    <ul className="space-y-4 max-w-3xl mx-auto">
                        {content.apps.points.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-[#0569ff] rounded-full mt-2 flex-shrink-0"></div>
                                <p className="text-muted-foreground !text-[1rem]">{point}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="text-left">
                    <button className="bg-[#0569ff] text-white px-8 py-3 rounded-md hover:bg-red-600 transition shadow-lg">
                        {content.apps.ctaButton} →
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
                {content.apps.cards.map((card, idx) => (
                    <div
                        key={idx}
                        className="bg-white p-6 rounded-lg hover:shadow-lg transition"
                    >
                        <div className='w-full flex lg:items-start lg:justify-start items-center justify-center'>
                            <div className="w-16 h-16 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                                <Users className="w-8 h-8" style={{ color: card.color }} />
                            </div>
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 mb-2">{card.title}</h3>
                        <p className="text-gray-600">{card.description}</p>
                    </div>
                ))}
            </div>


        </div>
    </section>
);

// Upgrade Section Component
const UpgradeSection = () => (
    <section className="py-16 ">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    {content.upgrade.title} <span className="text-[#0569ff]">{content.upgrade.highlightedText}</span> {content.upgrade.subtitle} <span className="text-[#0569ff]">{content.upgrade.highlightedSubtitle}</span>
                </h2>
                <p className="text-gray-600 max-w-3xl mx-auto">{content.upgrade.description}</p>

            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
                <div >
                    <img src={content.upgrade.image} alt="School Management App" className="max-w-[100%]  h-auto" />
                </div>

                <div className="space-y-6">
                    {content.upgrade.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Star className="w-6 h-6 text-[#0569ff]" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                    <div className="text-center flex flex-col sm:flex-row gap-4 justify-start">
                        {content.upgrade.ctaButtons.map((btn, idx) => (
                            <button
                                key={idx}
                                className={`px-8 py-3 rounded-md transition ${idx === 0 ? 'bg-[#0569ff] text-white hover:bg-red-600' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                            >
                                {btn}
                            </button>
                        ))}
                    </div>
                </div>
            </div>


        </div>
    </section>
);

// Smarter School Section Component
const SmarterSchoolSection = () => (
    <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
            <div className="grid md:grid-cols-2 gap-12 px-4 rounded-lg items-center bg-[#f9f4f4]">
                <div>
                    <div className="text-2xl font-medium text-gray-500 mb-2">{content.smarterSchool.badge}</div>
                    <h2 className="text-5xl tracking-tight leading-tight font-bold text-gray-900 mb-6">
                        {content.smarterSchool.title} <span className="text-[#0569ff]">{content.smarterSchool.highlightedText}</span>
                    </h2>
                    <ul className="list-disc pl-6 space-y-4 marker:text-[#0569ff] marker:text-2xl">
                        {content.smarterSchool.features.map((feature, idx) => (
                            <li key={idx} className="text-gray-700 font-light">
                                {feature}
                            </li>
                        ))}
                    </ul>


                </div>
                <div className="relative">
                    <img src={content.smarterSchool.imagePlaceholder} alt="School Management App" className="!w-full h-auto" />
                    <div className="absolute top-8 right-8 bg-white p-3 rounded-lg shadow-lg">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                </div>
            </div>
        </div>
    </section>
);

// Statistics Section Component
const StatisticsSection = () => (
    <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                    {content.statistics.title} <span className="text-[#0569ff]">{content.statistics.highlightedText}</span>
                </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                {content.statistics.stats.map((stat, idx) => (
                    <div key={idx} className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-[#0569ff] mb-2">{stat.value}</div>
                        <div className="text-gray-600 text-sm md:text-base">{stat.label}</div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

// Why EduBreezy Section Component
const WhyClassOnSection = () => (
    <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Image first always */}
                <div className="relative order-1">
                    <img
                        src={content.whyClassOn.imagePlaceholder}
                        alt="School Management App"
                        className="!w-full object-cover h-auto"
                    />
                </div>

                {/* Text second */}
                <div className="order-2">
                    <h2 className="text-3xl md:text-5xl tracking-tight leading-tight font-semibold text-gray-900 mb-4">
                        {content.whyClassOn.title}{' '}
                        <span className="text-[#0569ff]">{content.whyClassOn.highlightedText}</span>
                    </h2>
                    <p className="text-gray-600 mb-6 leading-[1.5em] tracking-wide">
                        {content.whyClassOn.description}
                    </p>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                        {content.whyClassOn.title2}
                    </h3>
                    <ul className="space-y-3">
                        {content.whyClassOn.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-[#0569ff] flex-shrink-0 mt-1" />
                                <span className="text-gray-700">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    </section>
);

// Smart Features Section Component
const SmartFeaturesSection = () => (
    <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    {content.smartFeatures.title} <span className="text-[#0569ff]">{content.smartFeatures.highlightedText}</span> {content.smartFeatures.subtitle}
                </h2>
                <p className="text-gray-600">{content.smartFeatures.description}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                {content.smartFeatures.features.map((feature, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition text-center">
                        <div className="w-16 h-16 bg-pink-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-[#0569ff]" />
                        </div>
                        <h3 className="font-semibold text-gray-900">{feature}</h3>
                    </div>
                ))}
            </div>

            <div className="text-center">
                <button className="border-2 border-gray-900 text-gray-900 px-8 py-3 rounded-md hover:bg-gray-900 hover:text-white transition">
                    {content.smartFeatures.ctaButton}
                </button>
            </div>
        </div>
    </section>
);


// Hero Section Component
const Himage = () => (
    <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="rounded-3xl overflow-hidden">
                    <img src={content.hero.imagePlaceholder} alt="School Management App" className="lg:!w-full w-lg h-auto" />
                </div>
                <div className=''>
                    <div className="bg-white inline-block px-4 py-2 rounded-full text-sm text-gray-600 mb-4">
                        {content.hero.badge}
                    </div>
                    <h1 className="text-6xl tracking-tight leading-tight lg:text-5xl font-bold text-gray-900 mb-4">
                        {content.hero.title} <span className="text-[#0569ff]">{content.hero.highlightedText}</span>
                    </h1>
                    <p className="text-gray-600 mb-6 leading-relaxed">{content.hero.description}</p>
                    <ul className="space-y-3 mb-8">
                        {content.hero.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-[#0569ff] flex-shrink-0 mt-1" />
                                <span className="text-gray-700">{feature}</span>
                            </li>
                        ))}
                    </ul>
                    <button className="bg-[#0569ff] text-white px-8 py-3 rounded-md hover:bg-red-600 transition">
                        {content.hero.ctaButton}
                    </button>
                </div>
                {/* <div className="relative">
                    <div className="absolute -left-8 top-1/4 bg-white p-4 rounded-lg shadow-lg">
                        <Database className="w-8 h-8 text-green-500 mb-2" />
                        <p className="text-sm font-semibold">Lifetime Free Updates</p>
                    </div>
                    <div className="absolute -right-8 bottom-1/4 bg-white p-4 rounded-lg shadow-lg">
                        <Shield className="w-8 h-8 text-green-500 mb-2" />
                        <p className="text-sm font-semibold">100% Data Protection</p>
                    </div>

                </div> */}
            </div>
        </div>
    </section>
);

function AnimatedWave() {

    const pathRef = useRef(null);

    useEffect(() => {
        let animationFrameId;
        let offset = 0;

        const animate = () => {
            offset += 3; // Speed of animation

            if (pathRef.current) {
                // Create smooth wave animation by modifying the path
                const wave1 = Math.sin(offset * 0.01) * 30;
                const wave2 = Math.cos(offset * 0.015) * 40;
                const wave3 = Math.sin(offset * 0.012) * 35;

                pathRef.current.setAttribute(
                    'd',
                    `M0,${192 + wave1} C240,${100 + wave2} 360,${280 + wave3} 720,${160 + wave1} C1080,${40 + wave2} 1200,${220 + wave3} 1440,${128 + wave1} L1440,320 L0,320 Z`
                );
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, []);

    return (
        <div className="absolute bottom-0 left-0 right-0 z-10">
            <svg
                className="w-full h-24 md:h-32 lg:h-40"
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    ref={pathRef}
                    fill="#ffffff"
                    fillOpacity="1"
                    d="M0,192 C240,100 360,280 720,160 C1080,40 1200,220 1440,128 L1440,320 L0,320 Z"
                />
            </svg>
        </div>
    );
}

function AnimatedWavePattern() {
    const path1Ref = useRef(null);
    const path2Ref = useRef(null);
    const path3Ref = useRef(null);

    useEffect(() => {
        let animationFrameId;
        let offset = 0;

        const animate = () => {
            offset += 1;

            // Wave 1 - Slow speed
            if (path1Ref.current) {
                const wave1X = Math.sin(offset * 0.02) * 5;
                const wave1Y = Math.cos(offset * 0.02) * 3;
                path1Ref.current.setAttribute(
                    'd',
                    `M${0 + wave1X} ${50 + wave1Y} Q ${25 + wave1X} ${30 + wave1Y}, ${50 + wave1X} ${50 + wave1Y} T ${100 + wave1X} ${50 + wave1Y}`
                );
            }

            // Wave 2 - Medium speed
            if (path2Ref.current) {
                const wave2X = Math.sin(offset * 0.035) * 4;
                const wave2Y = Math.cos(offset * 0.03) * 4;
                path2Ref.current.setAttribute(
                    'd',
                    `M${0 + wave2X} ${60 + wave2Y} Q ${25 + wave2X} ${40 + wave2Y}, ${50 + wave2X} ${60 + wave2Y} T ${100 + wave2X} ${60 + wave2Y}`
                );
            }

            // Wave 3 - Fast speed
            if (path3Ref.current) {
                const wave3X = Math.sin(offset * 0.05) * 6;
                const wave3Y = Math.cos(offset * 0.045) * 5;
                path3Ref.current.setAttribute(
                    'd',
                    `M${0 + wave3X} ${70 + wave3Y} Q ${25 + wave3X} ${50 + wave3Y}, ${50 + wave3X} ${70 + wave3Y} T ${100 + wave3X} ${70 + wave3Y}`
                );
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, []);

    return (
        <div className="absolute inset-0 opacity-18">
            <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="wave-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                        <path
                            ref={path1Ref}
                            d="M0 50 Q 25 30, 50 50 T 100 50"
                            stroke="white"
                            strokeWidth="0.5"
                            fill="none"
                        />
                        <path
                            ref={path2Ref}
                            d="M0 60 Q 25 40, 50 60 T 100 60"
                            stroke="white"
                            strokeWidth="0.5"
                            fill="none"
                        />
                        <path
                            ref={path3Ref}
                            d="M0 70 Q 25 50, 50 70 T 100 70"
                            stroke="white"
                            strokeWidth="0.5"
                            fill="none"
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#wave-pattern)" transform="rotate(-5 50 50)" />
            </svg>
        </div>
    );
}
