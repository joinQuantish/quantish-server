/**
 * Safe Deployer - Deploy and manage Gnosis Safe wallets
 * Uses Polymarket's relayer for gasless deployment
 */

import { ethers } from 'ethers';

export interface SafeDeploymentConfig {
  /** The EOA owner address */
  ownerAddress: string;
  /** The signer wallet */
  signer: ethers.Wallet;
  /** Safe proxy factory address */
  proxyFactory?: string;
  /** Safe singleton address */
  singleton?: string;
}

export interface SafeDeploymentResult {
  /** The deployed Safe address */
  safeAddress: string;
  /** Whether deployment was successful */
  success: boolean;
  /** Transaction hash (if applicable) */
  txHash?: string;
  /** Error message (if failed) */
  error?: string;
}

// Polymarket contract addresses on Polygon
export const POLYGON_CONTRACTS = {
  safeProxyFactory: '0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b',
  safeSingleton: '0x69f4D1788e39c87893C980c06EdF4b7f686e2938',
  usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  nativeUsdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  wmatic: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  ctfExchange: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
  negRiskAdapter: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
  negRiskCtfExchange: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
  conditionalTokens: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
};

// Relayer ABI fragments
const RELAYER_ABI = [
  'function relay((address from, address to, address proxyWallet, bytes data, bytes signature)) external returns (bool)',
];

/**
 * Create a Safe deployment signature
 */
export async function createSafeDeploymentSignature(
  signer: ethers.Wallet,
  proxyFactory: string,
  proxyWallet: string
): Promise<string> {
  // Create the message to sign
  const messageHash = ethers.utils.solidityKeccak256(
    ['string', 'address', 'address', 'address'],
    ['SAFE-CREATE', signer.address, proxyFactory, proxyWallet]
  );

  // Sign the message
  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
  
  return signature;
}

/**
 * Calculate the Safe proxy address before deployment
 */
export function calculateSafeAddress(
  ownerAddress: string,
  proxyFactory: string = POLYGON_CONTRACTS.safeProxyFactory,
  singleton: string = POLYGON_CONTRACTS.safeSingleton
): string {
  // Safe initialization data
  const setupData = new ethers.utils.Interface([
    'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver)'
  ]).encodeFunctionData('setup', [
    [ownerAddress], // owners
    1,              // threshold
    ethers.constants.AddressZero,
    '0x',
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    0,
    ethers.constants.AddressZero,
  ]);

  // Calculate salt
  const saltNonce = 0;
  const salt = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['bytes32', 'uint256'],
      [ethers.utils.keccak256(setupData), saltNonce]
    )
  );

  // Proxy creation bytecode
  const proxyBytecode = `0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea264697066735822122003d1488ee65e08fa41e58e888a9865554c535f2c77126a82cb4c0f917f31441364736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564`;

  // Append singleton address
  const initCode = ethers.utils.solidityPack(
    ['bytes', 'uint256'],
    [proxyBytecode, singleton]
  );

  // Calculate CREATE2 address
  const proxyAddress = ethers.utils.getCreate2Address(
    proxyFactory,
    salt,
    ethers.utils.keccak256(initCode)
  );

  return proxyAddress;
}

/**
 * Create approval signatures for Polymarket contracts
 */
export async function createApprovalSignatures(
  signer: ethers.Wallet,
  safeAddress: string,
  contracts: {
    usdc?: string;
    ctfExchange?: string;
    negRiskCtfExchange?: string;
    negRiskAdapter?: string;
    conditionalTokens?: string;
  } = POLYGON_CONTRACTS
): Promise<{
  usdcApproval?: string;
  ctfApproval?: string;
  conditionalTokensApproval?: string;
}> {
  const signatures: Record<string, string> = {};

  // USDC approval for CTF Exchange
  if (contracts.usdc && contracts.ctfExchange) {
    const usdcInterface = new ethers.utils.Interface([
      'function approve(address spender, uint256 amount) returns (bool)'
    ]);
    const approveData = usdcInterface.encodeFunctionData('approve', [
      contracts.ctfExchange,
      ethers.constants.MaxUint256,
    ]);

    const messageHash = ethers.utils.solidityKeccak256(
      ['string', 'address', 'address', 'bytes'],
      ['SAFE-TX', safeAddress, contracts.usdc, approveData]
    );

    signatures.usdcApproval = await signer.signMessage(ethers.utils.arrayify(messageHash));
  }

  return signatures;
}

/**
 * Build a Safe transaction for the relayer
 */
export interface SafeTransaction {
  from: string;
  to: string;
  proxyWallet: string;
  data: string;
  signature: string;
}

export async function buildSafeTransaction(
  signer: ethers.Wallet,
  safeAddress: string,
  to: string,
  data: string
): Promise<SafeTransaction> {
  const messageHash = ethers.utils.solidityKeccak256(
    ['string', 'address', 'address', 'bytes'],
    ['SAFE-TX', safeAddress, to, data]
  );

  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

  return {
    from: signer.address,
    to,
    proxyWallet: safeAddress,
    data,
    signature,
  };
}

