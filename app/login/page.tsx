'use client';

/**
 * app/login/page.tsx
 *
 * Login page for Whispr - Dash Platform testnet identity login.
 * Supports Dash Platform testnet identity login using a private key (WIF).
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/platform/session-context';
import { createPlatformClient } from '@/lib/platform/client';
import { loginWithKey } from '@/lib/platform/identity';
import {
  storeKeySessionIdentity,
  storeTabKey,
  loadAnonHandle,
  storeAnonHandle,
} from '@/lib/platform/wallet-store';
import { generateAnonymousHandle } from '@/lib/forum';

export default function LoginPage() {
  const router = useRouter();
  const { session, onLoginComplete, onStatusUpdate, setSdk, setAuthKeyWif } = useSession();
  const [username, setUsername] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      onStatusUpdate('connecting');
      const sdk = await createPlatformClient();
      setSdk(sdk);

      const result = await loginWithKey(sdk, username, privateKey);

      // Store key session
      storeKeySessionIdentity(result.identityId);
      storeTabKey(privateKey);
      setAuthKeyWif(privateKey);

      // Assign (or reuse) this identity's anonymous display handle. The
      // identity still owns everything it signs; this only decides the name
      // shown next to posts and comments.
      const handle =
        loadAnonHandle(result.identityId) ?? generateAnonymousHandle();
      storeAnonHandle(result.identityId, handle);

      onLoginComplete(result.identityId, handle);

      router.push('/forums');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      onStatusUpdate('error', { errorMessage: msg });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Whispr
          </Link>
        </div>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Sign in with Dash
            </h2>
            <p className="text-sm text-gray-500 mb-6 text-center">
              Connect your Dash Platform testnet identity
            </p>


            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleKeyLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username or Identity ID
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., alice.dash or identityId"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dash-blue focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Private Key (WIF)
                </label>
                <input
                  type="password"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="Your private key in WIF format"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dash-blue focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-dash-blue text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                <span className="text-amber-600 font-medium">Testnet Only</span> — Not for production use
              </p>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-gray-500">
            <Link href="/" className="text-dash-blue hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}