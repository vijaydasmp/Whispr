/**
 * lib/contracts/whisper-contract.ts
 *
 * Whispr Forum Data Contract
 * 
 * This defines the document schemas for the Whisper decentralized forum.
 * Deploy to Dash Platform testnet only - NOT for production use.
 *
 * Document Types:
 * - forum: Top-level forum/community container
 * - membership: User membership in a forum (with pseudonym)
 * - post: Posts/confessions within a forum
 * - comment: Comments on posts
 * - reaction: Reactions (likes) on posts
 */

export const WHISPER_CONTRACT_DEFINITION = {
  $format_version: 'REPLACE_WITH_VALUE_FROM_yappr-social-contract.json',
  $schema: 'https://schema.dash.org/dpp-0-4/json-schema/dash-contract/v1',
  version: 1,
  ownerId: 'REPLACE_WITH_YOUR_TESTNET_IDENTITY_ID',
  documents: {
    forum: {
      type: 'object' as const,
      description: 'A forum/community created by a Dash Platform identity.',
      indices: [
        {
          name: 'ownerForum',
          properties: [{ $ownerId: 'asc' }, { $createdAt: 'desc' }],
        },
        {
          name: 'byCreatedAt',
          properties: [{ $createdAt: 'desc' }],
        },
      ],
      properties: {
        name: {
          type: 'string' as const,
          minLength: 3,
          maxLength: 64,
          description: 'Forum display name',
          position: 0,
        },
        description: {
          type: 'string' as const,
          maxLength: 500,
          description: 'Forum description/purpose',
          position: 1,
        },
        status: {
          type: 'string' as const,
          enum: ['active', 'archived'],
          default: 'active',
          description: 'Forum status',
          position: 2,
        },
      },
      required: ['name', 'description'],
      additionalProperties: false,
    },
    membership: {
      type: 'object' as const,
      description: 'Forum membership - links user identity to forum.',
      indices: [
        {
          name: 'memberForum',
          properties: [{ $ownerId: 'asc' }, { forumId: 'asc' }],
          unique: true,
        },
        {
          name: 'byForum',
          properties: [{ forumId: 'asc' }, { $createdAt: 'asc' }],
        },
      ],
      properties: {
        forumId: {
          type: 'string' as const,
          minLength: 44,
          maxLength: 44,
          description: 'The forum document ID',
          position: 0,
        },
        pseudonym: {
          type: 'string' as const,
          minLength: 4,
          maxLength: 32,
          description: "User's pseudonym within this forum (e.g., 'Anonymous #7F32')",
          position: 1,
        },
        status: {
          type: 'string' as const,
          enum: ['active', 'left'],
          default: 'active',
          description: 'Membership status',
          position: 2,
        },
      },
      required: ['forumId', 'pseudonym'],
      additionalProperties: false,
    },
    post: {
      type: 'object' as const,
      description: 'A post/confession within a forum.',
      indices: [
        {
          name: 'byForum',
          properties: [{ forumId: 'asc' }, { $createdAt: 'desc' }],
        },
        {
          name: 'ownerPost',
          properties: [{ $ownerId: 'asc' }, { $createdAt: 'desc' }],
        },
      ],
      properties: {
        forumId: {
          type: 'string' as const,
          minLength: 44,
          maxLength: 44,
          description: 'The forum document ID',
          position: 0,
        },
        content: {
          type: 'string' as const,
          minLength: 1,
          maxLength: 2000,
          description: 'Post content text',
          position: 1,
        },
        status: {
          type: 'string' as const,
          enum: ['active', 'hidden', 'deleted'],
          default: 'active',
          description: 'Post status for moderation',
          position: 2,
        },
      },
      required: ['forumId', 'content'],
      additionalProperties: false,
    },
    comment: {
      type: 'object' as const,
      description: 'A comment on a post.',
      indices: [
        {
          name: 'byPost',
          properties: [{ postId: 'asc' }, { $createdAt: 'asc' }],
        },
        {
          name: 'ownerComment',
          properties: [{ $ownerId: 'asc' }, { $createdAt: 'desc' }],
        },
      ],
      properties: {
        postId: {
          type: 'string' as const,
          minLength: 44,
          maxLength: 44,
          description: 'The post document ID',
          position: 0,
        },
        forumId: {
          type: 'string' as const,
          minLength: 44,
          maxLength: 44,
          description: 'The forum document ID',
          position: 1,
        },
        content: {
          type: 'string' as const,
          minLength: 1,
          maxLength: 1000,
          description: 'Comment text',
          position: 2,
        },
        status: {
          type: 'string' as const,
          enum: ['active', 'hidden', 'deleted'],
          default: 'active',
          description: 'Comment status for moderation',
          position: 3,
        },
      },
      required: ['postId', 'forumId', 'content'],
      additionalProperties: false,
    },
    reaction: {
      type: 'object' as const,
      description: 'A reaction (like) on a post.',
      indices: [
        {
          name: 'ownerPostReaction',
          properties: [{ $ownerId: 'asc' }, { postId: 'asc' }],
          unique: true,
        },
        {
          name: 'byPost',
          properties: [{ postId: 'asc' }, { $createdAt: 'asc' }],
        },
      ],
      properties: {
        postId: {
          type: 'string' as const,
          minLength: 44,
          maxLength: 44,
          description: 'The post document ID',
          position: 0,
        },
        forumId: {
          type: 'string' as const,
          minLength: 44,
          maxLength: 44,
          description: 'The forum document ID',
          position: 1,
        },
        type: {
          type: 'string' as const,
          enum: ['like'],
          default: 'like',
          description: 'Reaction type',
          position: 2,
        },
      },
      required: ['postId', 'forumId', 'type'],
      additionalProperties: false,
    },
  },
} as const;

// Document type names
export const DOC_FORUM = 'forum';
export const DOC_MEMBERSHIP = 'membership';
export const DOC_POST = 'post';
export const DOC_COMMENT = 'comment';
export const DOC_REACTION = 'reaction';

// Type exports for TypeScript
export type ForumDocument = {
  $ownerId: string;
  $id: string;
  $createdAt: number;
  $updatedAt?: number;
  name: string;
  description: string;
  status: 'active' | 'archived';
};

export type MembershipDocument = {
  $ownerId: string;
  $id: string;
  $createdAt: number;
  $updatedAt?: number;
  forumId: string;
  pseudonym: string;
  status: 'active' | 'left';
};

export type PostDocument = {
  $ownerId: string;
  $id: string;
  $createdAt: number;
  $updatedAt?: number;
  forumId: string;
  content: string;
  status: 'active' | 'hidden' | 'deleted';
};

export type CommentDocument = {
  $ownerId: string;
  $id: string;
  $createdAt: number;
  $updatedAt?: number;
  postId: string;
  forumId: string;
  content: string;
  status: 'active' | 'hidden' | 'deleted';
};

export type ReactionDocument = {
  $ownerId: string;
  $id: string;
  $createdAt: number;
  $updatedAt?: number;
  postId: string;
  forumId: string;
  type: 'like';
};