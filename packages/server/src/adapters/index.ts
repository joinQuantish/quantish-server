/**
 * Database Adapters
 * 
 * Choose your database backend:
 * 
 * - PostgresAdapter: Production-ready PostgreSQL via Prisma
 * - InMemoryAdapter: For testing and development
 * - Custom: Extend BaseDatabaseAdapter for any database
 */

export { BaseDatabaseAdapter, InMemoryAdapter } from './base';
export { PostgresAdapter, type PostgresConfig } from './postgres';

