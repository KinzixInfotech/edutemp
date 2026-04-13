import React from 'react';

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mt-25 mx-auto px-4 py-16 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-6">
        Last updated: March 7, 2026
      </p>

      <p className="mb-6">
        These Terms of Service govern your use of <strong>EduBreezy</strong>, operated by{" "}
        <strong>Kinzix Infotech</strong>. By accessing or using our application and
        services, you agree to be bound by these Terms. Please read them carefully before
        using the platform.
      </p>

      {/* SECTION 1 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        1. Interpretation and Definitions
      </h2>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>
          <strong>Application:</strong> EduBreezy, the mobile and web-based school ERP platform.
        </li>
        <li>
          <strong>Company:</strong> Kinzix Infotech, Katkamdag, Hazaribagh, Jharkhand, India.
        </li>
        <li>
          <strong>User:</strong> Any individual (student, parent, teacher, staff, or administrator)
          who accesses or uses the Application.
        </li>
        <li>
          <strong>School:</strong> The educational institution that has subscribed to and
          administers EduBreezy for its users.
        </li>
        <li>
          <strong>Service:</strong> All features and functionality provided through the Application,
          including attendance, examination, fee management, calendar, bus tracking, and
          push notifications.
        </li>
        <li>
          <strong>Account:</strong> A unique profile created for a User to access the Service.
        </li>
      </ul>

      {/* SECTION 2 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        2. Eligibility and Account Registration
      </h2>
      <p className="mb-4">
        EduBreezy is intended for use by authorized school communities — including students,
        parents, teachers, and administrative staff. To access the Service, you must:
      </p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Be registered by an authorized school administrator.</li>
        <li>Provide accurate and complete information during account setup.</li>
        <li>Keep your login credentials confidential and not share them with others.</li>
        <li>Notify the school or Kinzix Infotech immediately of any unauthorized use of your account.</li>
      </ul>
      <p className="mb-6">
        Accounts for minors (students under 18) are managed by the school and, where applicable,
        with parental or guardian authorization. Kinzix Infotech is not responsible for
        unauthorized access resulting from a User's failure to secure their credentials.
      </p>

      {/* SECTION 3 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        3. Use of the Service
      </h2>
      <p className="mb-4">
        You agree to use EduBreezy only for lawful, educational, and school-administrative
        purposes. You must not:
      </p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Use the Service to harass, threaten, or harm any individual.</li>
        <li>Attempt to gain unauthorized access to any part of the Application or its infrastructure.</li>
        <li>Upload or transmit harmful, misleading, or inappropriate content.</li>
        <li>Reverse-engineer, decompile, or otherwise attempt to extract the source code of the Application.</li>
        <li>Use the Service in any way that could damage, disable, or impair its performance.</li>
        <li>Misuse push notifications, calendar events, or communication tools for spam or unsolicited messaging.</li>
      </ul>

      {/* SECTION 4 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        4. School Responsibilities
      </h2>
      <p className="mb-4">
        When a school subscribes to EduBreezy, the school (as an institution) takes on the
        following responsibilities:
      </p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Ensuring that all registered users are legitimate members of the school community.</li>
        <li>Obtaining necessary consent from parents or guardians for student data processing.</li>
        <li>Properly managing user roles and permissions within the platform.</li>
        <li>Ensuring that data entered into the system — including student records, attendance,
          exam results, and fees — is accurate and up to date.</li>
        <li>Complying with applicable data protection laws in their jurisdiction.</li>
      </ul>

      {/* SECTION 5 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        5. Features and Functionality
      </h2>
      <p className="mb-4">
        EduBreezy provides the following features, subject to the subscription plan of the school:
      </p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li><strong>Attendance Management:</strong> Track and report student and staff attendance.</li>
        <li><strong>Examination & Results:</strong> Manage exam schedules, grades, and report cards.</li>
        <li><strong>Fee Management:</strong> Track fee dues, payments, and generate receipts.</li>
        <li><strong>School Calendar:</strong> Create and manage events, holidays, and school activities,
          with optional Google Calendar sync.</li>
        <li><strong>Bus Tracking:</strong> Real-time GPS tracking of school transportation for
          student safety.</li>
        <li><strong>Push Notifications:</strong> Send targeted announcements to students, parents,
          teachers, or staff.</li>
        <li><strong>Communication Tools:</strong> Facilitate school-to-parent and staff communication.</li>
      </ul>
      <p className="mb-6">
        Kinzix Infotech reserves the right to modify, update, or discontinue any feature at any
        time, with reasonable prior notice where practicable.
      </p>

      {/* SECTION 6 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        6. Google Calendar Integration
      </h2>
      <p className="mb-4">
        EduBreezy offers optional integration with Google Calendar. By connecting your Google
        account, you authorize EduBreezy to:
      </p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Sync school calendar events to your connected Google Calendar.</li>
        <li>Access only the calendar scopes necessary to provide this feature.</li>
      </ul>
      <p className="mb-6">
        You may disconnect Google Calendar at any time from your account settings. EduBreezy's
        use of Google user data complies with Google's API Services User Data Policy.
      </p>

      {/* SECTION 7 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        7. Push Notifications
      </h2>
      <p className="mb-6">
        EduBreezy may send push notifications for school events, fee reminders, exam schedules,
        and announcements. Notifications are sent only to the target audience defined by
        authorized school administrators (e.g., students, parents, teachers, or all staff).
        Users may manage notification preferences through their device settings. Disabling
        notifications may result in missed important school communications.
      </p>

      {/* SECTION 8 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        8. Location Services
      </h2>
      <p className="mb-4">
        Certain features, such as live bus tracking, require access to device location.
        By enabling location permissions, you agree that:
      </p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Location data may be collected in the foreground or background as needed for
          transportation and safety features.</li>
        <li>Background location is used exclusively for continuous tracking required by
          bus driver and route management roles.</li>
        <li>Location data is not used for advertising or sold to third parties.</li>
      </ul>
      <p className="mb-6">
        Users may revoke location permissions at any time through device settings. Revoking
        location access will disable features that depend on it.
      </p>

      {/* SECTION 9 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        9. Intellectual Property
      </h2>
      <p className="mb-6">
        All content, design, code, branding, and technology within EduBreezy — including but
        not limited to the application interface, logos, and feature design — is the exclusive
        property of Kinzix Infotech and is protected by applicable intellectual property laws.
        You may not copy, reproduce, distribute, or create derivative works from any part of
        the Service without prior written permission from Kinzix Infotech.
      </p>

      {/* SECTION 10 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        10. Privacy
      </h2>
      <p className="mb-6">
        Your use of EduBreezy is also governed by our{" "}
        <a href="/privacy-policy" className="text-blue-600 underline">Privacy Policy</a>,
        which is incorporated into these Terms by reference. By using the Service,
        you consent to the collection and use of your information as described in the
        Privacy Policy.
      </p>

      {/* SECTION 11 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        11. Children's Data
      </h2>
      <p className="mb-6">
        EduBreezy is a school management platform and may process personal data of children
        under 13 strictly for educational and administrative purposes, with authorization
        from the school and parents or guardians. We do not display advertisements, conduct
        behavioral tracking for commercial purposes, or share children's data with unauthorized
        third parties.
      </p>

      {/* SECTION 12 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        12. Disclaimer of Warranties
      </h2>
      <p className="mb-6">
        EduBreezy is provided on an "as is" and "as available" basis. Kinzix Infotech makes
        no warranties, express or implied, regarding the Service, including but not limited to
        warranties of merchantability, fitness for a particular purpose, or uninterrupted
        availability. We do not guarantee that the Service will be error-free, secure, or
        free from technical disruptions at all times.
      </p>

      {/* SECTION 13 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        13. Limitation of Liability
      </h2>
      <p className="mb-6">
        To the maximum extent permitted by law, Kinzix Infotech shall not be liable for any
        indirect, incidental, special, or consequential damages arising from your use of or
        inability to use the Service, including loss of data, unauthorized access to your
        account, or service interruptions. Our total liability for any claim related to the
        Service shall not exceed the amount paid by the school for the applicable subscription
        period.
      </p>

      {/* SECTION 14 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        14. Termination
      </h2>
      <p className="mb-4">
        Kinzix Infotech reserves the right to suspend or terminate access to the Service, with
        or without notice, if a User or School:
      </p>
      <ul className="list-disc pl-6 space-y-2 mb-6">
        <li>Violates any provision of these Terms.</li>
        <li>Engages in conduct that is harmful to other users or the platform.</li>
        <li>Fails to pay applicable subscription fees.</li>
      </ul>
      <p className="mb-6">
        Upon termination, the school's access and all associated user accounts will be
        deactivated. Data retention after termination is governed by our Privacy Policy and
        applicable agreements with the school.
      </p>

      {/* SECTION 15 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        15. Governing Law
      </h2>
      <p className="mb-6">
        These Terms shall be governed by and construed in accordance with the laws of India.
        Any disputes arising out of or related to these Terms or the use of EduBreezy shall
        be subject to the exclusive jurisdiction of the courts located in Jharkhand, India.
      </p>

      {/* SECTION 16 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        16. Changes to These Terms
      </h2>
      <p className="mb-6">
        Kinzix Infotech may update these Terms of Service from time to time. When changes are
        made, the updated Terms will be posted on this page with a revised date. Continued use
        of the Service after such changes constitutes your acceptance of the updated Terms.
        We encourage users to review this page periodically.
      </p>

      {/* SECTION 17 */}
      <h2 className="text-xl font-semibold mt-10 mb-3">
        17. Contact Us
      </h2>
      <p className="mb-2">
        If you have any questions or concerns about these Terms of Service, please contact us:
      </p>
      <ul className="list-disc pl-6">
        <li>Company: Kinzix Infotech</li>
        <li>Phone: +91 94715 32682</li>
        <li>Location: Katkamdag, Hazaribagh, Jharkhand, India</li>
      </ul>
    </div>
  );
}