'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Shield, ShieldCheck, ShieldOff, Loader2, KeyRound, Copy, Download,
    CheckCircle2, AlertTriangle, Lock, Info
} from 'lucide-react';

export default function SecuritySettingsPage() {
    const [loading, setLoading] = useState(true);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [step, setStep] = useState('status'); // status | setup-qr | setup-backup | disable-confirm
    const [qrCode, setQrCode] = useState('');
    const [manualKey, setManualKey] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [backupCodes, setBackupCodes] = useState([]);
    const [disablePassword, setDisablePassword] = useState('');
    const [disableTotpCode, setDisableTotpCode] = useState('');
    const [disableLoading, setDisableLoading] = useState(false);
    const [showManualKey, setShowManualKey] = useState(false);
    const codeInputRef = useRef(null);

    useEffect(() => {
        fetchStatus();
    }, []);

    const getAuthHeaders = async () => {
        const { data } = await supabase.auth.getSession();
        return {
            Authorization: `Bearer ${data.session?.access_token}`,
            'Content-Type': 'application/json',
        };
    };

    const fetchStatus = async () => {
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/auth/2fa/status', { headers });
            const data = await res.json();
            setTwoFactorEnabled(data.twoFactorEnabled || false);
        } catch {
            toast.error('Failed to fetch 2FA status');
        } finally {
            setLoading(false);
        }
    };

    // ─── Enable Flow ───────────────────────────────────
    const startSetup = async () => {
        setVerifyLoading(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/auth/2fa/setup', { method: 'POST', headers });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error);
                return;
            }

            setQrCode(data.qrCode);
            setManualKey(data.manualKey);
            setStep('setup-qr');
            setTimeout(() => codeInputRef.current?.focus(), 200);
        } catch (err) {
            toast.error('Failed to start 2FA setup');
        } finally {
            setVerifyLoading(false);
        }
    };

    const verifySetup = async (e) => {
        e.preventDefault();
        if (!verifyCode || verifyCode.length !== 6) return;
        setVerifyLoading(true);

        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/auth/2fa/verify-setup', {
                method: 'POST',
                headers,
                body: JSON.stringify({ code: verifyCode }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setBackupCodes(data.backupCodes);
                setTwoFactorEnabled(true);
                setStep('setup-backup');
                toast.success('2FA enabled successfully!');
            } else {
                toast.error(data.error || 'Invalid code');
                setVerifyCode('');
                codeInputRef.current?.focus();
            }
        } catch (err) {
            toast.error('Verification failed');
        } finally {
            setVerifyLoading(false);
        }
    };

    // ─── Disable Flow ──────────────────────────────────
    const handleDisable = async (e) => {
        e.preventDefault();
        if (!disablePassword && !disableTotpCode) return;
        setDisableLoading(true);

        try {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/auth/2fa/disable', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    password: disablePassword || undefined,
                    totpCode: disableTotpCode || undefined,
                }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setTwoFactorEnabled(false);
                setStep('status');
                setDisablePassword('');
                setDisableTotpCode('');
                toast.success('2FA has been disabled.');
            } else {
                toast.error(data.error || 'Failed to disable 2FA');
            }
        } catch {
            toast.error('Failed to disable 2FA');
        } finally {
            setDisableLoading(false);
        }
    };

    // ─── Helpers ────────────────────────────────────────
    const copyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        toast.success('Backup codes copied to clipboard');
    };

    const downloadBackupCodes = () => {
        const content = `EduBreezy 2FA Backup Codes\n${'─'.repeat(30)}\n\n${backupCodes.join('\n')}\n\n⚠️ Each code can only be used once.\n   Store these in a safe place.`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edubreezy-2fa-backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Backup codes downloaded');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-full mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Shield className="h-6 w-6" />
                    Security Settings
                </h1>
                <p className="text-muted-foreground">
                    Manage your account security preferences.
                </p>
            </div>

            <Separator />

            {/* 2FA Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                {twoFactorEnabled ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                                Two-Factor Authentication
                            </CardTitle>
                            <CardDescription>
                                Add an extra layer of security using a TOTP authenticator app.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className={`gap-1.5 px-3 py-1.5 ${twoFactorEnabled
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'
                            : 'bg-muted text-muted-foreground'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${twoFactorEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                            <span className="text-xs">{twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* ─── Status View ─── */}
                    {step === 'status' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg border bg-muted/30">
                                <div className="flex gap-3">
                                    <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div className="space-y-1 text-sm">
                                        <p className="text-muted-foreground">
                                            {twoFactorEnabled
                                                ? "Your account is protected with TOTP-based two-factor authentication. You'll be asked for a verification code from your authenticator app each time you log in."
                                                : "Enable two-factor authentication to protect your admin account. You'll need an authenticator app like Google Authenticator or Authy."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                {twoFactorEnabled ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => setStep('disable-confirm')}
                                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    >
                                        <ShieldOff className="h-4 w-4" />
                                        Disable 2FA
                                    </Button>
                                ) : (
                                    <Button onClick={startSetup} disabled={verifyLoading}>
                                        {verifyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                        Enable 2FA
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ─── Setup QR Step ─── */}
                    {step === 'setup-qr' && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                                <div className="flex gap-3">
                                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to verify.
                                    </p>
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="bg-white p-4 rounded-lg border">
                                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowManualKey(!showManualKey)}
                                    className="text-xs text-primary hover:underline font-medium"
                                >
                                    {showManualKey ? 'Hide manual key' : "Can't scan? Enter key manually"}
                                </button>

                                {showManualKey && (
                                    <div className="w-full p-4 rounded-lg border bg-muted/30">
                                        <Label className="text-xs">Manual Entry Key</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <code className="text-sm font-mono break-all flex-1">{manualKey}</code>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 shrink-0"
                                                onClick={() => { navigator.clipboard.writeText(manualKey); toast.success('Key copied'); }}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Verify Code */}
                            <form onSubmit={verifySetup} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Verification Code</Label>
                                    <Input
                                        ref={codeInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="000000"
                                        maxLength={6}
                                        className="text-center font-mono text-lg tracking-[0.3em]"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                                        autoComplete="one-time-code"
                                    />
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => { setStep('status'); setVerifyCode(''); setQrCode(''); }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={verifyLoading || verifyCode.length !== 6}>
                                        {verifyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                        Verify & Enable
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ─── Backup Codes Step ─── */}
                    {step === 'setup-backup' && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                                <div className="flex gap-3">
                                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                                    <div className="space-y-1 text-sm">
                                        <p className="font-medium text-yellow-900 dark:text-yellow-200">Save your backup codes</p>
                                        <p className="text-yellow-700 dark:text-yellow-300">
                                            These codes will only be shown <strong>once</strong>. Store them safely — you'll need them if you lose access to your authenticator app.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-lg border bg-muted/30">
                                <div className="grid grid-cols-2 gap-2">
                                    {backupCodes.map((code, i) => (
                                        <div key={i} className="bg-background rounded-md px-3 py-2 text-center font-mono text-sm border">
                                            {code}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={copyBackupCodes} className="flex-1">
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy All
                                </Button>
                                <Button variant="outline" onClick={downloadBackupCodes} className="flex-1">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                </Button>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={() => setStep('status')}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    I've saved my backup codes
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ─── Disable Confirmation ─── */}
                    {step === 'disable-confirm' && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                                <div className="flex gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        Disabling 2FA will make your account less secure. Please confirm by entering your password or a TOTP code.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleDisable} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Lock className="h-4 w-4 text-muted-foreground" />
                                        Password
                                    </Label>
                                    <Input
                                        type="password"
                                        placeholder="Enter your password"
                                        value={disablePassword}
                                        onChange={(e) => setDisablePassword(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-border" />
                                    <span className="text-xs text-muted-foreground font-medium">OR</span>
                                    <div className="flex-1 h-px bg-border" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                                        TOTP Code
                                    </Label>
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="000000"
                                        maxLength={6}
                                        className="font-mono text-center text-lg tracking-[0.3em]"
                                        value={disableTotpCode}
                                        onChange={(e) => setDisableTotpCode(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => { setStep('status'); setDisablePassword(''); setDisableTotpCode(''); }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={disableLoading || (!disablePassword && !disableTotpCode)}
                                        variant="destructive"
                                    >
                                        {disableLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldOff className="mr-2 h-4 w-4" />}
                                        Disable 2FA
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
