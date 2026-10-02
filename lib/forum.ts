/**
 * lib/forum.ts
 *
 * Forum operations on Dash Platform.
 * Testnet only - NOT for production use.
 *
 * Client-side only.
 */

import { assertClientSide } from '@/lib/platform/sdk-module';
import type { DashSdk } from '@/lib/platform/types';
import {
  DOC_FORUM,
  DOC_MEMBERSHIP,
  DOC_POST,
  DOC_COMMENT,
  DOC_REACTION,
  type ForumDocument,
  type MembershipDocument,
  type PostDocument,
  type CommentDocument,
  type ReactionDocument,
} from '@/lib/contracts/whisper-contract';

// ---------------------------------------------------------------------------
// Helper: generate pseudonym from identity + forum
// ---------------------------------------------------------------------------

/**
 * Generate a pseudonymous display name for a user within a specific forum.
 * Uses a deterministic hash based on identity ID + forum ID.
 * 
 * Format: "Anonymous #XXXX" where XXXX is a hex suffix of the hash.
 * 
 * Note: This provides pseudonymous presentation only. The underlying
 * Platform identity is still visible as the document owner. This should
 * NOT be interpreted as cryptographic anonymity.
 */
export function generatePseudonym(identityId: string, forumId: string): string {
  // Simple hash combining both IDs
  const combined = identityId + forumId;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Positive hash only
  hash = Math.abs(hash);
  // Use last 4 hex digits for uniqueness
  const suffix = (hash % 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return `Anonymous #${suffix}`;
}

// ---------------------------------------------------------------------------
// Forum Operations
// ---------------------------------------------------------------------------

/**
 * Create a new forum on Dash Platform.
 */
export async function createForum(
  sdk: DashSdk,
  identityId: string,
  name: string,
  description: string,
): Promise<ForumDocument> {
  assertClientSide('createForum');
  
  const doc = await sdk.documents.create(DOC_FORUM, {
    name,
    description,
    status: 'active',
  });

  await sdk.documents.publish(DOC_FORUM, doc);
  
  return doc.toObject() as ForumDocument;
}

/**
 * Get all forums (paginated).
 */
export async function getForums(
  sdk: DashSdk,
  limit = 20,
  startAfter?: string,
): Promise<ForumDocument[]> {
  assertClientSide('getForums');
  
  const opts: Record<string, unknown> = {
    limit,
    orderBy: { $createdAt: 'desc' },
  };
  
  if (startAfter) {
    opts.startAfter = startAfter;
  }

  const docs = await sdk.documents.get(DOC_FORUM, opts);
  return (docs ?? []).map((d: unknown) => (d as { toObject: () => ForumDocument }).toObject()) as ForumDocument[];
}

/**
 * Get a single forum by ID.
 */
export async function getForum(
  sdk: DashSdk,
  forumId: string,
): Promise<ForumDocument | null> {
  assertClientSide('getForum');
  
  try {
    const doc = await sdk.documents.get(DOC_FORUM, {
      where: [{ $id: forumId }],
      limit: 1,
    });
    if (!doc || doc.length === 0) return null;
    return (doc[0] as { toObject: () => ForumDocument }).toObject() as ForumDocument;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Membership Operations
// ---------------------------------------------------------------------------

/**
 * Join a forum (create membership document).
 */
export async function joinForum(
  sdk: DashSdk,
  identityId: string,
  forumId: string,
): Promise<MembershipDocument> {
  assertClientSide('joinForum');
  
  const pseudonym = generatePseudonym(identityId, forumId);
  
  const doc = await sdk.documents.create(DOC_MEMBERSHIP, {
    forumId,
    pseudonym,
    status: 'active',
  });

  await sdk.documents.publish(DOC_MEMBERSHIP, doc);
  
  return doc.toObject() as MembershipDocument;
}

/**
 * Leave a forum (update membership status).
 */
export async function leaveForum(
  sdk: DashSdk,
  membershipId: string,
): Promise<void> {
  assertClientSide('leaveForum');
  
  const doc = await sdk.documents.update(DOC_MEMBERSHIP, membershipId, {
    status: 'left',
  });
  
  await sdk.documents.publish(DOC_MEMBERSHIP, doc);
}

/**
 * Get user's membership for a forum.
 */
export async function getMembership(
  sdk: DashSdk,
  identityId: string,
  forumId: string,
): Promise<MembershipDocument | null> {
  assertClientSide('getMembership');
  
  const docs = await sdk.documents.get(DOC_MEMBERSHIP, {
    where: [
      { $ownerId: identityId },
      { forumId },
      { status: 'active' },
    ],
    limit: 1,
  });
  
  if (!docs || docs.length === 0) return null;
  return (docs[0] as { toObject: () => MembershipDocument }).toObject() as MembershipDocument;
}

/**
 * Get all members of a forum.
 */
export async function getForumMembers(
  sdk: DashSdk,
  forumId: string,
  limit = 50,
): Promise<MembershipDocument[]> {
  assertClientSide('getForumMembers');
  
  const docs = await sdk.documents.get(DOC_MEMBERSHIP, {
    where: [{ forumId }, { status: 'active' }],
    limit,
    orderBy: { $createdAt: 'asc' },
  });
  
  return (docs ?? []).map((d: unknown) => (d as { toObject: () => MembershipDocument }).toObject()) as MembershipDocument[];
}

/**
 * Get member count for a forum.
 */
export async function getMemberCount(
  sdk: DashSdk,
  forumId: string,
): Promise<number> {
  assertClientSide('getMemberCount');
  
  const docs = await sdk.documents.get(DOC_MEMBERSHIP, {
    where: [{ forumId }, { status: 'active' }],
    limit: 0, // Just count, no data needed
  });
  
  return Array.isArray(docs) ? docs.length : 0;
}

// ---------------------------------------------------------------------------
// Post Operations
// ---------------------------------------------------------------------------

/**
 * Create a new post in a forum.
 */
export async function createPost(
  sdk: DashSdk,
  forumId: string,
  content: string,
): Promise<PostDocument> {
  assertClientSide('createPost');
  
  const doc = await sdk.documents.create(DOC_POST, {
    forumId,
    content,
    status: 'active',
  });

  await sdk.documents.publish(DOC_POST, doc);
  
  return doc.toObject() as PostDocument;
}

/**
 * Get posts in a forum.
 */
export async function getForumPosts(
  sdk: DashSdk,
  forumId: string,
  limit = 20,
  startAfter?: string,
): Promise<PostDocument[]> {
  assertClientSide('getForumPosts');
  
  const opts: Record<string, unknown> = {
    where: [{ forumId }, { status: 'active' }],
    limit,
    orderBy: { $createdAt: 'desc' },
  };
  
  if (startAfter) {
    opts.startAfter = startAfter;
  }

  const docs = await sdk.documents.get(DOC_POST, opts);
  return (docs ?? []).map((d: unknown) => (d as { toObject: () => PostDocument }).toObject()) as PostDocument[];
}

/**
 * Get a single post by ID.
 */
export async function getPost(
  sdk: DashSdk,
  postId: string,
): Promise<PostDocument | null> {
  assertClientSide('getPost');
  
  try {
    const docs = await sdk.documents.get(DOC_POST, {
      where: [{ $id: postId }],
      limit: 1,
    });
    if (!docs || docs.length === 0) return null;
    return (docs[0] as { toObject: () => PostDocument }).toObject() as PostDocument;
  } catch {
    return null;
  }
}

/**
 * Get post count for a forum.
 */
export async function getPostCount(
  sdk: DashSdk,
  forumId: string,
): Promise<number> {
  assertClientSide('getPostCount');
  
  const docs = await sdk.documents.get(DOC_POST, {
    where: [{ forumId }, { status: 'active' }],
    limit: 0,
  });
  
  return Array.isArray(docs) ? docs.length : 0;
}

// ---------------------------------------------------------------------------
// Comment Operations
// ---------------------------------------------------------------------------

/**
 * Create a comment on a post.
 */
export async function createComment(
  sdk: DashSdk,
  postId: string,
  forumId: string,
  content: string,
): Promise<CommentDocument> {
  assertClientSide('createComment');
  
  const doc = await sdk.documents.create(DOC_COMMENT, {
    postId,
    forumId,
    content,
    status: 'active',
  });

  await sdk.documents.publish(DOC_COMMENT, doc);
  
  return doc.toObject() as CommentDocument;
}

/**
 * Get comments for a post.
 */
export async function getPostComments(
  sdk: DashSdk,
  postId: string,
  limit = 50,
): Promise<CommentDocument[]> {
  assertClientSide('getPostComments');
  
  const docs = await sdk.documents.get(DOC_COMMENT, {
    where: [{ postId }, { status: 'active' }],
    limit,
    orderBy: { $createdAt: 'asc' },
  });
  
  return (docs ?? []).map((d: unknown) => (d as { toObject: () => CommentDocument }).toObject()) as CommentDocument[];
}

/**
 * Get comment count for a post.
 */
export async function getCommentCount(
  sdk: DashSdk,
  postId: string,
): Promise<number> {
  assertClientSide('getCommentCount');
  
  const docs = await sdk.documents.get(DOC_COMMENT, {
    where: [{ postId }, { status: 'active' }],
    limit: 0,
  });
  
  return Array.isArray(docs) ? docs.length : 0;
}

// ---------------------------------------------------------------------------
// Reaction Operations
// ---------------------------------------------------------------------------

/**
 * Add a like to a post.
 */
export async function addReaction(
  sdk: DashSdk,
  postId: string,
  forumId: string,
): Promise<ReactionDocument> {
  assertClientSide('addReaction');
  
  const doc = await sdk.documents.create(DOC_REACTION, {
    postId,
    forumId,
    type: 'like',
  });

  await sdk.documents.publish(DOC_REACTION, doc);
  
  return doc.toObject() as ReactionDocument;
}

/**
 * Remove a like from a post.
 */
export async function removeReaction(
  sdk: DashSdk,
  identityId: string,
  postId: string,
): Promise<void> {
  assertClientSide('removeReaction');
  
  const docs = await sdk.documents.get(DOC_REACTION, {
    where: [
      { $ownerId: identityId },
      { postId },
    ],
    limit: 1,
  });
  
  if (docs && docs.length > 0) {
    const reactionDoc = docs[0] as { getId: () => string };
    await sdk.documents.delete(DOC_REACTION, reactionDoc.getId());
  }
}

/**
 * Get user's reaction on a post.
 */
export async function getUserReaction(
  sdk: DashSdk,
  identityId: string,
  postId: string,
): Promise<ReactionDocument | null> {
  assertClientSide('getUserReaction');
  
  const docs = await sdk.documents.get(DOC_REACTION, {
    where: [
      { $ownerId: identityId },
      { postId },
    ],
    limit: 1,
  });
  
  if (!docs || docs.length === 0) return null;
  return (docs[0] as { toObject: () => ReactionDocument }).toObject() as ReactionDocument;
}

/**
 * Get reaction count for a post.
 */
export async function getReactionCount(
  sdk: DashSdk,
  postId: string,
): Promise<number> {
  assertClientSide('getReactionCount');
  
  const docs = await sdk.documents.get(DOC_REACTION, {
    where: [{ postId }],
    limit: 0,
  });
  
  return Array.isArray(docs) ? docs.length : 0;
}

// ---------------------------------------------------------------------------
// Pseudonym Resolution
// ---------------------------------------------------------------------------

/**
 * Get the pseudonym for a user in a forum from their membership.
 * Returns null if user is not a member.
 */
export async function getUserPseudonym(
  sdk: DashSdk,
  identityId: string,
  forumId: string,
): Promise<string | null> {
  const membership = await getMembership(sdk, identityId, forumId);
  return membership?.pseudonym ?? null;
}

/**
 * Get pseudonyms for multiple users in a forum.
 * Returns a map of identityId -> pseudonym.
 */
export async function getPseudonyms(
  sdk: DashSdk,
  forumId: string,
  identityIds: string[],
): Promise<Map<string, string>> {
  const pseudonyms = new Map<string, string>();
  
  if (identityIds.length === 0) return pseudonyms;
  
  const members = await getForumMembers(sdk, forumId, 100);
  
  for (const member of members) {
    if (identityIds.includes(member.$ownerId)) {
      pseudonyms.set(member.$ownerId, member.pseudonym);
    }
  }
  
  return pseudonyms;
}