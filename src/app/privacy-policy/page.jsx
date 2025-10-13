// app/privacy/page.jsx
"use client";

import React from "react";

export default function PrivacyPolicyPage() {
    return (
        <div className="prose mx-auto max-w-4xl p-8">
            <h1>[SCHOOL_NAME] — Privacy Policy</h1>
            <p>
                <strong>Effective date:</strong> [EFFECTIVE_DATE]
            </p>

            <p>
                At <strong>[SCHOOL_NAME]</strong> ("we", "us", "our"), we take the privacy
                and security of personal data seriously. This Privacy Policy explains
                what personal information we collect when using our School Management
                System (the "Service"), how we use it, with whom we share it, and the
                rights and choices available to you.
            </p>

            <h2>1. Data Controller</h2>
            <p>
                The data controller for the Service is <strong>[SCHOOL_NAME]</strong>.
                For questions about this policy or our data practices, contact us at{" "}
                <a href={`mailto:${"[CONTACT_EMAIL]"}`}>{"[CONTACT_EMAIL]"}</a>.
            </p>

            <h2>2. Scope</h2>
            <p>
                This policy covers personal data collected from students, parents or
                guardians, teachers, staff, and other users of the Service. It applies
                to information collected through our website, mobile app, administrative
                portal, and related services.
            </p>

            <h2>3. Personal Data We Collect</h2>
            <p>We collect information necessary to provide the Service. Typical data:</p>
            <ul>
                <li>
                    <strong>Student data:</strong> name, date of birth, student ID,
                    class/grade, attendance records, enrollment information, academic
                    records, grades, behaviour records, medical/allergy notes (if
                    provided), assessment results, photographs for identification, and
                    other education-related information.
                </li>
                <li>
                    <strong>Parent / guardian data:</strong> name, relationship, contact
                    details (email, phone, address), emergency contacts, billing
                    information (if applicable).
                </li>
                <li>
                    <strong>Staff & teacher data:</strong> name, contact details, role,
                    qualifications, employment records, payroll identifiers (if used),
                    schedules and performance assessments.
                </li>
                <li>
                    <strong>Platform usage data:</strong> login credentials, IP addresses,
                    device information, usage logs, timestamps, and cookies or similar
                    technologies.
                </li>
                <li>
                    <strong>Optional data:</strong> uploaded files (assignments,
                    attachments), third-party integrations data (when authorized), and any
                    other information you or permitted users provide.
                </li>
            </ul>

            <h2>4. How We Use Personal Data</h2>
            <p>We use personal data to:</p>
            <ul>
                <li>Provide and maintain the Service and access control.</li>
                <li>Manage student enrollment, attendance, grades, timetables, and
                    school communications.</li>
                <li>Enable parents and guardians to view student progress and contact
                    teachers.</li>
                <li>Perform administrative tasks such as billing, scheduling, and
                    reporting.</li>
                <li>Send important notifications, alerts, and announcements.</li>
                <li>Improve and develop features, perform analytics, and monitor usage
                    for security and performance.</li>
                <li>Comply with legal obligations and protect the safety and rights of
                    users (including safeguarding duties).</li>
            </ul>

            <h2>5. Legal Bases for Processing</h2>
            <p>
                Where required by applicable law (for example, in the EU), we process
                personal data on the following legal bases:
            </p>
            <ul>
                <li>Performance of a contract (to provide the Service).</li>
                <li>Compliance with legal obligations (education, safeguarding, audit).</li>
                <li>Consent (for optional or sensitive processing where required).</li>
                <li>Legitimate interests (improving the Service, security, fraud
                    prevention), balanced against user rights.</li>
            </ul>

            <h2>6. Data Sharing & Disclosure</h2>
            <p>We may share personal data with:</p>
            <ul>
                <li>
                    <strong>Service providers:</strong> third-party vendors who perform
                    services on our behalf (hosting, email, analytics, payments). They
                    only receive the data necessary to perform their function and are
                    contractually required to protect it.
                </li>
                <li>
                    <strong>Education authorities & regulators:</strong> when required by
                    law, or to comply with reporting obligations.
                </li>
                <li>
                    <strong>Legal & safety:</strong> to respond to lawful requests by
                    public authorities, to prevent harm, or to enforce our policies.
                </li>
                <li>
                    <strong>Third parties with consent:</strong> when parents or guardians
                    explicitly authorize integrations (e.g., third-party learning tools).
                </li>
            </ul>

            <h2>7. Data Retention</h2>
            <p>
                We retain personal data only as long as necessary for the purposes
                described in this policy and in accordance with applicable legal and
                regulatory requirements. Retention periods vary by data type (e.g.,
                student records may be retained for several years after graduation or
                leaving, per local regulations). When no longer needed, we securely
                delete or anonymize data.
            </p>

            <h2>8. Security</h2>
            <p>
                We implement reasonable technical and organizational measures to protect
                personal data from unauthorized access, loss, or misuse. Measures may
                include encryption in transit, access controls, secure hosting,
                regular security assessments, and staff training. While we strive to
                protect data, no system is 100% secure—if a security incident occurs we
                will follow legal obligations for notification.
            </p>

            <h2>9. Cookies and Tracking</h2>
            <p>
                Our Service uses cookies and similar technologies for functionality,
                analytics, and performance. You can manage cookie preferences through
                your browser settings. Minimal cookies necessary for login and session
                management are required for the Service to function.
            </p>

            <h2>10. Cross-Border Transfers</h2>
            <p>
                Data may be stored and processed in servers located outside your country
                of residence. When transferring personal data across borders we will
                follow applicable legal safeguards (standard contractual clauses,
                privacy frameworks) or rely on legally permitted exceptions.
            </p>

            <h2>11. Third-Party Services & Integrations</h2>
            <p>
                We may offer integrations with third-party educational tools (LMS,
                assessment platforms, payment processors). Those services are managed
                by their own privacy policies. We recommend reviewing the privacy
                policies of any third-party services you enable.
            </p>

            <h2>12. Rights of Data Subjects</h2>
            <p>
                Depending on your jurisdiction, you may have rights including:
            </p>
            <ul>
                <li>Access to personal data we hold about you</li>
                <li>Correction of inaccurate data</li>
                <li>Deletion (right to be forgotten) where permitted</li>
                <li>Restriction or objection to processing</li>
                <li>Data portability (to obtain a copy in a machine-readable format)</li>
                <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p>
                To exercise your rights, contact us at{" "}
                <a href={`mailto:${"[CONTACT_EMAIL]"}`}>{"[CONTACT_EMAIL]"}</a>. We may
                need to verify your identity before fulfilling requests.
            </p>

            <h2>13. Processing of Minors</h2>
            <p>
                Our Service is intended to be used for educational purposes by schools
                and authorized users. We take special care with data relating to minors
                (students). Where required by law, parental consent may be obtained for
                certain processing activities.
            </p>

            <h2>14. Changes to this Privacy Policy</h2>
            <p>
                We may update this Privacy Policy from time to time. When we make
                material changes we will notify affected users by posting the updated
                policy and changing the "Effective date" above. Please review this page
                periodically.
            </p>

            <h2>15. Contact Us</h2>
            <p>
                If you have questions, concerns, or requests related to privacy, please
                contact:
            </p>
            <p>
                <strong>{"[SCHOOL_NAME]"}</strong>
                <br />
                Email: <a href={`mailto:${"[CONTACT_EMAIL]"}`}>{"[CONTACT_EMAIL]"}</a>
                <br />
                Address: {"[SCHOOL_ADDRESS]"} (optional)
            </p>

            <h2>16. Legal & Regulatory Notes</h2>
            <p>
                This policy is intended as a general statement of our privacy practices.
                It does not create contractual rights. Where local privacy or education
                laws impose specific obligations (for example FERPA in the U.S., GDPR in
                the EU, or similar), this policy will be read in conjunction with those
                legal requirements.
            </p>

            <p>
                <em>
                    Last updated: <strong>{'[EFFECTIVE_DATE]'}</strong>
                </em>
            </p>
        </div>
    );
}
