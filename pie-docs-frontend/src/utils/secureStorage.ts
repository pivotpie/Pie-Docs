/**
 * Secure localStorage utility with client-side encryption
 * Uses Web Crypto API for encryption/decryption
 */

interface EncryptedData {
  data: string;
  iv: string;
}

class SecureStorage {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static key: CryptoKey | null = null;

  /**
   * Initialize the encryption key
   */
  private static async getKey(): Promise<CryptoKey> {
    if (this.key) {
      return this.key;
    }

    // Try to get existing key from sessionStorage (temporary per session)
    const storedKeyData = sessionStorage.getItem('_secureStorageKey');

    if (storedKeyData) {
      try {
        const keyData = JSON.parse(storedKeyData);
        this.key = await crypto.subtle.importKey(
          'raw',
          new Uint8Array(keyData),
          { name: this.ALGORITHM },
          false,
          ['encrypt', 'decrypt']
        );
        return this.key;
      } catch {
        console.warn('Failed to restore encryption key, generating new one');
      }
    }

    // Generate new key
    this.key = await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );

    // Store key in sessionStorage (will be lost when session ends)
    const exportedKey = await crypto.subtle.exportKey('raw', this.key);
    sessionStorage.setItem('_secureStorageKey', JSON.stringify(Array.from(new Uint8Array(exportedKey))));

    return this.key;
  }

  /**
   * Encrypt data using AES-GCM
   */
  private static async encrypt(data: string): Promise<EncryptedData> {
    const key = await this.getKey();
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      encodedData
    );

    return {
      data: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
    };
  }

  /**
   * Decrypt data using AES-GCM
   */
  private static async decrypt(encryptedData: EncryptedData): Promise<string> {
    const key = await this.getKey();
    const iv = new Uint8Array(encryptedData.iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const data = new Uint8Array(encryptedData.data.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));

    const decrypted = await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Securely store data in localStorage with encryption
   */
  static async setItem(key: string, value: unknown): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      const encrypted = await this.encrypt(jsonString);
      localStorage.setItem(key, JSON.stringify(encrypted));
    } catch (error) {
      console.error('SecureStorage.setItem failed:', error);
      // Fallback to regular localStorage for non-critical failures
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  /**
   * Retrieve and decrypt data from localStorage
   */
  static async getItem<T = unknown>(key: string): Promise<T | null> {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);

      // Check if it's encrypted data (has 'data' and 'iv' properties)
      if (parsed && typeof parsed === 'object' && 'data' in parsed && 'iv' in parsed) {
        const decrypted = await this.decrypt(parsed);
        return JSON.parse(decrypted);
      } else {
        // Fallback for unencrypted data (backward compatibility)
        return parsed;
      }
    } catch (error) {
      console.error('SecureStorage.getItem failed:', error);
      // Fallback to regular localStorage
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    }
  }

  /**
   * Remove item from localStorage
   */
  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Clear all localStorage data
   */
  static clear(): void {
    localStorage.clear();
    sessionStorage.removeItem('_secureStorageKey');
    this.key = null;
  }

  /**
   * Check if Web Crypto API is supported
   */
  static isSupported(): boolean {
    return typeof crypto !== 'undefined' &&
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.getRandomValues !== 'undefined';
  }

  /**
   * Migrate existing unencrypted data to encrypted format
   */
  static async migrateExistingData(keys: string[]): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Secure storage not supported, skipping migration');
      return;
    }

    for (const key of keys) {
      try {
        const existing = localStorage.getItem(key);
        if (existing) {
          const parsed = JSON.parse(existing);

          // Check if already encrypted
          if (!(parsed && typeof parsed === 'object' && 'data' in parsed && 'iv' in parsed)) {
            // Re-encrypt the data
            await this.setItem(key, parsed);
            console.log(`Migrated ${key} to encrypted format`);
          }
        }
      } catch (error) {
        console.error(`Failed to migrate ${key}:`, error);
      }
    }
  }
}

export default SecureStorage;