"use client"

import * as React from "react";
import { cn } from "class-variance-authority";
import { format, formatDistanceToNow } from "date-fns"; // v2.30.0
import { ChatMessage, ChatRole } from "../../types/chat.types";
import { Skeleton } from "../ui/Skeleton";
import { useChat } from "../../hooks/useChat";

// Message style variants based on role
const MESSAGE_STYLES = {
  user: "bg-primary-100 dark:bg-primary-800 text-primary-900 dark:text-primary-100 rounded-tr-2xl rounded-bl-2xl rounded-br-2xl ml-auto",
  assistant: "bg-secondary-100 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 rounded-tl-2xl rounded-bl-2xl rounded-br-2xl",
  container: "flex flex-col gap-4 p-4 overflow-y-auto max-h-[600px] scroll-smooth",
  messageWrapper: "flex flex-col gap-1 max-w-[80%] w-fit animate-in slide-in-from-bottom-2",
  timestamp: "text-xs text-muted-foreground",
  loadingContainer: "space-y-4 p-4",
} as const;

interface MessageListProps {
  /**
   * ID of the calculation this chat is associated with
   */
  calculationId: string;
  /**
   * Optional CSS class name for the container
   */
  className?: string;
}

/**
 * Renders a list of chat messages with proper styling and accessibility features
 */
export const MessageList: React.FC<MessageListProps> = ({
  calculationId,
  className
}) => {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const { messages, loading } = useChat(calculationId);

  // Auto-scroll to latest message
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  /**
   * Formats message timestamp with relative and absolute time
   */
  const formatMessageTime = (created_at: Date): { relative: string; absolute: string } => {
    return {
      relative: formatDistanceToNow(created_at, { addSuffix: true }),
      absolute: format(created_at, "PPpp")
    };
  };

  /**
   * Renders an individual message with proper styling and accessibility
   */
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === ChatRole.USER;
    const { relative, absolute } = formatMessageTime(message.created_at);

    return (
      <div
        key={message.id}
        className={cn(
          MESSAGE_STYLES.messageWrapper,
          isUser ? MESSAGE_STYLES.user : MESSAGE_STYLES.assistant
        )}
        role="listitem"
        aria-label={`${isUser ? "Your message" : "Assistant's response"}`}
      >
        <div 
          className="p-4"
          tabIndex={0}
        >
          {message.content}
        </div>
        <time
          className={cn(
            MESSAGE_STYLES.timestamp,
            isUser ? "text-right" : "text-left"
          )}
          dateTime={message.created_at.toISOString()}
          title={absolute}
        >
          {relative}
        </time>
      </div>
    );
  };

  /**
   * Renders loading skeleton placeholders
   */
  const renderLoadingState = () => (
    <div className={MESSAGE_STYLES.loadingContainer}>
      {[...Array(3)].map((_, i) => (
        <Skeleton
          key={`loading-${i}`}
          className={cn(
            "h-20 w-[80%]",
            i % 2 === 0 ? "ml-auto" : "mr-auto"
          )}
          aria-label="Loading message"
        />
      ))}
    </div>
  );

  if (loading.loadingHistory) {
    return renderLoadingState();
  }

  return (
    <div
      className={cn(MESSAGE_STYLES.container, className)}
      role="log"
      aria-live="polite"
      aria-label="Chat message history"
      aria-atomic="false"
      aria-relevant="additions"
    >
      {messages.length === 0 ? (
        <p className="text-center text-muted-foreground p-4">
          No messages yet. Start the conversation by asking a question.
        </p>
      ) : (
        messages.map(renderMessage)
      )}
      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  );
};