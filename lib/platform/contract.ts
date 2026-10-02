/**
 * lib/platform/contract.ts
 *
 * Publishing and locating the Whispr data contract on Dash Platform testnet.
 *
 * Client-side only. Never import from server components.
 */

import { assertClientSide, loadSdkModule } from '@/lib/platform/sdk-module';
import { assertSigningKey } from '@/lib/platform/identity';
import type { DashSdk } from '@/lib/platform/types';
import { WHISPER_CONTRACT_DEFINITION } from '@/lib/contracts/whisper-contract';

const KEY_CONTRACT_ID = 'whispr:platform:v1:contractid';

/**
 * The canonical deployed Whispr contract ID on testnet.
 * Set NEXT_PUBLIC_WHISPR_CONTRACT_ID in environment variables after deploying.
 */
export const KNOWN_CONTRACT_ID =
  process.env.NEXT_PUBLIC_WHISPR_CONTRACT_ID ?? '';

export function getStoredContractId(): string | null {
  assertClientSide('getStoredContractId');
  const canonical = KNOWN_CONTRACT_ID || null;
  if (canonical) {
    try {
      localStorage.setItem(KEY_CONTRACT_ID, canonical);
    } catch {
      // Storage unavailable
    }
    return canonical;
  }
  return localStorage.getItem(KEY_CONTRACT_ID);
}

export function storeContractId(id: string): void {
  assertClientSide('storeContractId');
  localStorage.setItem(KEY_CONTRACT_ID, id);
}

export function buildWhisperSchemas(): Record<string, object> {
  const docs = WHISPER_CONTRACT_DEFINITION.documents as Record<string, object>;
  const schemas: Record<string, object> = {};
  for (const [name, schema] of Object.entries(docs)) {
    schemas[name] = schema;
  }
  return schemas;
}

// Shape returned by getSigningContext — identityKey and signer are typed as
// `any` intentionally. The evo-sdk exposes IdentityPublicKey only through the
// compiled wasm layer; TypeScript cannot narrow the publicKeys array element
// to that concrete class without importing from @dashevo/wasm-sdk directly.
// At runtime these ARE the correct IdentityPublicKey / IdentitySigner
// instances that DocumentCreateOptions.identityKey requires.
export type SigningContext = {
  mod: any;
  identityKey: any;
  signer: any;
};

/**
 * Resolve signing context: match WIF against the identity's registered keys.
 *
 * `identityKey` is typed as `any` so it satisfies the wasm SDK's
 * DocumentCreateOptions.identityKey: IdentityPublicKey without a cast at
 * every call site. The value is a genuine IdentityPublicKey instance —
 * obtained from sdk.identities.fetch().publicKeys — just not statically
 * typed as such here due to the wasm import boundary.
 */
export async function getSigningContext(
  sdk: DashSdk,
  identityId: string,
  wif: string,
): Promise<SigningContext> {
  assertClientSide('getSigningContext');
  const mod = await loadSdkModule();
  const identity = await sdk.identities.fetch(identityId);
  const keys = identity?.publicKeys ?? [];
  if (keys.length === 0) {
    throw new Error('Identity not found or has no registered keys.');
  }
  const privateKey = mod.PrivateKey.fromWIF(wif);
  const pubKeyHash = privateKey.getPublicKeyHash().toLowerCase();
  const identityKey = keys.find(
    (k) => k.getPublicKeyHash().toLowerCase() === pubKeyHash,
  );
  if (!identityKey) {
    throw new Error(
      'The logged-in key is not registered to this identity.',
    );
  }
  assertSigningKey(identityKey);
  const signer = new mod.IdentitySigner();
  signer.addKeyFromWif(wif);
  return { mod, identityKey, signer };
}

/**
 * Publish the Whispr data contract to Platform testnet. One-time per identity.
 */
export async function publishWhisperContract(
  sdk: DashSdk,
  identityId: string,
  authKeyWif: string,
  onLog?: (msg: string) => void,
): Promise<string> {
  assertClientSide('publishWhisperContract');
  const { mod, identityKey, signer } = await getSigningContext(
    sdk,
    identityId,
    authKeyWif,
  );

  const identityNonce = await sdk.identities.nonce(identityId);

  onLog?.('Building the Whispr data contract…');
  const dataContract = new mod.DataContract({
    ownerId: identityId,
    identityNonce: (identityNonce ?? BigInt(0)) + BigInt(1),
    schemas: buildWhisperSchemas(),
    fullValidation: true,
  });

  onLog?.('Publishing contract to Platform testnet…');
  const published = await sdk.contracts.publish({
    dataContract,
    identityKey,
    signer,
  });
  const id = published.id.toString();
  storeContractId(id);
  onLog?.(`Contract published: ${id}`);
  return id;
}

/**
 * Ensure the Whispr contract is published. Returns the contract ID.
 */
export async function ensureContractPublished(
  sdk: DashSdk,
  identityId: string,
  authKeyWif: string,
  onLog?: (msg: string) => void,
): Promise<string> {
  assertClientSide('ensureContractPublished');
  const canonical = KNOWN_CONTRACT_ID;
  if (canonical) {
    try {
      const existing = await sdk.contracts.fetch(canonical);
      if (existing) return canonical;
    } catch {
      onLog?.('Canonical contract could not be fetched.');
    }
    return canonical;
  }
  const stored = getStoredContractId();
  if (stored) {
    try {
      const existing = await sdk.contracts.fetch(stored);
      if (existing) return stored;
    } catch {
      /* fall through and publish */
    }
  }
  return publishWhisperContract(sdk, identityId, authKeyWif, onLog);
}
