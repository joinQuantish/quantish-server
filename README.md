# @quantish/server

Self-hosted Quantish Trading MCP Server for Polymarket.

Run your own trading infrastructure with full control over your wallet keys.

## Installation

```bash
npm install @quantish/server
```

## Quick Start

```typescript
import { createServer, PostgresAdapter } from '@quantish/server';

const server = await createServer({
  database: new PostgresAdapter({
    connectionString: process.env.DATABASE_URL
  }),
  encryption: {
    masterKey: process.env.QUANTISH_MASTER_KEY
  }
});

server.listen(3000);
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `QUANTISH_MASTER_KEY` | 32-byte hex key for wallet encryption |
| `POLYMARKET_API_KEY` | Polymarket Builder API key (optional) |
| `POLYMARKET_API_SECRET` | Polymarket Builder API secret (optional) |
| `POLYMARKET_PASSPHRASE` | Polymarket Builder passphrase (optional) |

### Generate Master Key

```bash
npx quantish generate-key
```

## Database Setup

The server requires PostgreSQL. Run the included migrations:

```bash
npx prisma migrate deploy
```

Or use the provided schema to create tables manually.

## API Endpoints

### Health Check

```
GET /health
```

### Wallet Operations

```
GET  /v1/wallet/status    - Get wallet setup status
POST /v1/wallet/setup     - Initialize wallet (Safe deployment, approvals)
GET  /v1/wallet/balances  - Get USDC/MATIC balances
POST /v1/wallet/transfer  - Transfer USDC
```

### Trading Operations

```
POST   /v1/trade/buy           - Buy shares
POST   /v1/trade/sell          - Sell shares
POST   /v1/trade/order         - Place custom order
DELETE /v1/trade/orders/:id    - Cancel order
GET    /v1/trade/orders        - List orders
```

### Positions

```
GET  /v1/positions           - List positions
GET  /v1/positions/all       - Include transferred shares
GET  /v1/positions/claimable - Check for winnings
POST /v1/positions/claim     - Claim all winnings
```

## MCP Endpoint

For use with Quantish Agent CLI, expose a JSON-RPC 2.0 endpoint:

```
POST /mcp/execute
Content-Type: application/json
X-API-Key: <user-api-key>

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_balances",
    "arguments": {}
  },
  "id": 1
}
```

## Packages

This monorepo contains:

| Package | Description |
|---------|-------------|
| `@quantish/server` | Express server with trading endpoints |
| `@quantish/core` | Encryption, signing, wallet utilities |
| `@quantish/types` | TypeScript type definitions |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development
pnpm dev
```

## Security

- All private keys are encrypted with AES-256-GCM
- HMAC request signing supported
- API keys are hashed before storage
- Non-custodial: users can export their keys

## License

MIT

