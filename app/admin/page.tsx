'use client';

/**
 * app/admin/page.tsx
 *
 * Admin page for deploying the Whispr contract to Dash Platform testnet.
 * This only needs to be done once.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/platform/session-context';
import {
  publishWhisperContract,
  getStoredContractId,
  storeContractId,
} from '@/lib/platform/contract';

export default function AdminPage() {
  const { session, sdk, authKeyWif } = useSession();
  const [deploying, setDeploying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [contractId, setContractId] = useState<string | null>(
    typeof window !== 'undefined' ? getStoredContractId() : null,
  );
  const [error, setError] = useState('');

  const handleDeploy = async () => {
    if (!sdk || !session.identityId || !authKeyWif) return;

    setDeploying(true);
    setLogs([]);
    setError('');

    try {
      const id = await publishWhisperContract(
        sdk,
        session.identityId,
        authKeyWif,
        (msg) => setLogs((prev) => [...prev, msg]),
      );
      setContractId(id);
      storeContractId(id);
      setLogs((prev) => [...prev, `✅ Done! Contract ID: ${id}`]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Deploy failed';
      setError(msg);
      setLogs((prev) => [...prev, `❌ Error: ${msg}`]);
    } finally {
      setDeploying(false);
    }
  };

  const handleSetExisting = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('contractId') as HTMLInputElement;
    const val = input.value.trim();
    if (val) {
      storeContractId(val);
      setContractId(val);
    }
  };

  const notReady = !sdk || session.status !== 'ready';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-2xl font-bold text-gray-900">Whispr</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 text-sm">Admin</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contract Admin</h1>
          <p className="text-gray-600 text-sm mt-1">
            Deploy the Whispr data contract to Dash Platform testnet once, then all users share it.
          </p>
        </div>

        {/* Current contract */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-2 text-sm">Current Contract</h2>
          {contractId ? (
            <div>
              <p className="text-xs text-gray-500 mb-1">Contract ID (stored in localStorage):</p>
              <code className="text-xs bg-gray-100 p-2 rounded block break-all">{contractId}</code>
              <Link
                href="/forums"
                className="inline-block mt-3 text-dash-blue hover:underline text-sm"
              >
                → Go to Forums
              </Link>
            </div>
          ) : (
            <p className="text-sm text-amber-700">
              No contract deployed yet. Deploy below or paste an existing contract ID.
            </p>
          )}
        </div>

        {/* Set existing contract ID */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-2 text-sm">Set Existing Contract ID</h2>
          <p className="text-xs text-gray-500 mb-3">
            If the contract was already deployed, paste the contract ID here.
          </p>
          <form onSubmit={handleSetExisting} className="flex gap-2">
            <input
              name="contractId"
              type="text"
              placeholder="Paste contract ID..."
              defaultValue={contractId ?? ''}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700"
            >
              Save
            </button>
          </form>
        </div>

        {/* Deploy */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-2 text-sm">Deploy New Contract</h2>
          <p className="text-xs text-gray-500 mb-3">
            This submits the Whispr contract to Dash Platform testnet. Requires a funded identity.
            Only deploy once — share the contract ID with all users.
          </p>

          {notReady && (
            <p className="text-amber-700 text-sm mb-3">
              Sign in first to deploy.{' '}
              <Link href="/login" className="underline">Login →</Link>
            </p>
          )}

          {!authKeyWif && !notReady && (
            <p className="text-amber-700 text-sm mb-3">
              Key-based login required for deployment.{' '}
              <Link href="/login" className="underline">Re-login →</Link>
            </p>
          )}

          {error && (
            <p className="text-red-600 text-sm mb-3">{error}</p>
          )}

          <button
            onClick={handleDeploy}
            disabled={deploying || notReady || !authKeyWif}
            className="px-4 py-2 bg-dash-blue text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {deploying ? 'Deploying...' : 'Deploy Contract'}
          </button>

          {logs.length > 0 && (
            <div className="mt-4 bg-gray-900 rounded-lg p-3 text-xs text-green-400 font-mono space-y-1 max-h-48 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}