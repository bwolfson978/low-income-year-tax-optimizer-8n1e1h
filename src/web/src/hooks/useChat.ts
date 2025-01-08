import { useState, useCallback, useRef } from 'react';
import { debounce } from 'lodash'; // v4.17.21
import { ChatMessage, ChatThread, ChatRole } from '../types/chat.types';
import { APIError, APIErrorCode } from '../types/api.types';
import { api } from '../lib/api';

// Chat configuration constants
const CHAT_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  DEBOUNCE_DELAY: 300,
  MESSAGE_LIMIT: 50,
  MAX_MESSAGE_LENGTH: 1000
} as const;

// API endpoints
const CHAT_ENDPOINTS = {
  SEND_MESSAGE: '/api/chat/message',
  GET_THREAD: '/api/chat/thread',
  RETRY_MESSAGE: '/api/chat/retry'
} as const;

// Type definitions
interface ChatOptions {
  initialMessages?: ChatMessage[];
  onError?: (error: ChatError) => void;
  autoRetry?: boolean;
  messageLimit?: number;
}

interface ChatLoadingState {
  sending: boolean;
  loading: boolean;
  retrying: boolean;
  loadingHistory: boolean;
}

interface ChatError {
  code: APIErrorCode;
  message: string;
  messageId?: string;
  timestamp: Date;
}

/**
 * Custom hook for managing chat functionality with comprehensive error handling
 * and loading states
 */
export function useChat(calculationId: string, options: ChatOptions = {}) {
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>(options.initialMessages || []);
  const [loading, setLoading] = useState<ChatLoadingState>({
    sending: false,
    loading: false,
    retrying: false,
    loadingHistory: false
  });
  const [error, setError] = useState<ChatError | null>(null);
  
  // Refs for managing async operations
  const retryAttemptsRef = useRef<Map<string, number>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Validates message content before sending
   */
  const validateMessage = useCallback((content: string): boolean => {
    if (!content.trim()) {
      setError({
        code: APIErrorCode.VALIDATION_ERROR,
        message: 'Message cannot be empty',
        timestamp: new Date()
      });
      return false;
    }

    if (content.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
      setError({
        code: APIErrorCode.VALIDATION_ERROR,
        message: `Message exceeds maximum length of ${CHAT_CONFIG.MAX_MESSAGE_LENGTH} characters`,
        timestamp: new Date()
      });
      return false;
    }

    return true;
  }, []);

  /**
   * Debounced message sender to prevent rapid-fire requests
   */
  const debouncedSend = useCallback(
    debounce(async (content: string, messageId: string) => {
      try {
        const response = await api.post<ChatMessage>(CHAT_ENDPOINTS.SEND_MESSAGE, {
          content,
          calculationId,
          messageId
        });

        if (response.success && response.data) {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === messageId 
                ? { ...response.data!, status: 'sent' } 
                : msg
            )
          );
        } else {
          throw new Error('Failed to send message');
        }
      } catch (err) {
        const apiError = err as APIError;
        handleMessageError(messageId, apiError);
      } finally {
        setLoading(prev => ({ ...prev, sending: false }));
      }
    }, CHAT_CONFIG.DEBOUNCE_DELAY),
    [calculationId]
  );

  /**
   * Sends a new message to the chat
   */
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!validateMessage(content)) return;

    const messageId = crypto.randomUUID();
    const newMessage: ChatMessage = {
      id: messageId,
      content,
      role: ChatRole.USER,
      status: 'pending',
      created_at: new Date(),
      user_id: '', // Will be set by the server
      metadata: {}
    };

    setMessages(prev => [...prev, newMessage]);
    setLoading(prev => ({ ...prev, sending: true }));
    
    debouncedSend(content, messageId);
  }, [validateMessage, debouncedSend]);

  /**
   * Handles message sending errors
   */
  const handleMessageError = useCallback((messageId: string, error: APIError) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId 
          ? { ...msg, status: 'error' } 
          : msg
      )
    );

    setError({
      code: error.code,
      message: error.message,
      messageId,
      timestamp: new Date()
    });

    if (options.onError) {
      options.onError({
        code: error.code,
        message: error.message,
        messageId,
        timestamp: new Date()
      });
    }
  }, [options]);

  /**
   * Retries sending a failed message
   */
  const retryMessage = useCallback(async (messageId: string): Promise<void> => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message || message.status !== 'error') return;

    const attempts = retryAttemptsRef.current.get(messageId) || 0;
    if (attempts >= CHAT_CONFIG.MAX_RETRIES) {
      setError({
        code: APIErrorCode.INTERNAL_ERROR,
        message: 'Maximum retry attempts exceeded',
        messageId,
        timestamp: new Date()
      });
      return;
    }

    setLoading(prev => ({ ...prev, retrying: true }));
    retryAttemptsRef.current.set(messageId, attempts + 1);

    try {
      const response = await api.post<ChatMessage>(CHAT_ENDPOINTS.RETRY_MESSAGE, {
        messageId,
        calculationId
      });

      if (response.success && response.data) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId 
              ? { ...response.data!, status: 'sent' } 
              : msg
          )
        );
        setError(null);
      }
    } catch (err) {
      const apiError = err as APIError;
      handleMessageError(messageId, apiError);
    } finally {
      setLoading(prev => ({ ...prev, retrying: false }));
    }
  }, [messages, calculationId, handleMessageError]);

  /**
   * Loads chat history for the calculation
   */
  const loadChatHistory = useCallback(async (page: number = 1): Promise<void> => {
    if (loading.loadingHistory) return;

    setLoading(prev => ({ ...prev, loadingHistory: true }));
    
    // Cancel any existing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await api.get<ChatThread>(`${CHAT_ENDPOINTS.GET_THREAD}/${calculationId}`, {
        params: {
          page,
          limit: options.messageLimit || CHAT_CONFIG.MESSAGE_LIMIT
        },
        signal: abortControllerRef.current.signal
      });

      if (response.success && response.data) {
        setMessages(response.data.messages);
        setError(null);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const apiError = err as APIError;
        setError({
          code: apiError.code,
          message: 'Failed to load chat history',
          timestamp: new Date()
        });
      }
    } finally {
      setLoading(prev => ({ ...prev, loadingHistory: false }));
      abortControllerRef.current = null;
    }
  }, [calculationId, loading.loadingHistory, options.messageLimit]);

  /**
   * Clears current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    retryMessage,
    loadChatHistory,
    clearError
  };
}