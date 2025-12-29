/**
 * @quantish/server
 * 
 * Self-hosted Quantish server
 * 
 * Quick Start:
 * ```typescript
 * import { createServer, PostgresAdapter } from '@quantish/server'
 * 
 * const server = await createServer({
 *   database: new PostgresAdapter({
 *     connectionString: process.env.DATABASE_URL
 *   }),
 *   encryption: {
 *     masterKey: process.env.QUANTISH_MASTER_KEY
 *   }
 * })
 * 
 * server.listen(3000)
 * ```
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import type { ServerConfig, DatabaseAdapter } from '@quantish/types';
import { KeyVault, verifyHmacSignature, hashApiKey } from '@quantish/core';

// Re-export adapters
export * from './adapters';

// Re-export types
export type { ServerConfig, DatabaseAdapter } from '@quantish/types';

export interface QuantishServerConfig {
  /** Database adapter */
  database: DatabaseAdapter;
  /** Encryption configuration */
  encryption: {
    masterKey: string;
  };
  /** Optional: Builder credentials for Polymarket */
  builder?: {
    apiKey: string;
    apiSecret: string;
    passphrase?: string;
  };
  /** Server port (default: 3000) */
  port?: number;
  /** Enable CORS (default: true) */
  cors?: boolean;
  /** Enable request logging (default: false) */
  logging?: boolean;
}

export interface QuantishServer {
  /** Express app instance */
  app: Express;
  /** Start the server */
  listen: (port?: number) => Promise<void>;
  /** Stop the server */
  close: () => Promise<void>;
  /** Get the database adapter */
  getDatabase: () => DatabaseAdapter;
  /** Get the key vault */
  getKeyVault: () => KeyVault;
}

/**
 * Create a Quantish server instance
 */
export async function createServer(
  config: QuantishServerConfig
): Promise<QuantishServer> {
  const { database, encryption, builder, cors = true, logging = false } = config;

  // Initialize key vault
  const keyVault = new KeyVault({ masterKey: encryption.masterKey });

  // Connect to database
  await database.connect();

  // Create Express app
  const app = express();

  // Middleware
  app.use(express.json());

  if (cors) {
    app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, X-Quantish-Key, X-Quantish-Timestamp, X-Quantish-Signature');
      next();
    });
  }

  if (logging) {
    app.use((req, _res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  // Authentication middleware
  const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-quantish-key'] as string;
    const timestamp = req.headers['x-quantish-timestamp'] as string;
    const signature = req.headers['x-quantish-signature'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // Hash the API key and look it up
    const keyHash = hashApiKey(apiKey);
    const keyRecord = await database.getApiKeyByHash(keyHash);

    if (!keyRecord || keyRecord.revokedAt) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Verify HMAC signature if secret exists
    if (keyRecord.apiSecret && signature) {
      const result = verifyHmacSignature(
        signature,
        {
          method: req.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
          path: req.path,
          body: req.body,
          timestamp: parseInt(timestamp, 10),
        },
        keyRecord.apiSecret
      );

      if (!result.valid) {
        return res.status(401).json({ error: 'Invalid signature', reason: result.reason });
      }
    }

    // Attach user to request
    (req as any).user = keyRecord.user;
    (req as any).userId = keyRecord.user.id;

    next();
  };

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '0.1.0' });
  });

  // API routes (all require authentication)
  app.use('/v1', authenticate);

  // Wallet routes
  app.get('/v1/wallet/status', async (req, res) => {
    try {
      const user = (req as any).user;
      res.json({
        isSetup: user.safeDeployed && user.clobApiKeyCreated && user.approvalsGranted,
        eoaAddress: user.eoaAddress,
        safeAddress: user.safeAddress,
        safeDeployed: user.safeDeployed,
        clobApiKeyCreated: user.clobApiKeyCreated,
        approvalsGranted: user.approvalsGranted,
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // TODO: Add more routes (wallet/setup, trade, positions, markets)
  // These would mirror the production MCP server functionality

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  });

  // Server instance
  let httpServer: any = null;

  return {
    app,

    async listen(port = config.port || 3000): Promise<void> {
      return new Promise((resolve) => {
        httpServer = app.listen(port, () => {
          console.log(`🚀 Quantish server running on http://localhost:${port}`);
          resolve();
        });
      });
    },

    async close(): Promise<void> {
      if (httpServer) {
        await new Promise<void>((resolve) => httpServer.close(resolve));
      }
      await database.disconnect();
    },

    getDatabase: () => database,
    getKeyVault: () => keyVault,
  };
}

// CLI entry point
export async function cli(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'init':
      console.log('🔧 Initializing Quantish server...');
      console.log(`
Create a quantish.config.ts file:

import { createServer, PostgresAdapter } from '@quantish/server'

export default {
  database: new PostgresAdapter({
    connectionString: process.env.DATABASE_URL
  }),
  encryption: {
    masterKey: process.env.QUANTISH_MASTER_KEY
  }
}

Then run: npx quantish serve
      `);
      break;

    case 'generate-key':
      const { KeyVault } = await import('@quantish/core');
      const key = KeyVault.generateMasterKey();
      console.log('🔐 Generated master key (save this securely!):');
      console.log(key);
      break;

    case 'serve':
      console.log('🚀 Starting server...');
      console.log('Looking for quantish.config.ts...');
      // TODO: Load config and start server
      break;

    default:
      console.log(`
Quantish Server CLI

Commands:
  init          Create configuration file
  generate-key  Generate a new master encryption key
  serve         Start the server

Usage:
  npx quantish init
  npx quantish generate-key
  npx quantish serve
      `);
  }
}

// Run CLI if executed directly
if (require.main === module) {
  cli().catch(console.error);
}

