/**
 * Secure Storage - Handles secure credential storage using OS keychain
 *
 * Uses keytar for OS-level keychain integration (macOS Keychain, Windows Credential Vault, Linux Secret Service).
 * Falls back to encrypted JSON if keytar fails, with warnings logged.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Lazy load keytar to handle environments where it may not be available
let keytar: typeof import('keytar') | null = null;
try {
  keytar = require('keytar');
} catch (error) {
  console.warn('[Secure Storage] keytar not available, will use encrypted fallback');
}

const SERVICE_NAME = 'ai-site-builder-local';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
// TAG_LENGTH could be used for tag validation in the future
const _TAG_LENGTH = 16;

interface EncryptedData {
  iv: string;
  salt: string;
  tag: string;
  encrypted: string;
}

/**
 * Secure storage for credentials using OS keychain with encrypted fallback
 */
export class SecureStorage {
  private userDataPath: string;
  private fallbackPath: string;
  private useKeychain: boolean = false;
  private encryptionKey: Buffer | null = null;

  constructor(userDataPath: string) {
    this.userDataPath = userDataPath;
    const addonDataDir = path.join(userDataPath, 'ai-site-builder');

    // Ensure directory exists
    if (!fs.existsSync(addonDataDir)) {
      fs.mkdirSync(addonDataDir, { recursive: true });
    }

    this.fallbackPath = path.join(addonDataDir, 'credentials.enc');

    // Check if keytar is available
    this.useKeychain = keytar !== null;

    if (!this.useKeychain) {
      console.warn(
        '[Secure Storage] Using encrypted file fallback. For better security, ensure keytar is properly installed.'
      );
      this.initializeEncryption();
    }
  }

  /**
   * Initialize encryption for fallback storage
   */
  private initializeEncryption(): void {
    // Generate or load a machine-specific key
    // In production, this should use a more secure method
    const machineId = this.getMachineId();
    this.encryptionKey = crypto.pbkdf2Sync(machineId, 'ai-site-builder-salt', 100000, 32, 'sha256');
  }

  /**
   * Get a machine-specific identifier
   */
  private getMachineId(): string {
    // Use hostname as a simple machine identifier
    // In production, you might want to use a more robust method
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const os = require('os');
    return os.hostname() + '-' + os.platform();
  }

  /**
   * Encrypt data for fallback storage
   */
  private encrypt(data: string): EncryptedData {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      tag: tag.toString('hex'),
      encrypted,
    };
  }

  /**
   * Decrypt data from fallback storage
   */
  private decrypt(encryptedData: EncryptedData): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Load fallback storage
   */
  private loadFallbackStorage(): Record<string, EncryptedData> {
    try {
      if (fs.existsSync(this.fallbackPath)) {
        const data = fs.readFileSync(this.fallbackPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[Secure Storage] Error loading fallback storage:', error);
    }
    return {};
  }

  /**
   * Save fallback storage
   */
  private saveFallbackStorage(storage: Record<string, EncryptedData>): void {
    try {
      const data = JSON.stringify(storage, null, 2);
      fs.writeFileSync(this.fallbackPath, data, 'utf-8');

      // Set restrictive file permissions (owner read/write only)
      fs.chmodSync(this.fallbackPath, 0o600);
    } catch (error) {
      console.error('[Secure Storage] Error saving fallback storage:', error);
      throw new Error('Failed to save credentials');
    }
  }

  /**
   * Get a credential from secure storage
   */
  async getCredential(key: string): Promise<string | null> {
    try {
      if (this.useKeychain && keytar) {
        const value = await keytar.getPassword(SERVICE_NAME, key);
        return value;
      } else {
        // Use fallback
        const storage = this.loadFallbackStorage();
        const encryptedData = storage[key];

        if (!encryptedData) {
          return null;
        }

        return this.decrypt(encryptedData);
      }
    } catch (error) {
      console.error(`[Secure Storage] Error getting credential ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a credential in secure storage
   */
  async setCredential(key: string, value: string): Promise<void> {
    try {
      if (this.useKeychain && keytar) {
        await keytar.setPassword(SERVICE_NAME, key, value);
      } else {
        // Use fallback
        const storage = this.loadFallbackStorage();
        storage[key] = this.encrypt(value);
        this.saveFallbackStorage(storage);
      }
    } catch (error) {
      console.error(`[Secure Storage] Error setting credential ${key}:`, error);
      throw new Error('Failed to save credential');
    }
  }

  /**
   * Delete a credential from secure storage
   */
  async deleteCredential(key: string): Promise<boolean> {
    try {
      if (this.useKeychain && keytar) {
        return await keytar.deletePassword(SERVICE_NAME, key);
      } else {
        // Use fallback
        const storage = this.loadFallbackStorage();

        if (storage[key]) {
          delete storage[key];
          this.saveFallbackStorage(storage);
          return true;
        }

        return false;
      }
    } catch (error) {
      console.error(`[Secure Storage] Error deleting credential ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if a credential exists
   */
  async hasCredential(key: string): Promise<boolean> {
    try {
      const value = await this.getCredential(key);
      return value !== null && value.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all credential keys (for migration purposes)
   */
  async getAllKeys(): Promise<string[]> {
    try {
      if (this.useKeychain && keytar) {
        // keytar doesn't provide a way to list all keys for a service
        // Return empty array - migration will need to check known keys
        return [];
      } else {
        const storage = this.loadFallbackStorage();
        return Object.keys(storage);
      }
    } catch (error) {
      console.error('[Secure Storage] Error getting all keys:', error);
      return [];
    }
  }

  /**
   * Check if using keychain (vs fallback)
   */
  isUsingKeychain(): boolean {
    return this.useKeychain;
  }
}
