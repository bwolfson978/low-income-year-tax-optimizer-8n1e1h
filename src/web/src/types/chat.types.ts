import { APIResponse } from '../types/api.types';

/**
 * Enumeration of possible roles in a chat conversation
 */
export enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

/**
 * Interface defining the structure of individual chat messages
 */
export interface ChatMessage {
  /** Unique identifier for the message */
  id: string;
  
  /** Message content/text */
  content: string;
  
  /** Role of the message sender */
  role: ChatRole;
  
  /** Timestamp when message was created */
  created_at: Date;
  
  /** ID of the user who sent/received the message */
  user_id: string;
  
  /** Additional metadata for the message */
  metadata: Record<string, any>;
  
  /** Current status of the message */
  status: 'pending' | 'sent' | 'error';
}

/**
 * Interface defining the structure of chat conversation threads
 */
export interface ChatThread {
  /** Unique identifier for the thread */
  id: string;
  
  /** Array of messages in the thread */
  messages: ChatMessage[];
  
  /** ID of the user who owns the thread */
  user_id: string;
  
  /** ID of the calculation this thread is associated with */
  calculation_id: string;
  
  /** Timestamp when thread was created */
  created_at: Date;
  
  /** Timestamp when thread was last updated */
  updated_at: Date;
  
  /** Whether the thread is currently active */
  active: boolean;
  
  /** Timestamp of the last message in the thread */
  last_message_at: Date;
  
  /** Additional context for the thread */
  context: Record<string, any>;
}

/**
 * Interface for thread metadata and lifecycle management
 */
export interface ChatThreadMetadata {
  /** ID of the thread */
  thread_id: string;
  
  /** Total number of messages in the thread */
  message_count: number;
  
  /** How long to retain the thread in days */
  retention_period: number;
  
  /** Timestamp of last activity in the thread */
  last_activity: Date;
}

/**
 * Interface for message validation rules and constraints
 */
export interface ChatMessageValidation {
  /** Maximum length of a message in characters */
  max_length: number;
  
  /** Maximum messages per minute */
  rate_limit: number;
  
  /** Array of content validation rules */
  content_rules: string[];
}

/**
 * Interface for sending new chat message requests
 */
export interface ChatMessageRequest {
  /** Content of the message */
  content: string;
  
  /** ID of the thread to send the message to */
  thread_id: string;
}

/**
 * Type alias for chat message API responses
 */
export type ChatResponse = APIResponse<ChatMessage>;

/**
 * Type alias for chat thread API responses
 */
export type ChatThreadResponse = APIResponse<ChatThread>;