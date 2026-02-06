import React from 'react';

export default function DataDeletion() {
    return (
        <div className="max-w-4xl mt-5 mx-auto px-4 py-16 text-gray-800">
            <h1 className="text-3xl font-bold mb-2">User Data Deletion Request</h1>
            <p className="text-sm text-gray-500 mb-6">
                Last updated: February 06, 2026
            </p>

            <p className="mb-6">
                This page explains how users of the <strong>EduBreezy</strong> app can request deletion of their personal data.
            </p>

            {/* HOW TO REQUEST */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                How to Request Data Deletion
            </h2>
            <p className="mb-4">
                To request deletion of your personal data associated with your EduBreezy account, please send an email to:
            </p>
            <p className="mb-6 text-lg font-medium text-blue-600">
                📧 support@edubreezy.com
            </p>
            <p className="mb-2">Please include the following details in your request:</p>
            <ul className="list-disc pl-6 space-y-2 mb-6">
                <li>Registered email address or phone number</li>
                <li>App name: <strong>EduBreezy</strong></li>
                <li>Subject line: <strong>Data Deletion Request</strong></li>
            </ul>
            <p className="mb-6">
                We will process and complete your request within <strong>7–14 working days</strong> after verification.
            </p>

            {/* DATA DELETED */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                Data That Will Be Deleted
            </h2>
            <ul className="list-disc pl-6 space-y-2 mb-6">
                <li>Account information (name, email, phone number)</li>
                <li>App usage data</li>
                <li>Location data, if collected</li>
            </ul>

            {/* DATA RETAINED */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                Data That May Be Retained
            </h2>
            <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Records required for legal or regulatory compliance</li>
                <li>Security and audit logs</li>
            </ul>
            <p className="mb-6 text-gray-600">
                Any retained data will be stored securely and not used for any other purpose.
            </p>

            {/* CONTACT */}
            <h2 className="text-xl font-semibold mt-10 mb-3">
                Contact Us
            </h2>
            <p className="mb-2">For questions regarding data deletion, contact:</p>
            <ul className="list-disc pl-6">
                <li>Email: <a href="mailto:support@edubreezy.com" className="text-blue-600 hover:underline">support@edubreezy.com</a></li>
                <li>Company: Kinzix Infotech</li>
                <li>Location: Katkamdag, Hazaribagh, Jharkhand, India</li>
            </ul>
        </div>
    );
}
