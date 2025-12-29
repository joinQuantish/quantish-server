/**
 * @quantish/core
 * Core utilities for the Quantish SDK
 * 
 * This package provides the foundational building blocks:
 * - Encryption (KeyVault)
 * - HMAC Signing
 * - Wallet Generation
 * - Safe Deployment
 * - Relayer Client
 */

// Re-export types
export * from '@quantish/types';

// Crypto utilities
export {
  KeyVault,
  type EncryptedData,
  type KeyVaultConfig,
  createHmacSignature,
  verifyHmacSignature,
  createSignedHeaders,
  generateApiSecret,
  generateApiKey,
  hashApiKey,
  type HmacConfig,
} from './crypto';

// Wallet utilities
export {
  generateWallet,
  recoverWallet,
  predictSafeAddress,
  isContractDeployed,
  type GeneratedWallet,
  type WalletFromKey,
  createSafeDeploymentSignature,
  calculateSafeAddress,
  createApprovalSignatures,
  buildSafeTransaction,
  POLYGON_CONTRACTS,
  type SafeDeploymentConfig,
  type SafeDeploymentResult,
  type SafeTransaction,
} from './wallet';

// Relayer
export {
  RelayerClient,
  createPolymarketRelayer,
  POLYMARKET_RELAYER,
  type RelayerConfig,
  type RelayerResponse,
} from './relayer';

// Version
export const VERSION = '0.1.0';

