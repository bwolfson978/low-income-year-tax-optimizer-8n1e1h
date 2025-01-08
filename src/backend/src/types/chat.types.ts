/**
 * TypeScript interfaces and types for AI-powered chat functionality
 * @version 1.0.0
 */

import { APIResponse } from './api.types';
import { UserProfile } from './user.types';

/**
 * Enumeration of possible message sender roles
 */
export enum ChatRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM'
}

/**
 * Enumeration of possible chat context types
 */
export enum ChatContextType {
  SCENARIO = 'SCENARIO',
  CALCULATION = 'CALCULATION',
  GENERAL = 'GENERAL',
  TAX_ADVICE = 'TAX_ADVICE',
  ROTH_CONVERSION = 'ROTH_CONVERSION',
  CAPITAL_GAINS = 'CAPITAL_GAINS'
}

/**
 * Enumeration of possible message processing statuses
 */
export enum ChatMessageStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * Enumeration of possible thread statuses
 */
export enum ChatThreadStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED'
}

/**
 * Interface for chat message metadata
 */
export interface ChatMessageMetadata {
  /** Number of tokens used in processing */
  tokens: number;
  /** AI model used for processing */
  model: string;
  /** Type of context for the message */
  context_type: ChatContextType;
  /** Processing start timestamp */
  processing_started?: Date;
  /** Processing completion timestamp */
  processing_completed?: Date;
  /** Additional metadata properties */
  [key: string]: unknown;
}

/**
 * Interface for chat thread metadata
 */
export interface ChatThreadMetadata {
  /** Total number of messages in thread */
  message_count: number;
  /** Last activity timestamp */
  last_activity: Date;
  /** Total tokens used in thread */
  total_tokens: number;
  /** Primary context type for thread */
  primary_context: ChatContextType;
  /** Additional metadata properties */
  [key: string]: unknown;
}

/**
 * Interface for chat context information
 */
export interface ChatContext {
  /** Type of context */
  type: ChatContextType;
  /** Related scenario ID if applicable */
  scenario_id?: string;
  /** Related calculation ID if applicable */
  calculation_id?: string;
  /** Additional context data */
  data?: Record<string, unknown>;
}

/**
 * Interface for individual chat messages
 */
export interface ChatMessage {
  /** Unique identifier for the message */
  id: string;
  /** Message content */
  content: string;
  /** Role of message sender */
  role: ChatRole;
  /** Creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
  /** ID of associated user */
  user_id: string;
  /** Message metadata */
  metadata: ChatMessageMetadata;
  /** Message processing status */
  status: ChatMessageStatus;
  /** Parent thread ID */
  thread_id: string;
  /** Reference to previous message if applicable */
  reply_to_id?: string;
  /** Version number for optimistic locking */
  version: number;
}

/**
 * Interface for chat conversation threads
 */
export interface ChatThread {
  /** Unique identifier for the thread */
  id: string;
  /** Array of messages in the thread */
  messages: ChatMessage[];
  /** ID of associated user */
  user_id: string;
  /** ID of associated calculation */
  calculation_id: string;
  /** Creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
  /** Thread status */
  status: ChatThreadStatus;
  /** Thread metadata */
  metadata: ChatThreadMetadata;
  /** Version number for optimistic locking */
  version: number;
}

/**
 * Interface for new message requests
 */
export interface ChatMessageRequest {
  /** Message content */
  content: string;
  /** ID of thread to post to */
  thread_id: string;
  /** Message context */
  context: ChatContext;
  /** ID of message being replied to */
  reply_to_id?: string;
}

/**
 * Interface for new thread requests
 */
export interface ChatThreadRequest {
  /** Initial message content */
  initial_message: string;
  /** Thread context */
  context: ChatContext;
  /** Associated calculation ID */
  calculation_id: string;
}

/**
 * Type alias for chat message API responses
 */
export type ChatResponse = APIResponse<ChatMessage>;

/**
 * Type alias for chat thread API responses
 */
export type ChatThreadResponse = APIResponse<ChatThread>;

/**
 * Type alias for paginated chat thread responses
 */
export type PaginatedChatThreadResponse = APIResponse<{
  threads: ChatThread[];
  total: number;
  page: number;
  per_page: number;
}>;