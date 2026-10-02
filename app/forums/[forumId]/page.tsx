'use client';

/**
 * app/forums/[forumId]/page.tsx
 *
 * Forum detail page - view posts, join/leave, create posts.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from '@/lib/platform/session-context';
import { getStoredContractId } from '@/lib/platform/contract';
import {
  getForum,
  getForumPosts,
  getMemberCount,
  getMembership,
  joinForum,
  leaveForum,
  createPost,
  generatePseudonym,
} from '@/lib/forum';
import type { ForumDocument, PostDocument, MembershipDocument } from '@/lib/contracts/whisper-contract';

interface PostWithDetails extends PostDocument {
  authorPseudonym: string;
}

export default function ForumPage() {
  const router = useRouter();
  const params = useParams();
  const forumId = params.forumId as string;

  const { session, sdk, authKeyWif } = useSession();
  const [forum, setForum] = useState<ForumDocument | null>(null);
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [membership, setMembership] = useState<MembershipDocument | null>(null);
  const [memberCount, setMemberCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (session.status === 'idle') {
      router.push('/login');
    }
  }, [session.status, router]);

  // Load forum data
  useEffect(() => {
    if (!sdk || !forumId || session.status !== 'ready') return;

    const contractId = getStoredContractId();
    if (!contractId) {
      setError('No contract deployed yet. Please deploy the Whispr contract first.');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        // Load forum + counts + membership in parallel
        const [forumDoc, count, member] = await Promise.all([
          getForum(sdk, contractId, forumId),
          getMemberCount(sdk, contractId, forumId),
          session.identityId
            ? getMembership(sdk, contractId, session.identityId, forumId)
            : Promise.resolve(null),
        ]);

        if (!forumDoc) {
          setError('Forum not found');
          return;
        }
        setForum(forumDoc);
        setMemberCount(count);
        setMembership(member);

        // Load posts
        const postDocs = await getForumPosts(sdk, contractId, forumId, 50);
        setPosts(
          postDocs.map((post) => ({
            ...post,
            authorPseudonym: generatePseudonym(post.$ownerId, forumId),
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load forum');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sdk, forumId, session.identityId, session.status]);

  const handleJoin = async () => {
    if (!sdk || !session.identityId || !authKeyWif) return;
    const contractId = getStoredContractId();
    if (!contractId) return;

    setJoining(true);
    setError('');
    try {
      await joinForum(sdk, contractId, session.identityId, authKeyWif, forumId);
      const member = await getMembership(sdk, contractId, session.identityId, forumId);
      setMembership(member);
      setMemberCount((c) => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join forum');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!sdk || !session.identityId || !authKeyWif || !membership) return;
    const contractId = getStoredContractId();
    if (!contractId) return;

    setJoining(true);
    setError('');
    try {
      const revision = typeof (membership as unknown as { $revision?: bigint }).$revision === 'bigint'
        ? (membership as unknown as { $revision: bigint }).$revision
        : 1n;
      await leaveForum(sdk, contractId, session.identityId, authKeyWif, membership.$id, revision);
      setMembership(null);
      setMemberCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave forum');
    } finally {
      setJoining(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdk || !session.identityId || !authKeyWif || !newPostContent.trim()) return;
    const contractId = getStoredContractId();
    if (!contractId) return;

    setPosting(true);
    setError('');
    try {
      await createPost(sdk, contractId, session.identityId, authKeyWif, forumId, newPostContent.trim());

      // Reload posts
      const postDocs = await getForumPosts(sdk, contractId, forumId, 50);
      setPosts(
        postDocs.map((post) => ({
          ...post,
          authorPseudonym: generatePseudonym(post.$ownerId, forumId),
        })),
      );
      setNewPostContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (session.status !== 'ready' || !sdk) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading forum...
      </div>
    );
  }

  if (error && !forum) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error}</p>
        <Link href="/forums" className="text-dash-blue hover:underline">
          ← Back to forums
        </Link>
      </div>
    );
  }

  if (!forum) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/forums" className="hover:text-gray-900">← Forums</Link>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{forum.name}</h1>
              <p className="text-gray-600 text-sm mt-1">{forum.description}</p>
              <p className="text-gray-500 text-xs mt-1">{memberCount} members</p>
            </div>
            <div>
              {membership ? (
                <button
                  onClick={handleLeave}
                  disabled={joining}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
                >
                  {joining ? '...' : 'Leave'}
                </button>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining || !authKeyWif}
                  className="px-4 py-2 bg-dash-blue text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm"
                  title={!authKeyWif ? 'Re-login required to join' : ''}
                >
                  {joining ? 'Joining...' : 'Join'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* New Post Form (members only) */}
        {membership && authKeyWif ? (
          <form onSubmit={handleCreatePost} className="mb-8 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-700">New Post</span>
              <span className="text-xs text-gray-400">— posting as {membership.pseudonym}</span>
            </div>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dash-blue focus:border-transparent resize-none text-sm"
              maxLength={2000}
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-gray-400">{newPostContent.length} / 2000</span>
              <button
                type="submit"
                disabled={posting || !newPostContent.trim()}
                className="px-4 py-2 bg-dash-blue text-white text-sm rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {posting ? 'Posting...' : 'Publish'}
              </button>
            </div>
          </form>
        ) : !membership ? (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Join this forum to post.
          </div>
        ) : null}

        {/* Posts */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-700">
            {posts.length > 0 ? `${posts.length} posts` : 'No posts yet'}
          </h2>

          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200 text-gray-500 text-sm">
              {membership ? 'Be the first to post!' : 'Join to see and create posts.'}
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.$id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {post.authorPseudonym}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-500">
                    {formatDate(post.$createdAt)}
                  </span>
                </div>
                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}