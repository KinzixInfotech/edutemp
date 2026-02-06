import React from 'react';

export default function DeleteAccount() {
    return (
        <div className="max-w-4xl mt-5 mx-auto px-4 py-16 text-gray-800">
            {/* 1️⃣ Clear Title */}
            <h1 className="text-3xl font-bold mb-6">Delete Your EduBreezy Account</h1>

            {/* 2️⃣ App + Company Identity */}
            <p className="mb-6 text-gray-700">
                This page explains how users of the <strong>EduBreezy</strong> mobile application,
                developed by <strong>Kinzix Infotech (India)</strong>, can request deletion of their
                account and associated data.
            </p>

            {/* 3️⃣ Who Can Request Deletion */}
            <h2 className="text-xl font-semibold mt-10 mb-3">Who Can Request Deletion</h2>
            <p className="mb-6">
                Account deletion can be requested by the <strong>account owner</strong> or an
                <strong> authorized school administrator</strong>.
            </p>

            {/* 4️⃣ Steps to Delete Account */}
            <h2 className="text-xl font-semibold mt-10 mb-3">How to Request Account Deletion</h2>
            <p className="mb-4 font-medium">Option 1: Through the App</p>
            <ol className="list-decimal pl-6 space-y-2 mb-6">
                <li>Log in to your EduBreezy account</li>
                <li>Go to <strong>Profile → Account Settings</strong></li>
                <li>Select <strong>"Delete Account"</strong></li>
                <li>Confirm your request</li>
            </ol>

            <p className="mb-4 font-medium">Option 2: Via Email</p>
            <p className="mb-6">
                Send an email to <a href="mailto:support@edubreezy.com" className="text-blue-600 hover:underline font-medium">support@edubreezy.com</a> from
                your registered email address with the subject: <strong>"Account Deletion Request"</strong>
            </p>

            {/* 5️⃣ What Data WILL Be Deleted */}
            <h2 className="text-xl font-semibold mt-10 mb-3">Data That Will Be Deleted</h2>
            <p className="mb-4">
                When your account is deleted, the following data is <strong>permanently removed</strong>:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-6">
                <li>Name and profile information</li>
                <li>Email address and phone number</li>
                <li>Login credentials</li>
                <li>School or user profile data</li>
                <li>Usage data linked to your account</li>
            </ul>

            {/* 6️⃣ What Data May Be Retained */}
            <h2 className="text-xl font-semibold mt-10 mb-3">Data That May Be Retained</h2>
            <p className="mb-6">
                Some data may be retained for <strong>legal, accounting, or compliance purposes</strong> for
                up to 90 days, after which it is permanently deleted.
            </p>

            {/* 7️⃣ Deletion Timeline */}
            <h2 className="text-xl font-semibold mt-10 mb-3">Deletion Timeline</h2>
            <p className="mb-6">
                Account deletion requests are processed within <strong>7–14 business days</strong>.
            </p>

            {/* 8️⃣ Contact Information */}
            <h2 className="text-xl font-semibold mt-10 mb-3">Contact Us</h2>
            <p className="mb-4">For questions or deletion requests, contact:</p>
            <ul className="space-y-2 mb-6">
                <li>📧 Email: <a href="mailto:support@edubreezy.com" className="text-blue-600 hover:underline">support@edubreezy.com</a></li>
                <li>📞 Phone: <a href="tel:+919471532682" className="text-blue-600 hover:underline">+91 94715 32682</a></li>
            </ul>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500">
                <p>Kinzix Infotech • Katkamdag, Hazaribagh, Jharkhand, India</p>
            </div>
        </div>
    );
}
