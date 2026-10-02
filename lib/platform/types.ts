/**
 * lib/platform/types.ts
 *
 * Shared types for the Platform integration.
 *
 * Consumers import from here — never from @dashevo/evo-sdk directly.
 * All Platform access is client-side only.
 */

// ---------------------------------------------------------------------------
// Opaque SDK handle types
// ---------------------------------------------------------------------------

export type DashIdentity = {
  id: { toString(): string };
  publicKeys?: Array<{
    getPublicKeyHash(): string;
    purpose?: unknown;
    securityLevel?: unknown;
  }>;
  balance?: number | bigint;
  revision?: bigint;
};

export type PlatformDocument = {
  id: { toString(): string };
  ownerId: { toString(): string };
  createdAt?: bigint;
  revision?: bigint;
  properties: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Dash SDK abstraction
// ---------------------------------------------------------------------------

export type DashSdk = {
  connect(): Promise<void>;

  contracts: {
    fetch(contractId: string): Promise<unknown>;

    publish(opts: {
      dataContract: unknown;
      identityKey: unknown;
      signer: unknown;
    }): Promise<{ id: { toString(): string } }>;
  };

  documents: {
    query(opts: {
      dataContractId: string;
      documentTypeName: string;
      where?: Array<[string, string, unknown]>;
      orderBy?: Array<[string, string]>;
      limit?: number;
    }): Promise<Map<string, PlatformDocument | undefined>>;

    get(
      contractId: string,
      documentTypeName: string,
      documentId: string,
    ): Promise<unknown>;
    
    create(opts: {
      document: unknown;
      identityKey: unknown;
      signer: unknown;
    }): Promise<void>;

    replace(opts: {
      document: unknown;
      identityKey: unknown;
      signer: unknown;
    }): Promise<void>;

    delete(opts: {
      document: unknown;
      identityKey: unknown;
      signer: unknown;
    }): Promise<void>;
  };

  identities: {
    byPublicKeyHash(
      publicKeyHash: string,
    ): Promise<{ id: { toString(): string } } | null>;

    fetch(identityId: string): Promise<DashIdentity | null>;

    nonce(identityId: string): Promise<bigint | undefined>;
  };

  dpns: {
    usernames(opts: { identityId: string }): Promise<string[]>;
    resolveName(name: string): Promise<string | undefined>;
  };

  addresses: {
    get(bech32m: string): Promise<{ balance?: bigint } | undefined>;

    createIdentity(opts: {
      identity: unknown;
      inputs: Array<{ address: string; amount: bigint }>;
      identitySigner: unknown;
      addressSigner: unknown;
    }): Promise<{ identity: { id: { toString(): string } } }>;
  };

  version(): number;
};

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

export type SessionStatus =
  | 'idle'
  | 'locked'
  | 'connecting'
  | 'funding'
  | 'registering'
  | 'ready'
  | 'error';

export type PlatformSession = {
  status: SessionStatus;
  displayHandle: string | null;
  identityId: string | null;
  fundingAddress: string | null;
  errorMessage: string | null;
};

export const EMPTY_SESSION: PlatformSession = {
  status: 'idle',
  displayHandle: null,
  identityId: null,
  fundingAddress: null,
  errorMessage: null,
};