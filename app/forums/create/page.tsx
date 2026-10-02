'use client';

/**
 * app/forums/create/page.tsx
 *
 * Create a new forum on Dash Platform.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/platform/session-context';
import { getStoredContractId } from '@/lib/platform/contract';
import { createForum } from '@/lib/forum';

export default function CreateForumPage() {
  const router = useRouter();
  const { session, sdk, authKeyWif } = useSession();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!sdk || session.status !== 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Redirecting to login...
      </div>
    );
  }

  if (!authKeyWif) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-amber-700">You need to re-login to create a forum.</p>
        <Link href="/login" className="text-dash-blue hover:underline text-sm">
          Sign in again →
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 3) {
      setError('Forum name must be at least 3 characters');
      return;
    }

    const contractId = getStoredContractId();
    if (!contractId) {
      setError('No contract deployed yet. Please deploy the Whispr contract first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const forum = await createForum(
        sdk,
        contractId,
        session.identityId!,
        authKeyWif,
        name.trim(),
        description.trim(),
      );

      router.push(`/forums/${forum.$id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create forum');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-2xl font-bold text-gray-900">Whispr</Link>
          <span className="text-gray-300">/</span>
          <Link href="/forums" className="text-gray-600 hover:text-gray-900 text-sm">Forums</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 text-sm">Create</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Forum</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-lg border border-gray-200 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forum Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Crypto Confessions"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
              maxLength={64}
              required
            />
            <p className="mt-1 text-xs text-gray-400">3–64 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this forum about?"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none text-sm"
              maxLength={500}
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              {description.length} / 500 characters
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/forums"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-dash-blue text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm"
            >
              {loading ? 'Creating on Dash Platform...' : 'Create Forum'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}