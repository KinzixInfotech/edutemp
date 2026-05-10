'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { DEFAULT_EMAIL_TEMPLATE_FIELDS, buildEmailPreviewTemplates } from '@/emails/template-preview-registry';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle2, Eye, Loader2, Mail, Monitor, Send, ShieldCheck, Smartphone } from 'lucide-react';

const PREVIEW_ORIGIN = 'https://edubreezy.com';
const TEST_EMAIL_STORAGE_KEY = 'edubreezy:last-email-template-test-recipient';

const FIELD_GROUPS = [
  {
    title: 'Welcome Email Fields',
    fields: [
      ['recipientName', 'Recipient name'],
      ['recipientRole', 'Recipient role'],
      ['schoolName', 'School name'],
      ['schoolEmail', 'School email'],
      ['schoolPhone', 'School phone'],
      ['schoolLocation', 'School address'],
      ['schoolCity', 'City'],
      ['schoolState', 'State'],
      ['schoolCountry', 'Country'],
      ['directorName', 'Director name'],
      ['principalName', 'Principal name'],
      ['plan', 'ERP plan'],
      ['includedCapacity', 'Included capacity'],
      ['yearlyAmount', 'Yearly billing'],
      ['schoolCode', 'School code'],
    ],
  },
  {
    title: 'Contact Email Fields',
    fields: [
      ['contactName', 'Contact name'],
      ['contactEmail', 'Contact email'],
      ['contactPhone', 'Contact phone'],
      ['contactRole', 'Contact role'],
      ['studentCount', 'Student count'],
      ['demoPreferred', 'Demo time'],
    ],
  },
];

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || ''}`,
  };
}

export default function SuperAdminEmailConfigurationPage() {
  const { fullUser } = useAuth();
  const [selectedTemplateId, setSelectedTemplateId] = useState('school-welcome');
  const [previewMode, setPreviewMode] = useState('desktop');
  const [templateFields, setTemplateFields] = useState(DEFAULT_EMAIL_TEMPLATE_FIELDS);
  const [testEmail, setTestEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(TEST_EMAIL_STORAGE_KEY) || '';
  });
  const [isSendingTest, setIsSendingTest] = useState(false);

  const previewOrigin = typeof window === 'undefined' ? PREVIEW_ORIGIN : window.location.origin;
  const templates = useMemo(
    () => buildEmailPreviewTemplates({ fields: templateFields, origin: previewOrigin }),
    [previewOrigin, templateFields]
  );
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0];
  const canAccess = fullUser?.role?.name === 'SUPER_ADMIN';

  const updateTemplateField = (key, value) => {
    setTemplateFields((current) => ({ ...current, [key]: value }));
  };

  const sendTestEmail = async () => {
    const recipient = testEmail.trim().toLowerCase();
    if (!recipient) {
      toast.error('Enter a test email first.');
      return;
    }

    setIsSendingTest(true);
    try {
      const response = await fetch('/api/super-admin/email-configuration/send-test', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          to: recipient,
          templateId: selectedTemplate.id,
          fields: templateFields,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send test email');
      }

      localStorage.setItem(TEST_EMAIL_STORAGE_KEY, recipient);
      toast.success(`Test email sent to ${recipient}`);
    } catch (error) {
      toast.error(error.message || 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            This page is only available for super admin users.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#0569ff] to-[#10B981] p-3 rounded-2xl shadow-sm">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Configuration</h1>
            <p className="text-sm text-muted-foreground">
              Preview every EduBreezy system email template before it goes out through Resend.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Superadmin only
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <Send className="h-3.5 w-3.5 text-blue-600" />
            Resend ready
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Created Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((template) => {
                const isSelected = selectedTemplate.id === template.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={cn(
                      'w-full rounded-lg border p-4 text-left transition-colors',
                      isSelected
                        ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
                        : 'border-border bg-background hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{template.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{template.audience}</div>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">
                        {template.status}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{template.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{template.type}</Badge>
                      {isSelected && (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Previewing
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send Test Mail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="test-email">
                  Test recipient
                </label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.target.value)}
                  placeholder="you@example.com"
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  The last successful test email is saved in this browser.
                </p>
              </div>
              <Button
                type="button"
                className="w-full gap-2"
                onClick={sendTestEmail}
                disabled={isSendingTest}
              >
                {isSendingTest ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Test Mail
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Preview Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {FIELD_GROUPS.map((group) => (
                <div key={group.title} className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.title}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {group.fields.map(([key, label]) => (
                      <div key={key} className="space-y-1.5">
                        <label className="text-sm font-medium" htmlFor={`field-${key}`}>
                          {label}
                        </label>
                        <Input
                          id={`field-${key}`}
                          value={templateFields[key] || ''}
                          onChange={(event) => updateTemplateField(key, event.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="field-contact-message">
                  Contact message
                </label>
                <Textarea
                  id="field-contact-message"
                  value={templateFields.contactMessage || ''}
                  onChange={(event) => updateTemplateField('contactMessage', event.target.value)}
                  className="min-h-28 resize-none text-sm leading-6"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Eye className="h-5 w-5 text-blue-600" />
                  {selectedTemplate.name}
                </CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  From: {selectedTemplate.from}
                </p>
              </div>
              <div className="flex rounded-lg border bg-muted/40 p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  onClick={() => setPreviewMode('desktop')}
                  className="gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  Desktop
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  onClick={() => setPreviewMode('mobile')}
                  className="gap-2"
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</div>
                <div className="mt-1 text-base font-semibold">{selectedTemplate.template.subject}</div>
              </div>

              <div className="overflow-auto rounded-xl border bg-slate-100 p-4 dark:bg-slate-950">
                <div
                  className={cn(
                    'mx-auto overflow-hidden rounded-xl bg-white shadow-sm transition-all',
                    previewMode === 'mobile' ? 'max-w-[390px]' : 'max-w-[760px]'
                  )}
                >
                  <iframe
                    title={`${selectedTemplate.name} email preview`}
                    srcDoc={selectedTemplate.template.html}
                    className={cn(
                      'block w-full border-0 bg-white',
                      previewMode === 'mobile' ? 'h-[760px]' : 'h-[820px]'
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plain Text Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                value={selectedTemplate.template.text}
                className="min-h-56 resize-none font-mono text-xs leading-6"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
