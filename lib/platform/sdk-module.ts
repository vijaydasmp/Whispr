/**
 * lib/platform/sdk-module.ts
 *
 * Lazy-loads the Dash SDK module (EvoSDK) only on the client side.
 * This avoids issues with server-side rendering.
 */

import type { DashSdk } from '@/lib/platform/types';

let sdkModule: typeof import('@dashevo/evo-sdk') | null = null;
let loading: Promise<typeof import('@dashevo/evo-sdk')> | null = null;

/**
 * Asserts this is running in the browser (client-side).
 * Throws if called from server components.
 */
export function assertClientSide(funcName: string): void {
  if (typeof window === 'undefined') {
    throw new Error(`${funcName} must be called from client-side code only.`);
  }
}

/**
 * Loads and caches the EvoSDK module.
 */
export async function loadSdkModule(): Promise<typeof import('@dashevo/evo-sdk')> {
  assertClientSide('loadSdkModule');
  if (sdkModule) return sdkModule;
  if (loading) return loading;

  loading = import('@dashevo/evo-sdk');
  sdkModule = await loading;
  return sdkModule;
}

/**
 * Creates a typed DashSdk instance from an EvoSDK instance.
 */
export function castSdk(sdk: unknown): DashSdk {
  return sdk as DashSdk;
}