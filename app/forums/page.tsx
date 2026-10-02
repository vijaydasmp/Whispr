'use client';

/**
 * app/forums/page.tsx
 *
 * Forum discovery page - browse all forums on Dash Platform.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/platform/session-context';
import { getStoredContractId } from '@/lib/platform/contract';
import { getForums, getMemberCount, getPostCount } from '@/lib/forum';
import type { ForumDocument } from '@/lib/contracts/whisper-contract';

interface ForumWithCounts extends ForumDocument {
  memberCount: number;
  postCount: number;
}

export default function ForumsPage() {
  const router = useRouter();
  const { session, sdk } = useSession();
  const [forums, setForums] = useState<ForumWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (session.status === 'idle') {
      router.push('/login');
    }
  }, [session.status, router]);

  // Load forums
  useEffect(() => {
    if (!sdk || session.status !== 'ready') return;

    const contractId = getStoredContractId();
    if (!contractId) {
      setError('No contract deployed. Use the admin panel to deploy the Whispr contract first.');
      setLoading(false);
      return;
    }

    const loadForums = async () => {
      try {
        setLoading(true);
        const forumDocs = await getForums(sdk, contractId, 50);

        // Load counts in parallel
        const forumsWithCounts = await Promise.all(
          forumDocs.map(async (forum) => {
            const [memberCount, postCount] = await Promise.all([
              getMemberCount(sdk, contractId, forum.$id),
              getPostCount(sdk, contractId, forum.$id),
            ]);
            return { ...forum, memberCount, postCount };
          }),
        );

        setForums(forumsWithCounts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load forums');
      } finally {
        setLoading(false);
      }
    };

    loadForums();
  }, [sdk, session.status]);

  if (session.status !== 'ready' || !sdk) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Whispr
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-600 text-sm">Forums</span>
          </div>
          <span className="text-sm text-gray-500">{session.displayHandle}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Forums</h1>
          <Link
            href="/forums/create"
            className="px-4 py-2 bg-dash-blue text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
          >
            + Create Forum
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading forums...</div>
        ) : forums.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-3">No forums yet.</p>
            <Link href="/forums/create" className="text-dash-blue hover:underline text-sm">
              Create the first forum →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {forums.map((forum) => (
              <Link
                key={forum.$id}
                href={`/forums/${forum.$id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors"
              >
                <h3 className="font-semibold text-gray-900">{forum.name}</h3>
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                  {forum.description}
                </p>
                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                  <span>{forum.memberCount} members</span>
                  <span>{forum.postCount} posts</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}