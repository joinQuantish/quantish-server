/**
 * Relayer Client - Interface with Polymarket's gasless relayer
 */

import { ethers } from 'ethers';
import type { SafeTransaction } from '../wallet/safe-deployer';

export interface RelayerConfig {
  /** Relayer endpoint URL */
  endpoint: string;
  /** Request timeout in ms */
  timeout?: number;
}

export interface RelayerResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

export class RelayerClient {
  private readonly endpoint: string;
  private readonly timeout: number;

  constructor(config: RelayerConfig) {
    this.endpoint = config.endpoint;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Submit a transaction to the relayer
   */
  async relay(transaction: SafeTransaction): Promise<RelayerResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.endpoint}/relay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Relayer error: ${response.status} - ${error}`,
        };
      }

      const result = await response.json() as { txHash?: string; transactionHash?: string };

      return {
        success: true,
        txHash: result.txHash || result.transactionHash,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown relayer error',
      };
    }
  }

  /**
   * Deploy a Safe wallet via relayer
   */
  async deploySafe(params: {
    ownerAddress: string;
    proxyWallet: string;
    proxyFactory: string;
    signature: string;
  }): Promise<RelayerResponse> {
    const transaction: SafeTransaction = {
      from: params.ownerAddress,
      to: params.proxyFactory,
      proxyWallet: params.proxyWallet,
      data: '0x',
      signature: params.signature,
    };

    return this.relay(transaction);
  }

  /**
   * Execute a Safe transaction via relayer
   */
  async executeTransaction(params: {
    safeAddress: string;
    to: string;
    data: string;
    ownerAddress: string;
    signature: string;
  }): Promise<RelayerResponse> {
    const transaction: SafeTransaction = {
      from: params.ownerAddress,
      to: params.to,
      proxyWallet: params.safeAddress,
      data: params.data,
      signature: params.signature,
    };

    return this.relay(transaction);
  }
}

/**
 * Default Polymarket relayer endpoint
 */
export const POLYMARKET_RELAYER = 'https://relayer.polymarket.com';

/**
 * Create a relayer client with default Polymarket config
 */
export function createPolymarketRelayer(): RelayerClient {
  return new RelayerClient({
    endpoint: POLYMARKET_RELAYER,
  });
}

