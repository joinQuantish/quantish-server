/**
 * Database Adapter Base
 * 
 * Implement this interface to use your own database with Quantish
 */

import type {
  DatabaseAdapter,
  User,
  CreateUserInput,
  ApiKey,
  ApiKeyWithUser,
  CreateApiKeyInput,
  Order,
  CreateOrderInput,
  OrderFilters,
  Position,
  UpsertPositionInput,
  Transaction,
  CreateTransactionInput,
  CreateActivityInput,
} from '@quantish/types';

/**
 * Abstract base class for database adapters
 * Extend this class to implement your own database adapter
 */
export abstract class BaseDatabaseAdapter implements DatabaseAdapter {
  protected connected: boolean = false;

  /**
   * Connect to the database
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  abstract disconnect(): Promise<void>;

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ============================================
  // User Operations
  // ============================================

  abstract createUser(data: CreateUserInput): Promise<User>;
  abstract getUserById(id: string): Promise<User | null>;
  abstract getUserByExternalId(externalId: string): Promise<User | null>;
  abstract updateUser(id: string, data: Partial<User>): Promise<User>;

  // ============================================
  // API Key Operations
  // ============================================

  abstract createApiKey(userId: string, data: CreateApiKeyInput): Promise<ApiKey>;
  abstract getApiKeyByHash(hash: string): Promise<ApiKeyWithUser | null>;
  abstract revokeApiKey(id: string): Promise<void>;
  abstract listApiKeys(userId: string): Promise<ApiKey[]>;

  // ============================================
  // Order Operations
  // ============================================

  abstract createOrder(data: CreateOrderInput): Promise<Order>;
  abstract getOrderById(id: string): Promise<Order | null>;
  abstract getOrderByClobId(clobOrderId: string): Promise<Order | null>;
  abstract updateOrder(id: string, data: Partial<Order>): Promise<Order>;
  abstract listOrders(userId: string, filters?: OrderFilters): Promise<Order[]>;

  // ============================================
  // Position Operations
  // ============================================

  abstract upsertPosition(data: UpsertPositionInput): Promise<Position>;
  abstract getPositions(userId: string): Promise<Position[]>;

  // ============================================
  // Transaction Operations
  // ============================================

  abstract createTransaction(data: CreateTransactionInput): Promise<Transaction>;

  // ============================================
  // Activity Logging
  // ============================================

  abstract logActivity(data: CreateActivityInput): Promise<void>;
}

/**
 * In-memory adapter for testing
 */
export class InMemoryAdapter extends BaseDatabaseAdapter {
  private users: Map<string, User> = new Map();
  private usersByExternalId: Map<string, User> = new Map();
  private apiKeys: Map<string, ApiKeyWithUser> = new Map();
  private apiKeysByHash: Map<string, ApiKeyWithUser> = new Map();
  private orders: Map<string, Order> = new Map();
  private ordersByClobId: Map<string, Order> = new Map();
  private positions: Map<string, Position> = new Map();
  private transactions: Map<string, Transaction> = new Map();

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  // User operations
  async createUser(data: CreateUserInput): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      externalId: data.externalId,
      eoaAddress: data.eoaAddress,
      safeAddress: null,
      safeDeployed: false,
      clobApiKeyCreated: false,
      approvalsGranted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    this.usersByExternalId.set(user.externalId, user);
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByExternalId(externalId: string): Promise<User | null> {
    return this.usersByExternalId.get(externalId) || null;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    this.usersByExternalId.set(updated.externalId, updated);
    return updated;
  }

  // API Key operations
  async createApiKey(userId: string, data: CreateApiKeyInput): Promise<ApiKey> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    const apiKey: ApiKeyWithUser = {
      id: crypto.randomUUID(),
      userId,
      name: data.name || null,
      keyPrefix: data.keyPrefix,
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
      user,
      apiSecret: data.apiSecret,
    };
    this.apiKeys.set(apiKey.id, apiKey);
    this.apiKeysByHash.set(data.keyHash, apiKey);
    return apiKey;
  }

  async getApiKeyByHash(hash: string): Promise<ApiKeyWithUser | null> {
    return this.apiKeysByHash.get(hash) || null;
  }

  async revokeApiKey(id: string): Promise<void> {
    const key = this.apiKeys.get(id);
    if (key) {
      key.revokedAt = new Date();
    }
  }

  async listApiKeys(userId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values()).filter(k => k.userId === userId);
  }

  // Order operations
  async createOrder(data: CreateOrderInput): Promise<Order> {
    const order: Order = {
      id: crypto.randomUUID(),
      ...data,
      filledSize: 0,
      status: data.status || 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.orders.set(order.id, order);
    if (order.clobOrderId) {
      this.ordersByClobId.set(order.clobOrderId, order);
    }
    return order;
  }

  async getOrderById(id: string): Promise<Order | null> {
    return this.orders.get(id) || null;
  }

  async getOrderByClobId(clobOrderId: string): Promise<Order | null> {
    return this.ordersByClobId.get(clobOrderId) || null;
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) throw new Error('Order not found');
    const updated = { ...order, ...data, updatedAt: new Date() };
    this.orders.set(id, updated);
    if (updated.clobOrderId) {
      this.ordersByClobId.set(updated.clobOrderId, updated);
    }
    return updated;
  }

  async listOrders(userId: string, filters?: OrderFilters): Promise<Order[]> {
    let orders = Array.from(this.orders.values()).filter(o => o.userId === userId);
    if (filters?.status) {
      orders = orders.filter(o => o.status === filters.status);
    }
    if (filters?.side) {
      orders = orders.filter(o => o.side === filters.side);
    }
    if (filters?.limit) {
      orders = orders.slice(0, filters.limit);
    }
    return orders;
  }

  // Position operations
  async upsertPosition(data: UpsertPositionInput): Promise<Position> {
    const key = `${data.userId}-${data.tokenId}`;
    const existing = this.positions.get(key);
    const position: Position = {
      id: existing?.id || crypto.randomUUID(),
      ...data,
      lastSyncedAt: new Date(),
    };
    this.positions.set(key, position);
    return position;
  }

  async getPositions(userId: string): Promise<Position[]> {
    return Array.from(this.positions.values()).filter(p => p.userId === userId);
  }

  // Transaction operations
  async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    const tx: Transaction = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.transactions.set(tx.id, tx);
    return tx;
  }

  // Activity logging (no-op for in-memory)
  async logActivity(_data: CreateActivityInput): Promise<void> {
    // No-op for in-memory adapter
  }
}

