/**
 * KeyVault - Secure encryption/decryption for private keys
 * Uses AES-256-GCM for authenticated encryption
 */

import * as crypto from 'crypto';
import type { EncryptionConfig } from '@quantish/types';

export interface EncryptedData {
  /** Base64 encoded encrypted data */
  encrypted: string;
  /** Base64 encoded initialization vector */
  iv: string;
  /** Base64 encoded authentication tag */
  authTag: string;
}

export interface KeyVaultConfig {
  /** Master key for encryption (32 bytes) */
  masterKey: Buffer;
  /** Algorithm to use (default: aes-256-gcm) */
  algorithm?: 'aes-256-gcm';
}

export class KeyVault {
  private readonly masterKey: Buffer;
  private readonly algorithm: string = 'aes-256-gcm';
  private readonly ivLength: number = 16;
  private readonly authTagLength: number = 16;

  constructor(config: KeyVaultConfig | EncryptionConfig) {
    // Handle both config formats
    if ('masterKey' in config) {
      if (Buffer.isBuffer(config.masterKey)) {
        this.masterKey = config.masterKey;
      } else if (typeof config.masterKey === 'string') {
        // Parse string as hex or base64
        this.masterKey = this.parseKey(config.masterKey);
      } else {
        throw new Error('masterKey must be a Buffer or string');
      }
    } else {
      throw new Error('masterKey is required');
    }

    // Validate key length
    if (this.masterKey.length !== 32) {
      throw new Error(`Master key must be 32 bytes (256 bits), got ${this.masterKey.length} bytes`);
    }
  }

  /**
   * Parse a key string (hex or base64) to Buffer
   */
  private parseKey(key: string): Buffer {
    // Try hex first
    if (/^[0-9a-fA-F]+$/.test(key) && key.length === 64) {
      return Buffer.from(key, 'hex');
    }
    // Try base64
    const base64 = Buffer.from(key, 'base64');
    if (base64.length === 32) {
      return base64;
    }
    throw new Error('Master key must be 32 bytes as hex (64 chars) or base64 (44 chars)');
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(plaintext: string): EncryptedData {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(
      this.algorithm as crypto.CipherGCMTypes,
      this.masterKey,
      iv,
      { authTagLength: this.authTagLength }
    );

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encryptedData: EncryptedData): string {
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');

    const decipher = crypto.createDecipheriv(
      this.algorithm as crypto.CipherGCMTypes,
      this.masterKey,
      iv,
      { authTagLength: this.authTagLength }
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Generate a new random master key
   */
  static generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Derive a key from a password using PBKDF2
   */
  static deriveKeyFromPassword(password: string, salt?: string): {
    key: string;
    salt: string;
  } {
    const actualSalt = salt 
      ? Buffer.from(salt, 'hex') 
      : crypto.randomBytes(32);
    
    const key = crypto.pbkdf2Sync(
      password,
      actualSalt,
      100000, // iterations
      32,     // key length
      'sha512'
    );

    return {
      key: key.toString('hex'),
      salt: actualSalt.toString('hex'),
    };
  }
}

