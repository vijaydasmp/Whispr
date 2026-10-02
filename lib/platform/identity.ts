/**
 * lib/platform/identity.ts
 *
 * Identity registration, lookup, and DPNS name resolution wrappers.
 *
 * SOURCE: live Dash Platform (testnet DAPI)
 * Testnet only - NOT for production/mainnet use.
 *
 * Client-side only. Never import from server components.
 */

import { assertClientSide, loadSdkModule } from '@/lib/platform/sdk-module';
import { NETWORK } from '@/lib/platform/client';
import {
  AddressKeyManager,
  IdentityKeyManager,
} from '@/lib/platform/key-managers';
import type { DashSdk } from '@/lib/platform/types';

// ---------------------------------------------------------------------------
// Mnemonic generation
// ---------------------------------------------------------------------------

/** Generate a fresh BIP-39 mnemonic (12 words). */
export async function generateMnemonic(): Promise<string> {
  assertClientSide('generateMnemonic');
  const { wallet } = await loadSdkModule();
  return wallet.generateMnemonic();
}

// ---------------------------------------------------------------------------
// Address key manager (for funding address + identity creation)
// ---------------------------------------------------------------------------

/** Derives the primary Platform address (bech32m tdash1…) from a mnemonic. */
export async function deriveFundingAddress(
  mnemonic: string,
): Promise<string> {
  assertClientSide('deriveFundingAddress');
  const addrKm = await AddressKeyManager.create({
    sdk: null,
    mnemonic,
    network: NETWORK,
    count: 1,
  });
  return addrKm.primaryAddress.bech32m;
}

// ---------------------------------------------------------------------------
// Balance polling
// ---------------------------------------------------------------------------

/**
 * Returns the current balance (in credits) of a Platform address, or null
 * if the address has not yet appeared on-chain.
 */
export async function getFundingAddressBalance(
  sdk: DashSdk,
  bech32m: string,
): Promise<bigint | null> {
  assertClientSide('getFundingAddressBalance');
  try {
    const info = await sdk.addresses.get(bech32m);
    if (!info || info.balance === undefined) return null;
    return typeof info.balance === 'bigint'
      ? info.balance
      : BigInt(info.balance);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Identity registration
// ---------------------------------------------------------------------------

/** Credits transferred from the funding address to the new identity. */
const IDENTITY_FUNDING_CREDITS = 5_000_000n;

/**
 * Registers a new identity on testnet and returns its ID string.
 */
export async function registerIdentity(
  sdk: DashSdk,
  mnemonic: string,
  onLog?: (msg: string) => void,
): Promise<string> {
  assertClientSide('registerIdentity');
  const mod = await loadSdkModule();

  onLog?.('Deriving identity keys…');
  const [keyManager, addrKm] = await Promise.all([
    IdentityKeyManager.createForNewIdentity({
      sdk,
      mnemonic,
      network: NETWORK,
    }),
    AddressKeyManager.create({ sdk, mnemonic, network: NETWORK }),
  ]);

  onLog?.('Building identity shell…');
  const randomId = crypto.getRandomValues(new Uint8Array(32));
  const identity = new mod.Identity(new mod.Identifier(randomId));
  for (const key of keyManager.getKeysInCreation()) {
    identity.addPublicKey(key.toIdentityPublicKey());
  }

  onLog?.('Submitting identity creation state transition…');
  try {
    const result = await sdk.addresses.createIdentity({
      identity,
      inputs: [
        {
          address: addrKm.primaryAddress.bech32m,
          amount: IDENTITY_FUNDING_CREDITS,
        },
      ],
      identitySigner: keyManager.getFullSigner(),
      addressSigner: addrKm.getSigner(),
    });
    const id = result.identity.id.toString();
    onLog?.(`Identity registered: ${id}`);
    return id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const match = msg.match(/proof returned identity (\w+) but/);
    if (match) {
      const id = match[1];
      onLog?.(`Identity registered (proof quirk): ${id}`);
      return id;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Existing identity login
// ---------------------------------------------------------------------------

/**
 * Resolves the identity ID from a mnemonic (for returning users).
 */
export async function resolveIdentityFromMnemonic(
  sdk: DashSdk,
  mnemonic: string,
): Promise<string> {
  assertClientSide('resolveIdentityFromMnemonic');
  const km = await IdentityKeyManager.create({
    sdk,
    mnemonic,
    network: NETWORK,
  });
  if (!km.identityId) {
    throw new Error('No identity found for this recovery phrase on testnet.');
  }
  return km.identityId;
}

// ---------------------------------------------------------------------------
// DPNS name lookup
// ---------------------------------------------------------------------------

/** Returns the first registered DPNS name for an identity, or null. */
export async function resolveDpnsName(
  sdk: DashSdk,
  identityId: string,
): Promise<string | null> {
  assertClientSide('resolveDpnsName');
  try {
    const names = await sdk.dpns.usernames({ identityId });
    if (Array.isArray(names) && names.length > 0) return names[0];
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Key-based login
// ---------------------------------------------------------------------------

const PURPOSE_ORDER = [
  'AUTHENTICATION',
  'ENCRYPTION',
  'DECRYPTION',
  'TRANSFER',
  'SYSTEM',
  'VOTING',
  'OWNER',
];

const SECURITY_LEVEL_ORDER = ['MASTER', 'CRITICAL', 'HIGH', 'MEDIUM'];

function enumName(value: unknown, order: string[]): string {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return order[value] ?? String(value);
  }
  return String(value ?? '').toUpperCase();
}

export function assertSigningKey(key: {
  purpose?: unknown;
  securityLevel?: unknown;
}): void {
  const purpose = enumName(key.purpose, PURPOSE_ORDER);
  const level = enumName(key.securityLevel, SECURITY_LEVEL_ORDER);
  if (purpose === 'AUTHENTICATION' && (level === 'CRITICAL' || level === 'HIGH')) {
    return;
  }
  if (level === 'MASTER') {
    throw new Error(
      'That is your Master key — it can update your identity but cannot sign ' +
        'documents. Sign in with your High Auth or Critical Auth key.',
    );
  }
  throw new Error(
    `That key is a ${level} ${purpose} key — Whispr signs documents with a ` +
      'High or Critical authentication key.',
  );
}

export async function loginWithKey(
  sdk: DashSdk,
  usernameOrIdentityId: string,
  privateKeyWif: string,
): Promise<{ identityId: string; dpnsName: string | null }> {
  assertClientSide('loginWithKey');
  const mod = await loadSdkModule();

  let privateKey;
  try {
    privateKey = mod.PrivateKey.fromWIF(privateKeyWif.trim());
  } catch {
    throw new Error('That does not look like a valid private key (WIF format).');
  }
  const pubKeyHash = privateKey.getPublicKeyHash().toLowerCase();

  const input = usernameOrIdentityId.trim();
  let identityId: string;
  let typedName: string | null = null;

  if (input.includes('.')) {
    typedName = input.toLowerCase();
    const resolved = await sdk.dpns.resolveName(typedName);
    if (!resolved) {
      throw new Error(
        `No identity found on testnet for the name "${typedName}".`,
      );
    }
    identityId = resolved;
  } else if (input.length >= 30) {
    identityId = input;
  } else {
    const name = `${input.toLowerCase()}.dash`;
    const resolved = await sdk.dpns.resolveName(name);
    if (!resolved) {
      throw new Error(
        'Could not resolve that. Use your full username (e.g., alice.dash) or your identity ID.',
      );
    }
    typedName = name;
    identityId = resolved;
  }

  const identity = await sdk.identities.fetch(identityId);
  if (!identity) {
    throw new Error(
      'Identity not found on testnet. Whispr runs on testnet only.',
    );
  }

  const matchedKey = (identity.publicKeys ?? []).find(
    (k) => k.getPublicKeyHash().toLowerCase() === pubKeyHash,
  );
  if (!matchedKey) {
    throw new Error(
      'That private key does not match any key registered to this identity.',
    );
  }
  assertSigningKey(matchedKey);

  const dpnsName = typedName ?? (await resolveDpnsName(sdk, identityId));
  return { identityId: identity.id.toString(), dpnsName };
}

// ---------------------------------------------------------------------------
// Display handle helper
// ---------------------------------------------------------------------------

/** Short display handle: DPNS name if available, else 6…4 of the identity id. */
export function shortHandle(
  identityId: string,
  dpnsName: string | null,
): string {
  if (dpnsName) return dpnsName;
  if (identityId.length <= 12) return identityId;
  return `${identityId.slice(0, 6)}…${identityId.slice(-4)}`;
}