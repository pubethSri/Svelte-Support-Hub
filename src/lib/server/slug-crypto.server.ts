import { env } from '$env/dynamic/private';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

function getKey(): Buffer {
    const secret = env.SLUG_SECRET;
    if (!secret || secret.length !== 64) {
        throw new Error('SLUG_SECRET must be a 64-character hex string (32 bytes)');
    }
    return Buffer.from(secret, 'hex');
}

/** Convert Buffer to URL-safe base64 (no padding) */
function toBase64Url(buf: Buffer): string {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Convert URL-safe base64 back to Buffer */
function fromBase64Url(str: string): Buffer {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(padded, 'base64');
}

/**
 * Encrypt a policyid into a URL-safe base64url string.
 * Uses a deterministic IV (derived from the plaintext via HMAC) so the
 * same input always produces the same URL — bookmarks and sharing work.
 * Format: iv (12 bytes) + authTag (16 bytes) + ciphertext → base64url
 */
export function encryptSlug(plaintext: string): string {
    const key = getKey();
    // Deterministic IV: HMAC-SHA256 of the plaintext, truncated to 12 bytes
    const iv = crypto.createHmac('sha256', key).update(plaintext).digest().subarray(0, IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return toBase64Url(Buffer.concat([iv, authTag, encrypted]));
}

/**
 * Decrypt a base64url slug back to the original policy name.
 * Throws on invalid/tampered input.
 */
export function decryptSlug(slug: string): string {
    const key = getKey();
    const data = fromBase64Url(slug);

    if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error('Invalid slug: too short');
    }

    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ]);

    return decrypted.toString('utf8');
}
