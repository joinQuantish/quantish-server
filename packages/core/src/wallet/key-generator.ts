/**
 * Key Generator - Create and manage Ethereum wallets
 */

import { ethers } from 'ethers';
import { KeyVault, type EncryptedData } from '../crypto/key-vault';

export interface GeneratedWallet {
  /** Ethereum address (EOA) */
  address: string;
  /** Encrypted private key data */
  encryptedKey: EncryptedData;
}

export interface WalletFromKey {
  /** The ethers.js Wallet instance */
  wallet: ethers.Wallet;
  /** The address */
  address: string;
}

/**
 * Generate a new Ethereum wallet with encrypted private key
 */
export function generateWallet(keyVault: KeyVault): GeneratedWallet {
  // Generate a new random wallet
  const wallet = ethers.Wallet.createRandom();
  
  // Encrypt the private key
  const encryptedKey = keyVault.encrypt(wallet.privateKey);

  return {
    address: wallet.address,
    encryptedKey,
  };
}

/**
 * Recover a wallet from encrypted private key
 */
export function recoverWallet(
  keyVault: KeyVault,
  encryptedKey: EncryptedData,
  provider?: ethers.providers.Provider
): WalletFromKey {
  // Decrypt the private key
  const privateKey = keyVault.decrypt(encryptedKey);
  
  // Create wallet from private key
  const wallet = provider 
    ? new ethers.Wallet(privateKey, provider)
    : new ethers.Wallet(privateKey);

  return {
    wallet,
    address: wallet.address,
  };
}

/**
 * Derive the predicted Safe address for an EOA
 * Uses the Polymarket Safe proxy factory prediction
 */
export function predictSafeAddress(
  eoaAddress: string,
  safeProxyFactory: string = '0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b',
  safeSingleton: string = '0x69f4D1788e39c87893C980c06EdF4b7f686e2938'
): string {
  // This is a simplified prediction - actual Safe address depends on:
  // - Factory address
  // - Singleton address
  // - Owner(s)
  // - Threshold
  // - Salt/nonce
  
  // For Polymarket's setup, we use their specific factory and singleton
  const initializerData = ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256', 'address', 'bytes', 'address', 'address', 'uint256', 'address'],
    [
      [eoaAddress], // owners
      1,            // threshold
      ethers.constants.AddressZero, // to
      '0x',         // data
      ethers.constants.AddressZero, // fallbackHandler
      ethers.constants.AddressZero, // paymentToken
      0,            // payment
      ethers.constants.AddressZero, // paymentReceiver
    ]
  );

  // Calculate CREATE2 address
  const salt = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['bytes32', 'uint256'],
      [ethers.utils.keccak256(initializerData), 0]
    )
  );

  const proxyCreationCode = ethers.utils.solidityPack(
    ['bytes', 'uint256'],
    [
      '0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea264697066735822122003d1488ee65e08fa41e58e888a9865554c535f2c77126a82cb4c0f917f31441364736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564',
      safeSingleton
    ]
  );

  const proxyAddress = ethers.utils.getCreate2Address(
    safeProxyFactory,
    salt,
    ethers.utils.keccak256(proxyCreationCode)
  );

  return proxyAddress;
}

/**
 * Check if an address is a contract (deployed)
 */
export async function isContractDeployed(
  provider: ethers.providers.Provider,
  address: string
): Promise<boolean> {
  const code = await provider.getCode(address);
  return code !== '0x';
}

