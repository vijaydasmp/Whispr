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
  authorPseudonym?: string;
}

export default function ForumPage() {
  const router = useRouter();
  const params = useParams();
  const forumId = params.forumId as string;
  
  const { session, sdk } = useSession();
  const [forum, setForum] = useState<ForumDocument | null>(null);
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [membership, setMembership] = useState<MembershipDocument | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load forum
        const forumDoc = await getForum(sdk, forumId);
        if (!forumDoc) {
          setError('Forum not found');
          return;
        }
        setForum(forumDoc);
        
        // Load member count
        const count = await getMemberCount(sdk, forumId);
        setMemberCount(count);
        
        // Load membership if logged in
        if (session.identityId) {
          const member = await getMembership(sdk, session.identityId, forumId);
          setMembership(member);
        }
        
        // Load posts
        const postDocs = await getForumPosts(sdk, forumId, 50);
        
        // Add pseudonyms to posts
        const postsWithPseudonyms = postDocs.map((post) => ({
          ...post,
          authorPseudonym: generatePseudonym(post.$ownerId, forumId),
        }));
        
        setPosts(postsWithPseudonyms);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load forum');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sdk, forumId, session.identityId, session.status]);

  const handleJoin = async () => {
    if (!sdk || !session.identityId) return;
    
    try {
      await joinForum(sdk, session.identityId, forumId);
      const member = await getMembership(sdk, session.identityId, forumId);
      setMembership(member);
      setMemberCount((c) => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join forum');
    }
  };

  const handleLeave = async () => {
    if (!sdk || !membership) return;
    
    try {
      await leaveForum(sdk, membership.$id);
      setMembership(null);
      setMemberCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave forum');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdk || !newPostContent.trim()) return;
    
    setPosting(true);
    setError('');
    
    try {
      await createPost(sdk, forumId, newPostContent.trim());
      
      // Reload posts
      const postDocs = await getForumPosts(sdk, forumId, 50);
      const postsWithPseudonyms = postDocs.map((post) => ({
        ...post,
        authorPseudonym: generatePseudonym(post.$ownerId, forumId),
      }));
      setPosts(postsWithPseudonyms);
      
      setNewPostContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (session.status !== 'ready' || !sdk) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading forum...</div>
      </div>
    );
  }

  if (error && !forum) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/forums" className="text-dash-blue hover:underline">
          Back to forums
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
            <Link href="/forums" className="hover:text-gray-700">
              Forums
            </Link>
            <span>/</span>
            <span>{forum.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{forum.name}</h1>
              <p className="text-gray-600 text-sm">{forum.description}</p>
              <p className="text-gray-500 text-sm mt-1">{memberCount} members</p>
            </div>
            <div>
              {membership ? (
                <button
                  onClick={handleLeave}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Leave
                </button>
              ) : (
                <button
                  onClick={handleJoin}
                  className="px-4 py-2 bg-dash-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Join
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* New Post Form */}
        {membership ? (
          <form onSubmit={handleCreatePost} className="mb-8 bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">New Post</h3>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Share your confession..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dash-blue focus:border-transparent resize-none"
              maxLength={2000}
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-gray-500">
                {newPostContent.length}/2000
              </span>
              <button
                type="submit"
                disabled={posting || !newPostContent.trim()}
                className="px-4 py-2 bg-dash-blue text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800">
              Join this forum to create posts.
            </p>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Posts</h2>
          
          {posts.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">No posts yet.</p>
              {membership && (
                <p className="text-gray-500 text-sm mt-1">Be the first to post!</p>
              )}
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.$id}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">
                    {post.authorPseudonym}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-500">
                    {formatDate(post.$createdAt)}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}