/**
 * PostgreSQL Adapter using Prisma
 * 
 * Usage:
 * ```typescript
 * import { PostgresAdapter } from '@quantish/server/adapters'
 * 
 * const adapter = new PostgresAdapter({
 *   connectionString: process.env.DATABASE_URL
 * })
 * ```
 */

import { BaseDatabaseAdapter } from './base';
import type {
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

export interface PostgresConfig {
  /** PostgreSQL connection string */
  connectionString: string;
}

/**
 * PostgreSQL adapter using Prisma
 * 
 * Note: You need to run `npx prisma generate` with the Quantish schema
 * before using this adapter.
 */
export class PostgresAdapter extends BaseDatabaseAdapter {
  private prisma: any; // PrismaClient - typed as any to avoid requiring @prisma/client
  private config: PostgresConfig;

  constructor(config: PostgresConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // Dynamically import Prisma to make it optional
      const { PrismaClient } = await import('@prisma/client');
      
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: this.config.connectionString,
          },
        },
      });

      await this.prisma.$connect();
      this.connected = true;
    } catch (error) {
      throw new Error(
        `Failed to connect to PostgreSQL. Make sure @prisma/client is installed and schema is generated. Error: ${error}`
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
    this.connected = false;
  }

  // ============================================
  // User Operations
  // ============================================

  async createUser(data: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        externalId: data.externalId,
        eoaAddress: data.eoaAddress,
        encryptedPrivateKey: data.encryptedPrivateKey,
        keyIv: data.keyIv,
        keyAuthTag: data.keyAuthTag,
      },
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getUserByExternalId(externalId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { externalId } });
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // ============================================
  // API Key Operations
  // ============================================

  async createApiKey(userId: string, data: CreateApiKeyInput): Promise<ApiKey> {
    return this.prisma.userApiKey.create({
      data: {
        userId,
        name: data.name,
        keyHash: data.keyHash,
        keyPrefix: data.keyPrefix,
        apiSecret: data.apiSecret,
      },
    });
  }

  async getApiKeyByHash(hash: string): Promise<ApiKeyWithUser | null> {
    return this.prisma.userApiKey.findUnique({
      where: { keyHash: hash },
      include: { user: true },
    });
  }

  async revokeApiKey(id: string): Promise<void> {
    await this.prisma.userApiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async listApiKeys(userId: string): Promise<ApiKey[]> {
    return this.prisma.userApiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // Order Operations
  // ============================================

  async createOrder(data: CreateOrderInput): Promise<Order> {
    return this.prisma.order.create({ data });
  }

  async getOrderById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { id } });
  }

  async getOrderByClobId(clobOrderId: string): Promise<Order | null> {
    return this.prisma.order.findFirst({ where: { clobOrderId } });
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
    return this.prisma.order.update({ where: { id }, data });
  }

  async listOrders(userId: string, filters?: OrderFilters): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: {
        userId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.side && { side: filters.side }),
        ...(filters?.conditionId && { conditionId: filters.conditionId }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });
  }

  // ============================================
  // Position Operations
  // ============================================

  async upsertPosition(data: UpsertPositionInput): Promise<Position> {
    return this.prisma.position.upsert({
      where: {
        userId_tokenId: {
          userId: data.userId,
          tokenId: data.tokenId,
        },
      },
      create: {
        ...data,
        lastSyncedAt: new Date(),
      },
      update: {
        size: data.size,
        currentPrice: data.currentPrice,
        currentValue: data.currentValue,
        realizedPnl: data.realizedPnl,
        redeemable: data.redeemable,
        mergeable: data.mergeable,
        lastSyncedAt: new Date(),
      },
    });
  }

  async getPositions(userId: string): Promise<Position[]> {
    return this.prisma.position.findMany({
      where: { userId },
      orderBy: { currentValue: 'desc' },
    });
  }

  // ============================================
  // Transaction Operations
  // ============================================

  async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    return this.prisma.transaction.create({ data });
  }

  // ============================================
  // Activity Logging
  // ============================================

  async logActivity(data: CreateActivityInput): Promise<void> {
    await this.prisma.activityLog.create({ data });
  }
}

