/**
 * lib/forum.ts
 *
 * Forum operations on Dash Platform.
 * Uses evo-sdk v4 document API patterns:
 *   - Read:  sdk.documents.query({ dataContractId, documentTypeName, where, limit })
 *   - Write: sdk.documents.create({ document: new mod.Document({...}), identityKey, signer })
 *
 * Testnet only - NOT for production use.
 * Client-side only.
 */

import { assertClientSide, loadSdkModule } from '@/lib/platform/sdk-module';
import { getSigningContext } from '@/lib/platform/contract';
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
// Pseudonym generation
// ---------------------------------------------------------------------------

/**
 * Generate a pseudonymous display name for a user within a specific forum.
 * Uses a deterministic hash based on identityId + forumId.
 *
 * Format: "Anonymous #XXXX"
 *
 * NOTE: This is pseudonymous presentation only. The underlying Platform
 * identity is still stored as the document $ownerId and is publicly visible.
 * This must NOT be interpreted as cryptographic anonymity.
 */
export function generatePseudonym(identityId: string, forumId: string): string {
  const combined = identityId + forumId;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const suffix = (Math.abs(hash) % 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');
  return `Anonymous #${suffix}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a raw SDK document result to a typed object. */
function docToObject<T>(doc: unknown): T {
  if (doc && typeof doc === 'object' && 'toObject' in doc) {
    const object = (doc as { toObject(): Record<string, unknown> }).toObject();

    if (object.$id && typeof object.$id !== 'string') {
      object.$id = String(object.$id);
    }

    if (object.$ownerId && typeof object.$ownerId !== 'string') {
      object.$ownerId = String(object.$ownerId);
    }

    if (object.$dataContractId && typeof object.$dataContractId !== 'string') {
      object.$dataContractId = String(object.$dataContractId);
    }

    return object as T;
  }

  return doc as T;
 }

// ---------------------------------------------------------------------------
// Forum Operations
// ---------------------------------------------------------------------------

/**
 * Create a new forum on Dash Platform.
 */
export async function createForum(
  sdk: DashSdk,
  contractId: string,
  identityId: string,
  authKeyWif: string,
  name: string,
  description: string,
): Promise<ForumDocument> {
  assertClientSide('createForum');
  const { mod, identityKey, signer } = await getSigningContext(
    sdk,
    identityId,
    authKeyWif,
  );

  const document = new mod.Document({
    properties: { name, description, status: 'active' },
    documentTypeName: DOC_FORUM,
    dataContractId: contractId,
    ownerId: identityId,
  });

  try {
  await sdk.documents.create({ document, identityKey, signer });
  return docToObject<ForumDocument>(document);
} catch (err) {
  console.error('Whispr createForum documents.create failed:', err);
  throw err;
}
}

/**
 * Get all forums (paginated, newest first).
 */
export async function getForums(
  sdk: DashSdk,
  contractId: string,
  limit = 20,
): Promise<ForumDocument[]> {
  assertClientSide('getForums');

  const results = await sdk.documents.query({
    dataContractId: contractId,
    documentTypeName: DOC_FORUM,
    limit,
    orderBy: [['$createdAt', 'desc']],
  });

  return Array.from(results.values())
    .filter(Boolean)
    .map((d) => docToObject<ForumDocument>(d));
}

/**
 * Get a single forum by ID.
 */
export async function getForum(
  sdk: DashSdk,
  contractId: string,
  forumId: string,
): Promise<ForumDocument | null> {
  assertClientSide('getForum');

  try {
    const results = await sdk.documents.query({
      dataContractId: contractId,
      documentTypeName: DOC_FORUM,
      where: [['$id', '==', forumId]],
      limit: 1,
    });

    const docs = Array.from(results.values()).filter(Boolean);

    if (docs.length === 0) return null;

    return docToObject<ForumDocument>(docs[0]);
  } catch (err) {
    console.error('Whispr getForum failed:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Membership Operations
// ---------------------------------------------------------------------------

/**
 * Join a forum (create membership document with pseudonym).
 */
export async function joinForum(
  sdk: DashSdk,
  contractId: string,
  identityId: string,
  authKeyWif: string,
  forumId: string,
): Promise<MembershipDocument> {
  assertClientSide('joinForum');
  const { mod, identityKey, signer } = await getSigningContext(
    sdk,
    identityId,
    authKeyWif,
  );

  const pseudonym = generatePseudonym(identityId, forumId);

  const document = new mod.Document({
    properties: { forumId, pseudonym, status: 'active' },
    documentTypeName: DOC_MEMBERSHIP,
    dataContractId: contractId,
    ownerId: identityId,
  });

  const result = await sdk.documents.create({ document, identityKey, signer });
  return docToObject<MembershipDocument>(result);
}

/**
 * Leave a forum (update membership status to 'left').
 */
export async function leaveForum(
  sdk: DashSdk,
  contractId: string,
  identityId: string,
  authKeyWif: string,
  membershipId: string,
  currentRevision: bigint,
): Promise<void> {
  assertClientSide('leaveForum');
  const { mod, identityKey, signer } = await getSigningContext(
    sdk,
    identityId,
    authKeyWif,
  );

  const document = new mod.Document({
    properties: { status: 'left' },
    documentTypeName: DOC_MEMBERSHIP,
    dataContractId: contractId,
    ownerId: identityId,
    id: membershipId,
    revision: currentRevision + BigInt(1),
  });

  await sdk.documents.replace({ document, identityKey, signer });
}

/**
 * Get user's active membership for a forum.
 */
export async function getMembership(
  sdk: DashSdk,
  contractId: string,
  identityId: string,
  forumId: string,
): Promise<MembershipDocument | null> {
  assertClientSide('getMembership');

  const results = await sdk.documents.query({
    dataContractId: contractId,
    documentTypeName: DOC_MEMBERSHIP,
    where: [
      ['$ownerId', '==', identityId],
      ['forumId', '==', forumId],
      ['status', '==', 'active'],
    ],
    limit: 1,
  });

  const docs = Array.from(results.values()).filter(Boolean);
  if (docs.length === 0) return null;
  return docToObject<MembershipDocument>(docs[0]);
}

/**
 * Get member count for a forum.
 */
export async function getMemberCount(
  sdk: DashSdk,
  contractId: string,
  forumId: string,
): Promise<number> {
  assertClientSide('getMemberCount');
  try {
    const results = await sdk.documents.query({
      dataContractId: contractId,
      documentTypeName: DOC_MEMBERSHIP,
      where: [
        ['forumId', '==', forumId],
        ['status', '==', 'active'],
      ],
      limit: 100,
    });
    return Array.from(results.values()).filter(Boolean).length;
  } catch {
    return 0;
  }
}

/**
 * Get pseudonym for a user in a forum (from membership doc or generated).
 */
export async function getUserPseudonym(
  sdk: DashSdk,
  contractId: string,
  identityId: string,
  forumId: string,
): Promise<string> {
  const membership = await getMembership(sdk, contractId, identityId, forumId);
  return membership?.pseudonym ?? generatePseudonym(identityId, forumId);
}

// ---------------------------------------------------------------------------
// Post Operations
// ---------------------------------------------------------------------------

/**
 * Create a new post in a forum.
 */
export async function createPost(
  sdk: DashSdk,
  contractId: string,
  identityId: string,
  authKeyWif: string,
  forumId: string,
  content: string,
): Promise<PostDocument> {
  assertClientSide('createPost');
  const { mod, identityKey, signer } = await getSigningContext(
    sdk,
    identityId,
    authKeyWif,
  );

  const document = new mod.Document({
    properties: { forumId, content, status: 'active' },
    documentTypeName: DOC_POST,
    dataContractId: contractId,
    ownerId: identityId,
  });

  const result = await sdk.documents.create({ document, identityKey, signer });
  return docToObject<PostDocument>(result);
}

/**
 * Get posts in a forum (newest first).
 */
export async function getForumPosts(
  sdk: DashSdk,
  contractId: string,
  forumId: string,
  limit = 20,
): Promise<PostDocument[]> {
  assertClientSide('getForumPosts');

  const results = await sdk.documents.query({
    dataContractId: contractId,
    documentTypeName: DOC_POST,
    where: [
      ['forumId', '==', forumId],
      ['status', '==', 'active'],
    ],
    limit,
    orderBy: [['$createdAt', 'desc']],
  });

  return Array.from(results.values())
    .filter(Boolean)
    .map((d) => docToObject<PostDocument>(d));
}

/**
 * Get a single post by ID.
 */
export async function getPost(
  sdk: DashSdk,
  contractId: string,
  postId: string,
): Promise<PostDocument | null> {
  assertClientSide('getPost');
  try {
    const results = await sdk.documents.query({
      dataContractId: contractId,
      documentTypeName: DOC_POST,
      where: [['$id', '==', postId]],
      limit: 1,
    });
    const docs = Array.from(results.values()).filter(Boolean);
    if (docs.length === 0) return null;
    return docToObject<PostDocument>(docs[0]);
  } catch {
    return null;
  }
}

/**
 * Get post count for a forum.
 */
export async function getPostCount(
  sdk: DashSdk,
  contractId: string,
  forumId: string,
): Promise<number> {
  assertClientSide('getPostCount');
  try {
    const results = await sdk.documents.query({
      dataContractId: contractId,
      documentTypeName: DOC_POST,
      where: [
        ['forumId', '==', forumId],
        ['status', '==', 'active'],
      ],
      limit: 100,
    });
    return Array.from(results.values()).filter(Boolean).length;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Comment Operations
// ---------------------------------------------------------------------------

/**
 * Create a comment on a post.
 */
export async function createComment(
  sdk: DashSdk,
  contractId: string,
  identityId: string,
  authKeyWif: string,
  postId: string,
  forumId: string,
  content: string,
): Promise<CommentDocument> {
  assertClientSide('createComment');
  const { mod, identityKey, signer } = await getSigningContext(
    sdk,
    identityId,
    authKeyWif,
  );

  const document = new mod.Document({
    properties: { postId, forumId, content, status: 'active' },
    documentTypeName: DOC_COMMENT,
    dataContractId: contractId,
    ownerId: identityId,
  });

  const result = await sdk.documents.create({ document, identityKey, signer });
  return docToObject<CommentDocument>(result);
}

/**
 * Get comments for a post (oldest first).
 */
export async function getPostComments(
  sdk: DashSdk,
  contractId: string,
  postId: string,
  limit = 50,
): Promise<CommentDocument[]> {
  assertClientSide('getPostComments');

  const results = await sdk.documents.query({
    dataContractId: contractId,
    documentTypeName: DOC_COMMENT,
    where: [
      ['postId', '==', postId],
      ['status', '==', 'active'],
    ],
    limit,
    orderBy: [['$createdAt', 'asc']],
  });

  return Array.from(results.values())
    .filter(Boolean)
    .map((d) => docToObject<CommentDocument>(d));
}

/**
 * Get comment count for a post.
 */
export async function getCommentCount(
  sdk: DashSdk,
  contractId: string,
  postId: string,
): Promise<number> {
  assertClientSide('getCommentCount');
  try {
    const results = await sdk.documents.query({
      dataContractId: contractId,
      documentTypeName: DOC_COMMENT,
      where: [
        ['postId', '==', postId],
        ['status', '==', 'active'],
      ],
      limit: 100,
    });
    return Array.from(results.values()).filter(Boolean).length;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Reaction Operations
// ---------------------------------------------------------------------------

/**
 * Add a like reaction to a post.
 */
export async function addReaction(
  sdk: DashSdk,
  contractId: string,
  identityId: string,
  authKeyWif: string,
  postId: string,
  forumId: string,
): Promise<ReactionDocument> {
  assertClientSide('addReaction');
  const { mod, identityKey, signer } = await getSigningContext(
    sdk,
    identityId,
    authKeyWif,
  );

  const document = new mod.Document({
    properties: { postId, forumId, type: 'like' },
    documentTypeName: DOC_REACTION,
    dataContractId: contractId,
    ownerId: identityId,
  });

  const result = await sdk.documents.create({ document, identityKey, signer });
  return docToObject<ReactionDocument>(result);
}

/**
 * Remove a like reaction from a post.
 */
export async function removeReaction(
  sdk: DashSdk,
  contractId: string,
  identityId: string,
  authKeyWif: string,
  reactionId: string,
  currentRevision: bigint,
): Promise<void> {
  assertClientSide('removeReaction');
  const { mod, identityKey, signer } = await getSigningContext(
    sdk,
    identityId,
    authKeyWif,
  );

  const document = new mod.Document({
    documentTypeName: DOC_REACTION,
    dataContractId: contractId,
    ownerId: identityId,
    id: reactionId,
    revision: currentRevision,
    properties: {},
  });

  await sdk.documents.delete({ document, identityKey, signer });
}

/**
 * Get the current user's reaction on a post (or null).
 */
export async function getUserReaction(
  sdk: DashSdk,
  contractId: string,
  identityId: string,
  postId: string,
): Promise<ReactionDocument | null> {
  assertClientSide('getUserReaction');
  try {
    const results = await sdk.documents.query({
      dataContractId: contractId,
      documentTypeName: DOC_REACTION,
      where: [
        ['$ownerId', '==', identityId],
        ['postId', '==', postId],
      ],
      limit: 1,
    });
    const docs = Array.from(results.values()).filter(Boolean);
    if (docs.length === 0) return null;
    return docToObject<ReactionDocument>(docs[0]);
  } catch {
    return null;
  }
}

/**
 * Get reaction count for a post.
 */
export async function getReactionCount(
  sdk: DashSdk,
  contractId: string,
  postId: string,
): Promise<number> {
  assertClientSide('getReactionCount');
  try {
    const results = await sdk.documents.query({
      dataContractId: contractId,
      documentTypeName: DOC_REACTION,
      where: [['postId', '==', postId]],
      limit: 100,
    });
    return Array.from(results.values()).filter(Boolean).length;
  } catch {
    return 0;
  }
}
