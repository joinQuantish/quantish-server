/**
 * HMAC Signing Utilities
 * Provides request signing and verification for secure API communication
 */

import * as crypto from 'crypto';
import type { HmacSignatureInput, SignedRequest } from '@quantish/types';

export interface HmacConfig {
  /** API key */
  apiKey: string;
  /** API secret for signing */
  apiSecret: string;
  /** Signature validity window in seconds (default: 30) */
  validityWindow?: number;
}

/**
 * Create an HMAC-SHA256 signature for a request
 */
export function createHmacSignature(input: HmacSignatureInput): string {
  const { method, path, body, timestamp, secret } = input;

  // Create the message to sign
  const bodyString = body ? JSON.stringify(body) : '';
  const message = `${timestamp}${method}${path}${bodyString}`;

  // Create HMAC-SHA256 signature
  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64');

  return signature;
}

/**
 * Verify an HMAC signature
 */
export function verifyHmacSignature(
  signature: string,
  input: Omit<HmacSignatureInput, 'secret'>,
  secret: string,
  validityWindowSeconds: number = 30
): { valid: boolean; reason?: string } {
  const { timestamp } = input;

  // Check timestamp validity
  const now = Date.now();
  const requestTime = timestamp;
  const timeDiff = Math.abs(now - requestTime);

  if (timeDiff > validityWindowSeconds * 1000) {
    return {
      valid: false,
      reason: `Request timestamp expired. Time difference: ${timeDiff}ms, max allowed: ${validityWindowSeconds * 1000}ms`,
    };
  }

  // Calculate expected signature
  const expectedSignature = createHmacSignature({ ...input, secret });

  // Use timing-safe comparison
  const signatureBuffer = Buffer.from(signature, 'base64');
  const expectedBuffer = Buffer.from(expectedSignature, 'base64');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return { valid: false, reason: 'Invalid signature length' };
  }

  const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!isValid) {
    return { valid: false, reason: 'Signature mismatch' };
  }

  return { valid: true };
}

/**
 * Create signed headers for a request
 */
export function createSignedHeaders(
  config: HmacConfig,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): SignedRequest['headers'] {
  const timestamp = Date.now();

  const signature = createHmacSignature({
    method,
    path,
    body,
    timestamp,
    secret: config.apiSecret,
  });

  return {
    'X-Quantish-Key': config.apiKey,
    'X-Quantish-Timestamp': timestamp.toString(),
    'X-Quantish-Signature': signature,
  };
}

/**
 * Generate a new API secret
 */
export function generateApiSecret(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Generate an API key with prefix
 */
export function generateApiKey(prefix: string = 'qnt'): {
  key: string;
  keyPrefix: string;
  keyHash: string;
} {
  const randomPart = crypto.randomBytes(24).toString('base64url');
  const key = `${prefix}_${randomPart}`;
  const keyPrefix = key.substring(0, 12);
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  return { key, keyPrefix, keyHash };
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

