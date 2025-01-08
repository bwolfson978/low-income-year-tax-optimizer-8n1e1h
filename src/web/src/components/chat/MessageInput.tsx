import React, { useState, useCallback } from 'react';
import { Send } from 'lucide-react'; // v0.3.0
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useChat } from '../../hooks/useChat';

interface MessageInputProps {
  calculationId: string;
  className?: string;
  placeholder?: string;
  onMessageSent?: () => void;
  maxLength?: number;
}

const MessageInput: React.FC<MessageInputProps> = ({
  calculationId,
  className,
  placeholder = 'Ask a question about your tax optimization...',
  onMessageSent,
  maxLength = 1000
}) => {
  // State management
  const [message, setMessage] = useState('');
  const [error, setError] = useState<Error | null>(null);

  // Chat hook integration
  const {
    sendMessage,
    loading,
    error: chatError,
    clearError
  } = useChat(calculationId);

  // Handle message submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate message
    if (!message.trim()) {
      setError(new Error('Please enter a message'));
      return;
    }

    if (message.length > maxLength) {
      setError(new Error(`Message cannot exceed ${maxLength} characters`));
      return;
    }

    try {
      await sendMessage(message);
      setMessage('');
      setError(null);
      onMessageSent?.();
    } catch (err) {
      setError(err as Error);
    }
  }, [message, maxLength, sendMessage, onMessageSent]);

  // Handle keyboard events
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      form?.requestSubmit();
    }
  }, []);

  // Handle input changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    setError(null);
    clearError?.();
    setMessage(newValue);
  }, [maxLength, clearError]);

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex w-full gap-2 ${className}`}
      aria-label="Chat message form"
    >
      <Input
        id="chat-message"
        name="message"
        type="text"
        value={message}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={loading.sending}
        error={error?.message || chatError?.message}
        aria-label="Chat message input"
        aria-describedby={error || chatError ? 'chat-message-error' : undefined}
        className="flex-1"
        maxLength={maxLength}
      />

      <Button
        type="submit"
        disabled={loading.sending || !message.trim()}
        isLoading={loading.sending}
        aria-label="Send message"
        size="icon"
        className="h-full"
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send</span>
      </Button>

      {(error || chatError) && (
        <div
          id="chat-message-error"
          role="alert"
          aria-live="polite"
          className="absolute -bottom-6 left-0 text-sm text-red-500 dark:text-red-400"
        >
          {error?.message || chatError?.message}
        </div>
      )}
    </form>
  );
};

export default MessageInput;