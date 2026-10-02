/**
 * lib/platform/types.ts
 *
 * Type definitions for Dash Platform integration.
 */

import type { EvoSDK } from '@dashevo/evo-sdk';

// Re-export DashSdk from EvoSDK
export type DashSdk = EvoSDK;

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

export type SessionStatus =
  | 'idle'       // Not logged in
  | 'locked'     // Wallet encrypted, needs passphrase
  | 'connecting' // Connecting to Platform
  | 'ready'      // Logged in and ready
  | 'error';     // Error state

export interface PlatformSession {
  status: SessionStatus;
  identityId: string | null;
  displayHandle: string | null;
  fundingAddress: string | null;
  errorMessage: string | null;
}

export const EMPTY_SESSION: PlatformSession = {
  status: 'idle',
  identityId: null,
  displayHandle: null,
  fundingAddress: null,
  errorMessage: null,
};