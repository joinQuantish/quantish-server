/**
 * @quantish/types
 * Core type definitions for Quantish SDK
 */

// ============================================
// Configuration Types
// ============================================

export interface QuantishConfig {
  /** API key for authentication */
  apiKey?: string;
  /** API secret for HMAC signing (required for write operations) */
  apiSecret?: string;
  /** API endpoint (defaults to Quantish Cloud) */
  endpoint?: string;
  /** Enable debug logging */
  debug?: boolean;
}

export interface ServerConfig {
  /** Database adapter instance */
  database: DatabaseAdapter;
  /** Encryption configuration */
  encryption: EncryptionConfig;
  /** Relayer configuration */
  relayer?: RelayerConfig;
  /** Builder attribution credentials */
  builder?: BuilderConfig;
  /** Server port */
  port?: number;
  /** Enable CORS */
  cors?: boolean;
}

export interface EncryptionConfig {
  /** Master key for AES-256-GCM encryption (32 bytes, hex or base64) */
  masterKey: string;
  /** Encryption algorithm (default: aes-256-gcm) */
  algorithm?: 'aes-256-gcm';
}

export interface RelayerConfig {
  /** Relayer mode */
  mode: 'quantish-cloud' | 'self-hosted' | 'polymarket';
  /** Relayer endpoint (for self-hosted) */
  endpoint?: string;
  /** API key for Quantish Cloud relayer */
  apiKey?: string;
}

export interface BuilderConfig {
  /** Builder API key from Polymarket */
  apiKey: string;
  /** Builder API secret */
  apiSecret: string;
  /** Builder passphrase */
  passphrase?: string;
}

// ============================================
// Database Adapter Interface
// ============================================

export interface DatabaseAdapter {
  /** Initialize the database connection */
  connect(): Promise<void>;
  /** Close the database connection */
  disconnect(): Promise<void>;
  
  // User operations
  createUser(data: CreateUserInput): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByExternalId(externalId: string): Promise<User | null>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  
  // API Key operations
  createApiKey(userId: string, data: CreateApiKeyInput): Promise<ApiKey>;
  getApiKeyByHash(hash: string): Promise<ApiKeyWithUser | null>;
  revokeApiKey(id: string): Promise<void>;
  listApiKeys(userId: string): Promise<ApiKey[]>;
  
  // Order operations
  createOrder(data: CreateOrderInput): Promise<Order>;
  getOrderById(id: string): Promise<Order | null>;
  getOrderByClobId(clobOrderId: string): Promise<Order | null>;
  updateOrder(id: string, data: Partial<Order>): Promise<Order>;
  listOrders(userId: string, filters?: OrderFilters): Promise<Order[]>;
  
  // Position operations
  upsertPosition(data: UpsertPositionInput): Promise<Position>;
  getPositions(userId: string): Promise<Position[]>;
  
  // Transaction logging
  createTransaction(data: CreateTransactionInput): Promise<Transaction>;
  
  // Activity logging
  logActivity(data: CreateActivityInput): Promise<void>;
}

// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  externalId: string;
  eoaAddress: string;
  safeAddress?: string | null;
  safeDeployed: boolean;
  clobApiKeyCreated: boolean;
  approvalsGranted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  externalId: string;
  eoaAddress: string;
  encryptedPrivateKey: string;
  keyIv: string;
  keyAuthTag: string;
}

// ============================================
// API Key Types
// ============================================

export interface ApiKey {
  id: string;
  userId: string;
  name?: string | null;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt?: Date | null;
  revokedAt?: Date | null;
}

export interface ApiKeyWithUser extends ApiKey {
  user: User;
  apiSecret?: string;
}

export interface CreateApiKeyInput {
  name?: string;
  keyHash: string;
  keyPrefix: string;
  apiSecret?: string;
}

// ============================================
// Order Types
// ============================================

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'GTC' | 'GTD' | 'FOK' | 'FAK';
export type OrderStatus = 'PENDING' | 'LIVE' | 'FILLED' | 'CANCELLED' | 'FAILED';

export interface Order {
  id: string;
  userId: string;
  clobOrderId?: string | null;
  conditionId: string;
  tokenId: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  size: number;
  filledSize: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderInput {
  userId: string;
  conditionId: string;
  tokenId: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  size: number;
  clobOrderId?: string;
  status?: OrderStatus;
}

export interface OrderFilters {
  status?: OrderStatus;
  side?: OrderSide;
  conditionId?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// Position Types
// ============================================

export interface Position {
  id: string;
  userId: string;
  conditionId: string;
  tokenId: string;
  outcome: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
  initialValue: number;
  currentValue: number;
  realizedPnl: number;
  marketTitle?: string | null;
  marketSlug?: string | null;
  negativeRisk: boolean;
  redeemable: boolean;
  mergeable: boolean;
  lastSyncedAt: Date;
}

export interface UpsertPositionInput {
  userId: string;
  conditionId: string;
  tokenId: string;
  outcome: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
  initialValue: number;
  currentValue: number;
  realizedPnl: number;
  marketTitle?: string;
  marketSlug?: string;
  negativeRisk: boolean;
  redeemable: boolean;
  mergeable: boolean;
}

// ============================================
// Transaction Types
// ============================================

export type TransactionType = 
  | 'DEPLOY_SAFE'
  | 'CREATE_API_CREDENTIALS'
  | 'GRANT_APPROVALS'
  | 'PLACE_ORDER'
  | 'CANCEL_ORDER'
  | 'TRANSFER_USDC'
  | 'TRANSFER_SHARES'
  | 'SWAP_TOKENS'
  | 'REDEEM_POSITION';

export type TransactionStatus = 'PENDING' | 'SUBMITTED' | 'EXECUTED' | 'FAILED';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  txHash?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionInput {
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  txHash?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Activity Log Types
// ============================================

export interface CreateActivityInput {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
}

// ============================================
// Wallet Types
// ============================================

export interface WalletBalances {
  eoa: {
    address: string;
    matic: string;
    usdc: string;
  };
  safe: {
    address: string;
    matic: string;
    wmatic: string;
    usdc: string;
    nativeUsdc: string;
  };
}

export interface WalletStatus {
  isSetup: boolean;
  eoaAddress: string;
  safeAddress?: string;
  safeDeployed: boolean;
  clobApiKeyCreated: boolean;
  approvalsGranted: boolean;
}

// ============================================
// Market Types
// ============================================

export interface Market {
  conditionId: string;
  question: string;
  slug: string;
  tokens: MarketToken[];
  endDate: string;
  volume: string;
  liquidity: string;
}

export interface MarketToken {
  tokenId: string;
  outcome: string;
  price: string;
}

export interface OrderBook {
  market: string;
  asset_id: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
}

export interface OrderBookEntry {
  price: string;
  size: string;
}

// ============================================
// HMAC Signing Types
// ============================================

export interface HmacSignatureInput {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  timestamp: number;
  secret: string;
}

export interface SignedRequest {
  headers: {
    'X-Quantish-Key': string;
    'X-Quantish-Timestamp': string;
    'X-Quantish-Signature': string;
  };
}

// ============================================
// Error Types
// ============================================

export class QuantishError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'QuantishError';
  }
}

export class AuthenticationError extends QuantishError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends QuantishError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class InsufficientBalanceError extends QuantishError {
  constructor(message: string = 'Insufficient balance') {
    super(message, 'INSUFFICIENT_BALANCE', 400);
    this.name = 'InsufficientBalanceError';
  }
}

