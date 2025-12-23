'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Users, GraduationCap, CreditCard, Clock, FileText, Bus,
    BookOpen, Wallet, ClipboardList, Globe, Calendar, Home,
    Bell, Handshake, Award, UserCheck, Sparkles, ChevronRight,
    ChevronDown, Menu, X, Search, ArrowRight
} from 'lucide-react';

// Feature categories with their sections
const featureCategories = [
    {
        id: 'core',
        name: 'Core Modules',
        icon: Home,
        sections: [
            { id: 'student-management', name: 'Student Management', icon: Users },
            { id: 'staff-management', name: 'Staff Management', icon: UserCheck },
            { id: 'fee-management', name: 'Fee Management', icon: CreditCard },
            { id: 'attendance', name: 'Attendance System', icon: Clock },
        ]
    },
    {
        id: 'academic',
        name: 'Academic',
        icon: GraduationCap,
        sections: [
            { id: 'examination', name: 'Examination & Results', icon: FileText },
            { id: 'timetable', name: 'Timetable Management', icon: Calendar },
            { id: 'homework', name: 'Homework & Assignments', icon: ClipboardList },
            { id: 'library', name: 'Library Management', icon: BookOpen },
        ]
    },
    {
        id: 'operations',
        name: 'Operations',
        icon: Bus,
        sections: [
            { id: 'transport', name: 'Transport Management', icon: Bus },
            { id: 'payroll', name: 'Payroll Management', icon: Wallet },
            { id: 'inventory', name: 'Inventory Management', icon: ClipboardList },
            { id: 'calendar', name: 'Calendar & Events', icon: Calendar },
        ]
    },
    {
        id: 'communication',
        name: 'Communication',
        icon: Bell,
        sections: [
            { id: 'noticeboard', name: 'Notice Board', icon: Bell },
            { id: 'parent-portal', name: 'Parent Portal', icon: Users },
        ]
    },
    {
        id: 'growth',
        name: 'Growth & Discovery',
        icon: Globe,
        sections: [
            { id: 'admissions', name: 'Admissions & Forms', icon: ClipboardList },
            { id: 'school-explorer', name: 'School Explorer', icon: Globe },
            { id: 'partner-program', name: 'Partner Program', icon: Handshake },
        ]
    },
    {
        id: 'documents',
        name: 'Documents',
        icon: FileText,
        sections: [
            { id: 'certificates', name: 'Certificates & ID Cards', icon: Award },
            { id: 'documents', name: 'Document Generation', icon: FileText },
        ]
    },
    {
        id: 'advanced',
        name: 'Advanced',
        icon: Sparkles,
        sections: [
            { id: 'alumni', name: 'Alumni Management', icon: GraduationCap },
            { id: 'eduai', name: 'EduAI', icon: Sparkles },
        ]
    },
];

// Detailed feature content
const featureContent = {
    'student-management': {
        title: 'Student Management',
        tagline: 'Complete student lifecycle management',
        description: 'Manage every aspect of student information from admission to graduation. Track academic records, maintain profiles, and handle promotions seamlessly.',
        features: [
            {
                title: 'Student Profiles',
                description: 'Comprehensive student profiles with personal details, academic history, photos, and documents all in one place.'
            },
            {
                title: 'Admission Management',
                description: 'Streamlined admission process with application tracking, document collection, and automated admission number generation.'
            },
            {
                title: 'Class & Section Assignment',
                description: 'Easily assign students to classes and sections. Bulk operations for efficient management.'
            },
            {
                title: 'Academic Records',
                description: 'Complete academic history including exam results, attendance records, and report cards.'
            },
            {
                title: 'Photo Gallery',
                description: 'Upload and manage student photos with bulk upload support for school events and activities.'
            },
            {
                title: 'Student Promotions',
                description: 'Automated promotion workflows with configurable rules for academic year transitions.'
            }
        ],
        highlights: ['Bulk Import/Export', 'Custom Fields', 'Document Storage', 'QR Code IDs'],
    },
    'staff-management': {
        title: 'Staff Management',
        tagline: 'Unified staff administration',
        description: 'Manage teaching and non-teaching staff with comprehensive profiles, attendance tracking, leave management, and performance monitoring.',
        features: [
            {
                title: 'Teaching Staff',
                description: 'Complete profiles for teachers including qualifications, subjects, class assignments, and performance metrics.'
            },
            {
                title: 'Non-Teaching Staff',
                description: 'Manage administrative, support, and maintenance staff with role-based access and attendance.'
            },
            {
                title: 'Attendance Tracking',
                description: 'Daily attendance for all staff with biometric integration support and late arrival tracking.'
            },
            {
                title: 'Leave Management',
                description: 'Configure leave policies, handle leave requests, track balances, and manage approvals efficiently.'
            },
            {
                title: 'Document Management',
                description: 'Store and manage staff documents including certificates, ID proofs, and contracts securely.'
            },
            {
                title: 'Shift Management',
                description: 'Define and assign work shifts for staff with flexible timing configurations.'
            }
        ],
        highlights: ['Role-Based Access', 'Leave Calendar', 'Document Verification', 'Performance Tracking'],
    },
    'fee-management': {
        title: 'Fee Management',
        tagline: 'Simplified fee collection & tracking',
        description: 'Create flexible fee structures, collect payments online or offline, generate receipts, and track dues with comprehensive reporting.',
        features: [
            {
                title: 'Fee Structures',
                description: 'Create class-wise fee structures with multiple fee types like tuition, transport, library, and custom fees.'
            },
            {
                title: 'Online Payments',
                description: 'Accept payments via UPI, cards, net banking with integrated payment gateway support.'
            },
            {
                title: 'Receipt Generation',
                description: 'Automatic receipt generation with customizable templates and QR code verification.'
            },
            {
                title: 'Due Management',
                description: 'Track pending fees, send reminders, and manage defaulters with automated notifications.'
            },
            {
                title: 'Discounts & Concessions',
                description: 'Apply scholarships, sibling discounts, and special concessions with approval workflows.'
            },
            {
                title: 'Financial Reports',
                description: 'Comprehensive reports on collections, dues, GST, and financial summaries.'
            }
        ],
        highlights: ['Razorpay Integration', 'GST Compliant', 'Auto Reminders', 'Payment Plans'],
    },
    'attendance': {
        title: 'Attendance System',
        tagline: 'Smart attendance tracking',
        description: 'Track student and staff attendance with multiple methods including biometric, app-based, and manual entry. Get real-time analytics and notifications.',
        features: [
            {
                title: 'Daily Attendance',
                description: 'Mark attendance for entire classes with a single click. Support for half-day and leave marking.'
            },
            {
                title: 'Period-wise Tracking',
                description: 'Track attendance for each period separately for detailed subject-wise attendance analysis.'
            },
            {
                title: 'Biometric Integration',
                description: 'Integrate with biometric devices for automated attendance recording for students and staff.'
            },
            {
                title: 'Leave Requests',
                description: 'Parents can submit leave requests through the app with approval workflow for teachers.'
            },
            {
                title: 'Analytics Dashboard',
                description: 'Visual reports on attendance trends, defaulters, and class-wise statistics.'
            },
            {
                title: 'Auto Notifications',
                description: 'Instant SMS/Push notifications to parents for student absence or late arrival.'
            }
        ],
        highlights: ['Biometric Ready', 'Parent App Integration', 'Real-time Alerts', 'Trend Analysis'],
    },
    'examination': {
        title: 'Examination & Results',
        tagline: 'Complete exam management',
        description: 'Plan exams, create hall tickets, manage hall arrangements, enter marks, and generate report cards with ease.',
        features: [
            {
                title: 'Exam Planning',
                description: 'Schedule exams with date sheets, subject-wise timing, and exam type configuration.'
            },
            {
                title: 'Hall Ticket Generation',
                description: 'Auto-generate hall tickets with student details, photo, exam schedule, and instructions.'
            },
            {
                title: 'Seating Arrangement',
                description: 'Create seating plans for exam halls with automated arrangement and supervisor allocation.'
            },
            {
                title: 'Mark Entry',
                description: 'Subject teachers can enter marks online with validation rules and grade calculation.'
            },
            {
                title: 'Report Cards',
                description: 'Generate customizable report cards with grades, remarks, and performance graphs.'
            },
            {
                title: 'Result Analytics',
                description: 'Analyze results by class, subject, and student with comparative performance metrics.'
            }
        ],
        highlights: ['Auto Grading', 'PDF Export', 'Performance Graphs', 'Rank Calculation'],
    },
    'timetable': {
        title: 'Timetable Management',
        tagline: 'Smart scheduling',
        description: 'Create conflict-free timetables with automated scheduling, teacher allocation, and substitution management.',
        features: [
            {
                title: 'Timetable Builder',
                description: 'Visual drag-and-drop timetable builder with period slots and break configuration.'
            },
            {
                title: 'Teacher Allocation',
                description: 'Assign teachers to periods with workload balancing and conflict detection.'
            },
            {
                title: 'Conflict Detection',
                description: 'Automatic detection of scheduling conflicts for teachers and rooms.'
            },
            {
                title: 'Templates',
                description: 'Save and reuse timetable templates for quick setup across academic years.'
            },
            {
                title: 'Substitution Management',
                description: 'Handle teacher absences with automated substitute suggestions and notifications.'
            },
            {
                title: 'Student & Teacher View',
                description: 'Different views for students, teachers, and parents with mobile-friendly display.'
            }
        ],
        highlights: ['Drag & Drop', 'Auto Scheduling', 'Mobile View', 'Print Ready'],
    },
    'homework': {
        title: 'Homework & Assignments',
        tagline: 'Digital assignment workflow',
        description: 'Create, distribute, and track homework and assignments digitally. Enable online submissions and grading.',
        features: [
            {
                title: 'Assignment Creation',
                description: 'Create assignments with rich text, attachments, due dates, and submission guidelines.'
            },
            {
                title: 'Distribution',
                description: 'Publish to specific classes, sections, or individual students with instant notifications.'
            },
            {
                title: 'Online Submission',
                description: 'Students can submit homework online through the app with file upload support.'
            },
            {
                title: 'Grading & Feedback',
                description: 'Grade submissions, provide feedback, and track completion rates.'
            },
            {
                title: 'Parent Visibility',
                description: 'Parents can view assigned homework and submission status in their app.'
            },
            {
                title: 'Analytics',
                description: 'Track submission rates, late submissions, and student performance trends.'
            }
        ],
        highlights: ['File Attachments', 'Due Date Reminders', 'Submission Tracking', 'Parent Access'],
    },
    'library': {
        title: 'Library Management',
        tagline: 'Digital library operations',
        description: 'Manage book catalog, handle issue/return, track fines, and provide digital library access to students and staff.',
        features: [
            {
                title: 'Book Catalog',
                description: 'Comprehensive book database with ISBN, categories, authors, and location tracking.'
            },
            {
                title: 'Issue & Return',
                description: 'Quick book issue and return with barcode scanning and due date management.'
            },
            {
                title: 'Fine Management',
                description: 'Automatic fine calculation for overdue books with configurable rates.'
            },
            {
                title: 'Book Requests',
                description: 'Students can request books online, and librarians get notifications.'
            },
            {
                title: 'Digital Library',
                description: 'Upload and share e-books, PDFs, and digital resources with students.'
            },
            {
                title: 'Reports',
                description: 'Generate reports on book circulation, popular books, and library usage.'
            }
        ],
        highlights: ['Barcode Support', 'E-Books', 'Auto Fines', 'Usage Analytics'],
    },
    'transport': {
        title: 'Transport Management',
        tagline: 'Fleet & route management',
        description: 'Manage school vehicles, routes, drivers, and transport fees. Track buses and keep parents informed.',
        features: [
            {
                title: 'Vehicle Management',
                description: 'Track all vehicles with registration, insurance, fitness details, and maintenance schedules.'
            },
            {
                title: 'Route Planning',
                description: 'Create pickup/drop routes with stops, timing, and capacity management.'
            },
            {
                title: 'Driver Management',
                description: 'Manage driver profiles, license details, and route assignments.'
            },
            {
                title: 'Student Allocation',
                description: 'Assign students to routes and stops with parent preferences.'
            },
            {
                title: 'Transport Fees',
                description: 'Configure route-wise transport fees with integrated billing.'
            },
            {
                title: 'Parent Notifications',
                description: 'Notify parents about bus arrivals, delays, and route changes.'
            }
        ],
        highlights: ['Route Mapping', 'Driver App', 'Parent Alerts', 'Fee Integration'],
    },
    'payroll': {
        title: 'Payroll Management',
        tagline: 'Automated salary processing',
        description: 'Configure salary structures, process payroll, handle deductions, generate payslips, and manage bank payments.',
        features: [
            {
                title: 'Salary Structures',
                description: 'Create flexible salary components with earnings, deductions, and allowances.'
            },
            {
                title: 'Payroll Processing',
                description: 'Monthly payroll processing with attendance integration and leave deductions.'
            },
            {
                title: 'Tax Calculations',
                description: 'Automatic TDS, PF, ESI calculations based on government rules.'
            },
            {
                title: 'Payslip Generation',
                description: 'Generate digital payslips with detailed breakup and download options.'
            },
            {
                title: 'Bank Integration',
                description: 'Export salary data for bank transfers with standard formats.'
            },
            {
                title: 'Audit Trail',
                description: 'Complete audit log of all payroll changes and approvals.'
            }
        ],
        highlights: ['Auto TDS', 'Bank Export', 'Leave Integration', 'Audit Ready'],
    },
    'inventory': {
        title: 'Inventory Management',
        tagline: 'Stock & sales tracking',
        description: 'Manage school inventory including uniforms, books, stationery with stock tracking and point-of-sale.',
        features: [
            {
                title: 'Item Catalog',
                description: 'Maintain catalog of all inventory items with categories, SKUs, and pricing.'
            },
            {
                title: 'Stock Management',
                description: 'Track stock levels, set reorder points, and manage stock adjustments.'
            },
            {
                title: 'Point of Sale',
                description: 'Process sales to students/parents with receipt generation.'
            },
            {
                title: 'Low Stock Alerts',
                description: 'Get notifications when stock falls below minimum levels.'
            },
            {
                title: 'Vendor Management',
                description: 'Manage suppliers and purchase orders for inventory replenishment.'
            },
            {
                title: 'Sales Reports',
                description: 'Track sales performance, popular items, and revenue analytics.'
            }
        ],
        highlights: ['POS System', 'Auto Alerts', 'Vendor Tracking', 'Sales Analytics'],
    },
    'calendar': {
        title: 'Calendar & Events',
        tagline: 'Academic planning',
        description: 'Plan the academic year with holidays, events, exams, and important dates visible to all stakeholders.',
        features: [
            {
                title: 'Academic Calendar',
                description: 'Define complete academic year with terms, exams, and important dates.'
            },
            {
                title: 'Holiday Management',
                description: 'Configure public holidays, vacations, and special working days.'
            },
            {
                title: 'Event Planning',
                description: 'Schedule school events like sports day, annual day, parent meetings.'
            },
            {
                title: 'Reminders',
                description: 'Automated reminders for upcoming events to staff and parents.'
            },
            {
                title: 'Integration',
                description: 'Calendar syncs with attendance, timetable, and exam modules.'
            },
            {
                title: 'Parent View',
                description: 'Parents see relevant dates and events in their app calendar.'
            }
        ],
        highlights: ['Multi-Calendar', 'Auto Sync', 'Parent Access', 'Event Alerts'],
    },
    'noticeboard': {
        title: 'Notice Board',
        tagline: 'Instant communication',
        description: 'Publish announcements, circulars, and notifications to students, parents, and staff with targeted distribution.',
        features: [
            {
                title: 'Notice Creation',
                description: 'Create rich notices with text, images, and PDF attachments.'
            },
            {
                title: 'Targeted Distribution',
                description: 'Send to specific classes, sections, or user groups.'
            },
            {
                title: 'Push Notifications',
                description: 'Instant push notifications to mobile apps for urgent notices.'
            },
            {
                title: 'Read Tracking',
                description: 'Track who has viewed the notice and follow up with non-readers.'
            },
            {
                title: 'Categories',
                description: 'Organize notices by category for easy filtering and search.'
            },
            {
                title: 'Archive',
                description: 'Historical archive of all notices for reference and compliance.'
            }
        ],
        highlights: ['Push Alerts', 'Read Receipts', 'PDF Support', 'Archive Search'],
    },
    'parent-portal': {
        title: 'Parent Portal',
        tagline: 'Parent engagement hub',
        description: 'Keep parents informed and engaged with real-time access to student progress, fees, attendance, and school communication.',
        features: [
            {
                title: 'Student Dashboard',
                description: "Parents see complete overview of their child's academic status."
            },
            {
                title: 'Attendance View',
                description: 'Daily attendance status with absence reasons and leave history.'
            },
            {
                title: 'Fee Status',
                description: 'View fee dues, payment history, and make online payments.'
            },
            {
                title: 'Academic Progress',
                description: 'Access exam results, report cards, and performance trends.'
            },
            {
                title: 'Communication',
                description: 'Direct messaging with class teachers and administrators.'
            },
            {
                title: 'Homework Tracking',
                description: 'View assigned homework and submission status.'
            }
        ],
        highlights: ['Mobile App', 'Online Payments', 'Report Cards', 'Teacher Chat'],
    },
    'admissions': {
        title: 'Admissions & Forms',
        tagline: 'Digital admission process',
        description: 'Create custom admission forms, accept online applications, track application stages, and convert to enrolled students.',
        features: [
            {
                title: 'Form Builder',
                description: 'Drag-and-drop form builder with custom fields, validations, and file uploads.'
            },
            {
                title: 'Online Applications',
                description: 'Parents apply online with document upload and payment integration.'
            },
            {
                title: 'Application Tracking',
                description: 'Track applications through stages: New, Under Review, Interview, Admitted.'
            },
            {
                title: 'Document Collection',
                description: 'Collect and verify required documents digitally.'
            },
            {
                title: 'Interview Scheduling',
                description: 'Schedule and manage admission interviews with notifications.'
            },
            {
                title: 'Conversion',
                description: 'Convert approved applications directly to student records.'
            }
        ],
        highlights: ['Custom Forms', 'Stage Workflow', 'Online Payment', 'Auto Convert'],
    },
    'school-explorer': {
        title: 'School Explorer',
        tagline: 'Get discovered by parents',
        description: 'Create a public profile for your school on school.edubreezy.com. Receive admission inquiries and build your online presence.',
        features: [
            {
                title: 'Public Profile',
                description: 'Beautiful, SEO-optimized school profile page with all essential information.'
            },
            {
                title: 'Admission Inquiries',
                description: 'Receive and manage admission inquiries directly from interested parents.'
            },
            {
                title: 'Gallery & Media',
                description: 'Showcase campus, events, and facilities with photo galleries and videos.'
            },
            {
                title: 'Parent Reviews',
                description: 'Collect verified reviews from parents to build trust and credibility.'
            },
            {
                title: 'Analytics',
                description: 'Track profile views, inquiry trends, and conversion rates.'
            },
            {
                title: 'Featured Listing',
                description: 'Get premium placement in search results for more visibility.'
            }
        ],
        highlights: ['Free Listing', 'Lead Generation', 'Reviews', 'SEO Ready'],
    },
    'partner-program': {
        title: 'Partner Program',
        tagline: 'Grow with EduBreezy',
        description: 'Join our channel partner program to refer schools and earn commissions. Get marketing support and dedicated account management.',
        features: [
            {
                title: 'Lead Management',
                description: 'Submit and track school leads with status updates and follow-ups.'
            },
            {
                title: 'Commission Tracking',
                description: 'View earned commissions, pending payouts, and commission history.'
            },
            {
                title: 'Referral Tools',
                description: 'Get unique referral links, QR codes, and marketing materials.'
            },
            {
                title: 'Payout Management',
                description: 'Request payouts to bank account with transparent processing.'
            },
            {
                title: 'Marketing Assets',
                description: 'Access pitch decks, brochures, and demo videos for sales.'
            },
            {
                title: 'Performance Dashboard',
                description: 'Track your performance, revenue, and growth metrics.'
            }
        ],
        highlights: ['Up to 15% Commission', 'Dedicated Support', 'Marketing Kit', 'Quick Payouts'],
    },
    'certificates': {
        title: 'Certificates & ID Cards',
        tagline: 'Digital document generation',
        description: 'Design and generate certificates, ID cards, admit cards, and other documents with customizable templates and QR verification.',
        features: [
            {
                title: 'Template Designer',
                description: 'Visual template editor with drag-and-drop elements and custom layouts.'
            },
            {
                title: 'Student ID Cards',
                description: 'Generate ID cards with photos, QR codes, and school branding.'
            },
            {
                title: 'Certificates',
                description: 'Create achievement, transfer, bonafide, and character certificates.'
            },
            {
                title: 'Admit Cards',
                description: 'Auto-generate hall tickets with exam schedules and student details.'
            },
            {
                title: 'QR Verification',
                description: 'Embedded QR codes for instant verification of document authenticity.'
            },
            {
                title: 'Bulk Generation',
                description: 'Generate documents for entire classes in one click.'
            }
        ],
        highlights: ['Template Builder', 'QR Verification', 'Bulk Print', 'PDF Export'],
    },
    'documents': {
        title: 'Document Generation',
        tagline: 'Automated document creation',
        description: 'Generate official school documents like transfer certificates, bonafide certificates, and custom letters automatically.',
        features: [
            {
                title: 'Transfer Certificate',
                description: 'Generate TC with complete student history and proper numbering.'
            },
            {
                title: 'Bonafide Certificate',
                description: 'Quick bonafide generation for students with verification.'
            },
            {
                title: 'Character Certificate',
                description: 'Generate character and conduct certificates for students.'
            },
            {
                title: 'Custom Templates',
                description: 'Create templates for any document type with placeholders.'
            },
            {
                title: 'Digital Signatures',
                description: 'Add authorized digital signatures and stamps to documents.'
            },
            {
                title: 'Document Registry',
                description: 'Track all generated documents with register numbers.'
            }
        ],
        highlights: ['Auto Numbering', 'Digital Signatures', 'Templates', 'Registry'],
    },
    'alumni': {
        title: 'Alumni Management',
        tagline: 'Stay connected with graduates',
        description: 'Maintain alumni records, enable networking, organize reunions, and leverage alumni for school growth.',
        features: [
            {
                title: 'Alumni Database',
                description: 'Comprehensive database of all school graduates with career tracking.'
            },
            {
                title: 'Auto Migration',
                description: 'Students automatically added to alumni on graduation.'
            },
            {
                title: 'Alumni Portal',
                description: 'Dedicated portal for alumni to update profiles and connect.'
            },
            {
                title: 'Event Management',
                description: 'Organize reunions, career talks, and alumni meetups.'
            },
            {
                title: 'Communication',
                description: 'Bulk communication with alumni for updates and invitations.'
            },
            {
                title: 'Success Stories',
                description: 'Showcase alumni achievements on school profile.'
            }
        ],
        highlights: ['Auto Migration', 'Alumni Portal', 'Event Management', 'Networking'],
    },
    'eduai': {
        title: 'EduAI',
        tagline: 'AI-powered insights',
        description: 'Leverage artificial intelligence for smart analytics, predictive insights, and automated recommendations to improve school operations.',
        features: [
            {
                title: 'Smart Analytics',
                description: 'AI-powered dashboards with actionable insights from school data.'
            },
            {
                title: 'Predictive Analysis',
                description: 'Predict student performance, attendance patterns, and fee defaults.'
            },
            {
                title: 'Auto Reports',
                description: 'AI-generated summary reports for administrators and teachers.'
            },
            {
                title: 'Recommendations',
                description: 'Smart suggestions for improving student outcomes and operations.'
            },
            {
                title: 'Chatbot Assistant',
                description: 'AI chatbot to answer common queries from parents and staff.'
            },
            {
                title: 'Content Generation',
                description: 'AI assistance for creating notices, reports, and communications.'
            }
        ],
        highlights: ['Predictive AI', 'Smart Reports', 'Chatbot', 'Recommendations'],
    },
};

// Sidebar Navigation Component
function Sidebar({ activeSection, setActiveSection, isMobileMenuOpen, setMobileMenuOpen }) {
    const [expandedCategories, setExpandedCategories] = useState(['core']);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter categories based on search
    const filteredCategories = featureCategories.map(category => ({
        ...category,
        sections: category.sections.filter(section =>
            section.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(category => category.sections.length > 0);

    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    return (
        <aside className={`
            fixed lg:sticky top-0 left-0 z-50 h-screen lg:h-[calc(100vh-80px)] lg:top-20
            w-72 bg-white lg:bg-transparent border-r border-gray-200 lg:border-0
            transform transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            overflow-y-auto
        `}>
            {/* Mobile Close Button */}
            <div className="flex items-center justify-between p-4 lg:hidden border-b">
                <span className="font-bold text-lg">Features</span>
                <button onClick={() => setMobileMenuOpen(false)}>
                    <X size={24} />
                </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-gray-200">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search features..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 bg-muted pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0569ff] focus:ring-1 focus:ring-[#0569ff]"
                    />
                </div>
            </div>

            <nav className="p-4 space-y-2">
                {filteredCategories.map((category) => (
                    <div key={category.id}>
                        <button
                            onClick={() => toggleCategory(category.id)}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-[#1a1a2e] hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <category.icon size={16} className="text-[#0569ff]" />
                                <span>{category.name}</span>
                            </div>
                            <ChevronDown
                                size={16}
                                className={`text-gray-400 transition-transform ${expandedCategories.includes(category.id) ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {expandedCategories.includes(category.id) && (
                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                                {category.sections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => {
                                            setActiveSection(section.id);
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`
                                            w-full text-left px-3 py-2 text-sm rounded-lg transition-colors
                                            ${activeSection === section.id
                                                ? 'bg-[#0569ff]/10 text-[#0569ff] font-medium'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-[#1a1a2e]'
                                            }
                                        `}
                                    >
                                        {section.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>
        </aside>
    );
}

// On This Page Navigation
function OnThisPage({ content }) {
    return (
        <aside className="hidden xl:block w-56 shrink-0">
            <div className="sticky top-24">
                <h4 className="text-sm font-semibold text-[#1a1a2e] mb-4">On this page</h4>
                <nav className="space-y-2 text-sm">
                    <a href="#overview" className="block text-gray-600 hover:text-[#0569ff] transition-colors">
                        Overview
                    </a>
                    <a href="#features" className="block text-gray-600 hover:text-[#0569ff] transition-colors">
                        Key Features
                    </a>
                    <a href="#highlights" className="block text-gray-600 hover:text-[#0569ff] transition-colors">
                        Highlights
                    </a>
                </nav>
            </div>
        </aside>
    );
}

// Feature Content Component
function FeatureContent({ sectionId }) {
    const content = featureContent[sectionId];

    if (!content) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-400">Select a feature from the sidebar</h2>
            </div>
        );
    }

    return (
        <article className="max-w-3xl">
            {/* Header */}
            <div id="overview" className="mb-10">
                <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-3">
                    {content.title}
                </h1>
                <p className="text-lg text-[#0569ff] font-medium mb-4">
                    {content.tagline}
                </p>
                <p className="text-gray-600 text-lg leading-relaxed">
                    {content.description}
                </p>
            </div>

            {/* Highlights Pills */}
            <div id="highlights" className="flex flex-wrap gap-2 mb-10">
                {content.highlights.map((highlight, index) => (
                    <span
                        key={index}
                        className="px-3 py-1 bg-[#0569ff]/10 text-[#0569ff] text-sm rounded-full font-medium"
                    >
                        {highlight}
                    </span>
                ))}
            </div>

            {/* Features Grid */}
            <div id="features" className="space-y-6">
                <h2 className="text-xl font-bold text-[#1a1a2e] border-b pb-3">
                    Key Features
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {content.features.map((feature, index) => (
                        <div
                            key={index}
                            className="p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#0569ff]/20 hover:shadow-sm transition-all"
                        >
                            <h3 className="font-semibold text-[#1a1a2e] mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div className="mt-12 p-6 bg-gradient-to-r from-[#0569ff] to-[#0450d4] rounded-2xl text-white">
                <h3 className="text-xl font-bold mb-2">Ready to get started?</h3>
                <p className="text-white/80 mb-4">
                    Experience {content.title} and more with a free demo.
                </p>
                <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 bg-white text-[#0569ff] px-6 py-3 rounded-full font-bold hover:bg-white/90 transition-colors"
                >
                    Request Demo
                    <ArrowRight size={18} />
                </Link>
            </div>
        </article>
    );
}

// Main Page Component
export default function FeaturesPage() {
    const [activeSection, setActiveSection] = useState('student-management');
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white">
            {/* <Header /> */}

            {/* Mobile Top Bar with Menu Button */}
            <div className="lg:hidden fixed top-16 left-0 right-0 z-50  bg-[#ffffffbf] backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    <Menu size={20} />
                </button>
                <span className="font-semibold text-[#1a1a2e] text-sm truncate">
                    {featureContent[activeSection]?.title || 'Features'}
                </span>
            </div>

            {/* Overlay for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <div className="flex pt-32 lg:pt-20">
                {/* Sidebar */}
                <Sidebar
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                    isMobileMenuOpen={isMobileMenuOpen}
                    setMobileMenuOpen={setMobileMenuOpen}
                />

                {/* Main Content */}
                <main className="flex-1 min-w-0 px-5 py-8 lg:px-12 lg:py-10">
                    <div className="flex gap-12">
                        <FeatureContent sectionId={activeSection} />
                        <OnThisPage content={featureContent[activeSection]} />
                    </div>
                </main>
            </div>
        </div>
    );
}
