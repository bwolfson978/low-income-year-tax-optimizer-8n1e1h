"use client"

import * as React from 'react';
import { useEffect } from 'react';
import { cn } from 'class-variance-authority';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useChat } from '../../hooks/useChat';
import { ChatMessage } from '../../types/chat.types';
import { APIErrorCode } from '../../types/api.types';

// Style constants with theme support
const STYLES = {
  container: 'flex flex-col h-full max-h-[600px] rounded-lg border bg-background transition-colors duration-200',
  messageList: 'flex-1 overflow-y-auto p-4 scroll-smooth',
  inputContainer: 'border-t p-4 transition-colors duration-200',
  errorContainer: 'p-4 text-sm text-destructive bg-destructive/10 rounded-md animate-shake',
  loadingIndicator: 'animate-pulse opacity-70'
} as const;

interface ChatInterfaceProps {
  /**
   * ID of the calculation this chat is associated with
   */
  calculationId: string;
  /**
   * Optional CSS class name for styling
   */
  className?: string;
  /**
   * Optional error handler callback
   */
  onError?: (error: ChatError) => void;
}

interface ChatError {
  code: APIErrorCode;
  message: string;
  timestamp: Date;
}

/**
 * ChatInterface component providing an accessible and interactive chat experience
 * for tax optimization explanations.
 */
const ChatInterface: React.FC<ChatInterfaceProps> = ({
  calculationId,
  className,
  onError
}) => {
  // Initialize chat hook with error handling
  const {
    messages,
    loading,
    error,
    sendMessage,
    retryMessage,
    loadChatHistory,
    clearError
  } = useChat(calculationId, {
    onError: (chatError) => {
      onError?.(chatError);
    }
  });

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // Set up live region for accessibility announcements
  useEffect(() => {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);

    return () => {
      document.body.removeChild(liveRegion);
    };
  }, []);

  // Update live region with new messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      const liveRegion = document.querySelector('[role="status"]');
      if (liveRegion) {
        liveRegion.textContent = `New message: ${lastMessage.content}`;
      }
    }
  }, [messages]);

  /**
   * Handles message retry attempts with exponential backoff
   */
  const handleRetry = React.useCallback(async (messageId: string) => {
    try {
      await retryMessage(messageId);
    } catch (err) {
      console.error('Error retrying message:', err);
      onError?.({
        code: APIErrorCode.INTERNAL_ERROR,
        message: 'Failed to retry message',
        timestamp: new Date()
      });
    }
  }, [retryMessage, onError]);

  /**
   * Handles successful message sending
   */
  const handleMessageSent = React.useCallback(() => {
    const liveRegion = document.querySelector('[role="status"]');
    if (liveRegion) {
      liveRegion.textContent = 'Message sent successfully';
    }
  }, []);

  return (
    <div
      className={cn(STYLES.container, className)}
      role="region"
      aria-label="Chat interface"
    >
      {/* Message list with virtualization and loading states */}
      <div className={STYLES.messageList}>
        <MessageList
          calculationId={calculationId}
          messages={messages}
          isLoading={loading.loadingHistory}
          hasError={!!error}
        />
      </div>

      {/* Error display with retry option */}
      {error && (
        <div
          className={STYLES.errorContainer}
          role="alert"
          aria-live="assertive"
        >
          <p>{error.message}</p>
          <button
            onClick={clearError}
            className="text-sm underline mt-2"
            aria-label="Dismiss error message"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Message input with rate limiting and validation */}
      <div className={STYLES.inputContainer}>
        <MessageInput
          calculationId={calculationId}
          disabled={loading.sending || loading.loadingHistory}
          onMessageSent={handleMessageSent}
          onRetry={handleRetry}
        />
      </div>
    </div>
  );
};

export default ChatInterface;