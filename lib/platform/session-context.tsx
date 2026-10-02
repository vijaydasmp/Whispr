'use client';

/**
 * lib/platform/session-context.tsx
 *
 * React context + provider for Dash Platform identity session state.
 * Testnet only - NOT for production use.
 *
 * Client-side only.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { PlatformSession, DashSdk } from '@/lib/platform/types';
import { EMPTY_SESSION } from '@/lib/platform/types';
import {
  hasStoredWallet,
  clearWalletStore,
  loadKeySessionIdentity,
  loadTabKey,
} from '@/lib/platform/wallet-store';
import { createPlatformClient } from '@/lib/platform/client';
import { resolveDpnsName, shortHandle } from '@/lib/platform/identity';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export type SessionContextValue = {
  session: PlatformSession;
  onLoginComplete(identityId: string, displayHandle: string): void;
  onStatusUpdate(
    status: PlatformSession['status'],
    extra?: Partial<PlatformSession>,
  ): void;
  logout(): void;
  sdk: DashSdk | null;
  setSdk(sdk: DashSdk): void;
  authKeyWif: string | null;
  setAuthKeyWif(wif: string | null): void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<PlatformSession>(EMPTY_SESSION);
  const [sdk, setSdkState] = useState<DashSdk | null>(null);
  const [authKeyWif, setAuthKeyWif] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const keyIdentityId = loadKeySessionIdentity();
    const tabKey = loadTabKey();
    if (keyIdentityId && tabKey) {
      setSession((s) => ({ ...s, status: 'connecting' }));
      void (async () => {
        try {
          const client = await createPlatformClient();
          setSdkState(client);
          const dpnsName = await resolveDpnsName(client, keyIdentityId);
          setAuthKeyWif(tabKey);
          setSession({
            status: 'ready',
            identityId: keyIdentityId,
            displayHandle: shortHandle(keyIdentityId, dpnsName),
            fundingAddress: null,
            errorMessage: null,
          });
        } catch {
          setSession(EMPTY_SESSION);
        }
      })();
      return;
    }

    if (hasStoredWallet()) {
      setSession((s) => ({ ...s, status: 'locked' }));
    }
  }, []);

  const onLoginComplete = useCallback(
    (identityId: string, displayHandle: string) => {
      setSession({
        status: 'ready',
        identityId,
        displayHandle,
        fundingAddress: null,
        errorMessage: null,
      });
    },
    [],
  );

  const onStatusUpdate = useCallback(
    (
      status: PlatformSession['status'],
      extra: Partial<PlatformSession> = {},
    ) => {
      setSession((s) => ({ ...s, status, ...extra }));
    },
    [],
  );

  const logout = useCallback(() => {
    clearWalletStore();
    setSession(EMPTY_SESSION);
    setSdkState(null);
    setAuthKeyWif(null);
  }, []);

  const setSdk = useCallback((s: DashSdk) => {
    setSdkState(s);
  }, []);

  const setAuthKeyWifCallback = useCallback((wif: string | null) => {
    setAuthKeyWif(wif);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        onLoginComplete,
        onStatusUpdate,
        logout,
        sdk,
        setSdk,
        authKeyWif,
        setAuthKeyWif: setAuthKeyWifCallback,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}