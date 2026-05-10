import { buildContactAdminNotificationTemplate, buildContactThankYouTemplate } from '@/emails/contact-thank-you-template';
import { buildSchoolWelcomeTemplate } from '@/emails/school-welcome-template';

export const DEFAULT_EMAIL_TEMPLATE_FIELDS = {
  recipientName: 'Ananya Mehra',
  recipientRole: 'Director',
  schoolName: 'Sunrise International School',
  schoolEmail: 'office@sunrise.edu',
  schoolPhone: '+91 98765 12000',
  schoolLocation: 'MG Road Campus',
  schoolCity: 'Bengaluru',
  schoolState: 'Karnataka',
  schoolCountry: 'India',
  directorName: 'Ananya Mehra',
  principalName: 'Rohit Sharma',
  plan: 'PRO',
  includedCapacity: '500 students',
  yearlyAmount: 'INR 60,000',
  schoolCode: 'SUNRISE',
  contactName: 'Priya Kapoor',
  contactEmail: 'priya@sunrise.edu',
  contactPhone: '+91 98765 43210',
  contactRole: 'School Owner',
  studentCount: '850',
  demoPreferred: 'Tomorrow, 11:30 AM',
  contactMessage: 'We want to explore EduBreezy for admissions, fee collection, attendance, documents, and parent communication.',
};

function mergeFields(fields = {}) {
  return {
    ...DEFAULT_EMAIL_TEMPLATE_FIELDS,
    ...Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
    ),
  };
}

export function buildEmailPreviewTemplates({ fields, origin }) {
  const data = mergeFields(fields);
  const baseOrigin = origin || 'https://edubreezy.com';

  const welcomeTemplate = buildSchoolWelcomeTemplate({
    recipientName: data.recipientName,
    recipientRole: data.recipientRole,
    schoolName: data.schoolName,
    schoolEmail: data.schoolEmail,
    schoolLogoUrl: `${baseOrigin}/school_exp.png`,
    schoolCode: data.schoolCode,
    schoolPhone: data.schoolPhone,
    schoolLocation: data.schoolLocation,
    schoolCity: data.schoolCity,
    schoolState: data.schoolState,
    schoolCountry: data.schoolCountry,
    directorName: data.directorName,
    principalName: data.principalName,
    loginUrl: `${baseOrigin}/login`,
    schoolUrl: `${baseOrigin}/login?schoolCode=${encodeURIComponent(data.schoolCode || 'SCHOOL')}`,
    plan: data.plan,
    includedCapacity: data.includedCapacity,
    yearlyAmount: data.yearlyAmount,
    origin: baseOrigin,
  });

  const contactThankYouTemplate = buildContactThankYouTemplate({
    name: data.contactName,
    schoolName: data.schoolName,
    role: data.contactRole,
    demoPreferred: data.demoPreferred,
    origin: baseOrigin,
  });

  const contactAdminTemplate = buildContactAdminNotificationTemplate({
    name: data.contactName,
    email: data.contactEmail,
    phone: data.contactPhone,
    schoolName: data.schoolName,
    role: data.contactRole,
    studentCount: data.studentCount,
    demoPreferred: data.demoPreferred,
    message: data.contactMessage,
  });

  return [
    {
      id: 'school-welcome',
      name: 'School Welcome',
      type: 'Onboarding',
      status: 'Active',
      audience: 'Director, principal, school inbox',
      from: 'EduBreezy <hello@edubreezy.com>',
      description: 'Sent automatically after a school is fully created from the superadmin create-school flow.',
      template: welcomeTemplate,
    },
    {
      id: 'contact-thank-you',
      name: 'Contact Thank You',
      type: 'Lead',
      status: 'Active',
      audience: 'Website enquiry sender',
      from: 'EduBreezy default sender',
      description: 'Sent to people who submit the public EduBreezy contact/demo form.',
      template: contactThankYouTemplate,
    },
    {
      id: 'contact-admin-alert',
      name: 'Contact Admin Alert',
      type: 'Internal',
      status: 'Active',
      audience: 'EduBreezy sales/support inbox',
      from: 'EduBreezy default sender',
      description: 'Internal alert for new public contact submissions and demo enquiries.',
      template: contactAdminTemplate,
    },
  ];
}

export function getEmailPreviewTemplate({ templateId, fields, origin }) {
  const templates = buildEmailPreviewTemplates({ fields, origin });
  return templates.find((template) => template.id === templateId) || templates[0];
}
