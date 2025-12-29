/**
 * @quantish/core/wallet
 * Wallet generation and Safe deployment utilities
 */

export {
  generateWallet,
  recoverWallet,
  predictSafeAddress,
  isContractDeployed,
  type GeneratedWallet,
  type WalletFromKey,
} from './key-generator';

export {
  createSafeDeploymentSignature,
  calculateSafeAddress,
  createApprovalSignatures,
  buildSafeTransaction,
  POLYGON_CONTRACTS,
  type SafeDeploymentConfig,
  type SafeDeploymentResult,
  type SafeTransaction,
} from './safe-deployer';

