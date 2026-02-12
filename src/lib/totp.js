import { generateSecret as otpGenerateSecret, verify, generateURI } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

// ─── Configuration ────────────────────────────────────────────
const APP_NAME = 'EduBreezy';
const BACKUP_CODE_COUNT = 8;

// AES-256-GCM encryption key from env (32-byte hex = 64 chars)
function getEncryptionKey() {
    const key = process.env.TOTP_ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error('TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    return Buffer.from(key, 'hex');
}

// ─── Secret Generation ───────────────────────────────────────
export function generateSecret() {
    return otpGenerateSecret();
}

// ─── QR Code Generation ──────────────────────────────────────
export async function generateQRCode(email, secret) {
    const otpauthUrl = generateURI({
        issuer: APP_NAME,
        label: email,
        secret,
    });
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { qrDataUrl, otpauthUrl, manualKey: secret };
}

// ─── TOTP Verification (async — otplib v13 is async-first) ───
// NOTE: verify() returns { valid: boolean, delta, epoch, timeStep }, NOT a plain boolean
export async function verifyToken(secret, token) {
    try {
        const result = await verify({ secret, token });
        return result?.valid === true;
    } catch {
        return false;
    }
}

// ─── Encryption / Decryption ─────────────────────────────────
export function encryptSecret(plaintext) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSecret(ciphertext) {
    const key = getEncryptionKey();
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// ─── Backup Codes ────────────────────────────────────────────
export function generateBackupCodes(count = BACKUP_CODE_COUNT) {
    const codes = [];
    const hashedCodes = [];

    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
        hashedCodes.push(hashBackupCode(code));
    }

    return { codes, hashedCodes };
}

export function hashBackupCode(code) {
    return crypto.createHash('sha256').update(code.toUpperCase().trim()).digest('hex');
}

export function verifyBackupCode(inputCode, hashedCodes) {
    const inputHash = hashBackupCode(inputCode);
    const index = hashedCodes.findIndex((h) => h === inputHash);

    if (index === -1) {
        return { valid: false, remaining: hashedCodes };
    }

    const remaining = [...hashedCodes];
    remaining.splice(index, 1);
    return { valid: true, remaining };
}
