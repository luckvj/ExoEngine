/**
 * Token Encryption Service
 * Provides AES-GCM encryption for sensitive tokens stored in IndexedDB
 * Uses Web Crypto API for secure, browser-native cryptography
 */

import { errorLog, warnLog } from '../../utils/logger';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // AES-256
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits
const ITERATIONS = 100000; // PBKDF2 iterations

interface EncryptedData {
    ciphertext: string; // Base64 encoded
    iv: string; // Base64 encoded initialization vector
    salt: string; // Base64 encoded salt
}

class TokenEncryptionService {
    private encryptionKey: CryptoKey | null = null;

    /**
     * Initialize encryption key from device-specific entropy
     * Uses multiple entropy sources for key generation
     */
    async initialize(): Promise<void> {
        if (this.encryptionKey) return;

        try {
            // Generate device-specific key material
            const keyMaterial = await this.generateKeyMaterial();

            // Derive encryption key using PBKDF2
            const salt = await this.getOrCreateSalt();
            this.encryptionKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt as BufferSource,
                    iterations: ITERATIONS,
                    hash: 'SHA-256'
                },
                keyMaterial,
                {
                    name: ENCRYPTION_ALGORITHM,
                    length: KEY_LENGTH
                },
                false, // Not extractable - key stays in memory
                ['encrypt', 'decrypt']
            );
        } catch (error) {
            errorLog('TokenEncryption', 'Init failed:', error);
            throw new Error('Failed to initialize token encryption');
        }
    }

    /**
     * Encrypt sensitive data using AES-GCM
     */
    async encrypt(plaintext: string): Promise<EncryptedData> {
        await this.initialize();

        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }

        try {
            // Generate random IV
            const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

            // Convert plaintext to bytes
            const encoder = new TextEncoder();
            const data = encoder.encode(plaintext);

            // Encrypt using AES-GCM
            const ciphertext = await crypto.subtle.encrypt(
                {
                    name: ENCRYPTION_ALGORITHM,
                    iv: iv
                },
                this.encryptionKey,
                data
            );

            // Get salt for storage
            const salt = await this.getOrCreateSalt();

            return {
                ciphertext: this.arrayBufferToBase64(ciphertext),
                iv: this.arrayBufferToBase64(iv),
                salt: this.arrayBufferToBase64(salt)
            };
        } catch (error) {
            errorLog('TokenEncryption', 'Encrypt failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt encrypted data using AES-GCM
     */
    async decrypt(encrypted: EncryptedData): Promise<string> {
        await this.initialize();

        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }

        try {
            // Convert from base64
            const ciphertext = this.base64ToArrayBuffer(encrypted.ciphertext);
            const iv = this.base64ToArrayBuffer(encrypted.iv);

            // Decrypt using AES-GCM
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: ENCRYPTION_ALGORITHM,
                    iv: iv as BufferSource
                },
                this.encryptionKey,
                ciphertext as BufferSource
            );

            // Convert back to string
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            errorLog('TokenEncryption', 'Decrypt failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Generate cryptographic key material from device entropy
     */
    private async generateKeyMaterial(): Promise<CryptoKey> {
        // Collect entropy from multiple sources
        const entropy = this.collectDeviceEntropy();

        // Import as key material for PBKDF2
        return crypto.subtle.importKey(
            'raw',
            entropy as BufferSource,
            'PBKDF2',
            false,
            ['deriveKey']
        );
    }

    /**
     * Collect device-specific entropy for key generation
     * Uses multiple sources to create unique key per device/browser
     * IMPORTANT: This must be deterministic - same device = same entropy
     */
    private collectDeviceEntropy(): Uint8Array {
        const sources = [
            // Browser fingerprint components (deterministic)
            navigator.userAgent,
            navigator.language,
            navigator.hardwareConcurrency?.toString() || '',
            screen.width?.toString() || '',
            screen.height?.toString() || '',
            screen.colorDepth?.toString() || '',
            new Date().getTimezoneOffset().toString(),
            // Add more stable fingerprinting
            navigator.platform,
            navigator.maxTouchPoints?.toString() || '0'
        ];

        // Combine all sources - NO RANDOM DATA!
        // The salt provides randomness, key material must be deterministic
        const combined = sources.join('|');
        const encoder = new TextEncoder();
        return encoder.encode(combined);
    }

    /**
     * Get or create persistent salt for PBKDF2
     */
    private async getOrCreateSalt(): Promise<Uint8Array> {
        const SALT_KEY = 'exo_encryption_salt';

        try {
            // Try to get existing salt from localStorage
            const stored = localStorage.getItem(SALT_KEY);
            if (stored) {
                return this.base64ToArrayBuffer(stored);
            }
        } catch (e) {
            // localStorage might be disabled
        }

        // Generate new salt
        const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

        try {
            // Store for future use
            localStorage.setItem(SALT_KEY, this.arrayBufferToBase64(salt));
        } catch (e) {
            warnLog('TokenEncryption', 'Salt persist failed');
        }

        return salt;
    }

    /**
     * Convert ArrayBuffer to Base64 string
     */
    private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert Base64 string to Uint8Array
     */
    private base64ToArrayBuffer(base64: string): Uint8Array {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Clear encryption key from memory
     * Call on logout to ensure key is not persisted
     */
    clearKey(): void {
        this.encryptionKey = null;
    }
}

// Export singleton instance
export const tokenEncryption = new TokenEncryptionService();
