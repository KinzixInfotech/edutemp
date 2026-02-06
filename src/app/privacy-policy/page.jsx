import React from 'react';

export default function PrivacyPolicy() {
    return (
        <div className="max-w-4xl mt-5 mx-auto px-4 py-16 text-gray-800">
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mb-6">
                Last updated: February 06, 2026
            </p>

            <p className="mb-6">
                This Privacy Policy explains how <strong>EduBreezy</strong>, operated by{" "}
                <strong>Kinzix Infotech</strong>, collects, uses, and protects your
                information when you use our application and services.
            </p>

            {/* SECTION */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                1. Interpretation and Definitions
            </h2>

            <ul className="list-disc pl-6 space-y-2 mb-6">
                <li>
                    <strong>Account:</strong> A unique account created to access the Service.
                </li>
                <li>
                    <strong>Application:</strong> EduBreezy mobile application.
                </li>
                <li>
                    <strong>Company:</strong> Kinzix Infotech, Katkamdag, Hazaribagh, Jharkhand, India.
                </li>
                <li>
                    <strong>Device:</strong> Any device such as a mobile phone or tablet.
                </li>
                <li>
                    <strong>Personal Data:</strong> Information that identifies an individual.
                </li>
            </ul>

            {/* SECTION */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                2. Information We Collect
            </h2>

            <h3 className="font-medium mt-4 mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>School-related details (class, section, role)</li>
            </ul>

            <h3 className="font-medium mt-4 mb-2">Usage Data</h3>
            <ul className="list-disc pl-6 space-y-2 mb-6">
                <li>Device type and OS</li>
                <li>IP address</li>
                <li>App activity and diagnostics</li>
            </ul>

            {/* SECTION */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2 mb-6">
                <li>To provide and maintain the Service</li>
                <li>To manage user accounts</li>
                <li>To support school administration</li>
                <li>To improve security and performance</li>
                <li>To comply with legal obligations</li>
            </ul>

            {/* SECTION */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                4. Data Sharing
            </h2>
            <p className="mb-4">
                We do not sell personal data. Data may be shared only with:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-6">
                <li>Authorized school authorities</li>
                <li>Trusted service providers</li>
                <li>Legal authorities when required by law</li>
            </ul>

            {/* SECTION */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                5. Children’s Privacy
            </h2>
            <p className="mb-6">
                EduBreezy is designed for schools and may process data of children under
                13 strictly for educational purposes. Data is collected only with school
                and parental authorization. We do not display ads or perform tracking
                for advertising.
            </p>

            {/* SECTION */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                6. Data Retention
            </h2>
            <p className="mb-6">
                Personal data is retained only as long as required to provide services,
                comply with school policies, or meet legal obligations.
            </p>

            {/* SECTION */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                7. Data Security
            </h2>
            <p className="mb-6">
                We implement reasonable technical and administrative measures to protect
                your data. However, no digital system is completely secure.
            </p>

            {/* SECTION */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                8. User Rights
            </h2>
            <ul className="list-disc pl-6 space-y-2 mb-6">
                <li>Access your personal data</li>
                <li>Request correction or deletion</li>
                <li>Contact us for privacy-related concerns</li>
            </ul>

            {/* SECTION */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                9. Changes to This Policy
            </h2>
            <p className="mb-6">
                We may update this Privacy Policy periodically. Updates will be posted
                on this page with a revised date.
            </p>

            {/* SECTION */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                10. Contact Us
            </h2>
            <p className="mb-2">If you have any questions, contact us:</p>
            <ul className="list-disc pl-6">
                <li>Company: Kinzix Infotech</li>
                <li>Phone: +91 94715 32682</li>
                <li>Location: Katkamdag, Hazaribagh, Jharkhand, India</li>
            </ul>
        </div>
    );
}
