/**
 * lib/platform/wallet-store.ts
 *
 * LocalStorage persistence for encrypted wallet and session data.
 * Testnet only - NOT for production use.
 *
 * Client-side only.
 */

import { assertClientSide } from '@/lib/platform/sdk-module';

const STORAGE_KEYS = {
  ENCRYPTED_WALLET: 'whispr_encrypted_wallet',
  KEY_SESSION_IDENTITY: 'whispr_key_session_identity',
  TAB_KEY: 'whispr_tab_key',
} as const;

/**
 * Check if an encrypted wallet exists in storage.
 */
export function hasStoredWallet(): boolean {
  assertClientSide('hasStoredWallet');
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(STORAGE_KEYS.ENCRYPTED_WALLET);
}

/**
 * Store encrypted wallet (JSON string).
 */
export function storeWallet(encryptedJson: string): void {
  assertClientSide('storeWallet');
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ENCRYPTED_WALLET, encryptedJson);
}

/**
 * Retrieve encrypted wallet.
 */
export function loadWallet(): string | null {
  assertClientSide('loadWallet');
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.ENCRYPTED_WALLET);
}

/**
 * Clear all wallet storage.
 */
export function clearWalletStore(): void {
  assertClientSide('clearWalletStore');
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.ENCRYPTED_WALLET);
  localStorage.removeItem(STORAGE_KEYS.KEY_SESSION_IDENTITY);
  localStorage.removeItem(STORAGE_KEYS.TAB_KEY);
}

/**
 * Store key-based session identity (persists within tab).
 */
export function storeKeySessionIdentity(identityId: string): void {
  assertClientSide('storeKeySessionIdentity');
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.KEY_SESSION_IDENTITY, identityId);
}

/**
 * Load key-based session identity.
 */
export function loadKeySessionIdentity(): string | null {
  assertClientSide('loadKeySessionIdentity');
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.KEY_SESSION_IDENTITY);
}

/**
 * Store tab key (in-memory only - cleared on tab close).
 */
export function storeTabKey(wif: string): void {
  assertClientSide('storeTabKey');
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEYS.TAB_KEY, wif);
}

/**
 * Load tab key.
 */
export function loadTabKey(): string | null {
  assertClientSide('loadTabKey');
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEYS.TAB_KEY);
}

/**
 * Clear tab key.
 */
export function clearTabKey(): void {
  assertClientSide('clearTabKey');
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEYS.TAB_KEY);
}

/**
 * Clear key session.
 */
export function clearKeySession(): void {
  assertClientSide('clearKeySession');
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.KEY_SESSION_IDENTITY);
  sessionStorage.removeItem(STORAGE_KEYS.TAB_KEY);
}