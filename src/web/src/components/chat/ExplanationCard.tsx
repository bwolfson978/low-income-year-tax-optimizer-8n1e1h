"use client"

import * as React from "react" // ^18.0.0
import { clsx } from "clsx" // ^2.0.0
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../ui/Card"
import { ChatMessage, ChatRole } from "../../types/chat.types"

interface ExplanationCardProps {
  explanation: ChatMessage
  className?: string
}

const ExplanationCard: React.FC<ExplanationCardProps> = ({
  explanation,
  className
}) => {
  // Determine if the message is from the AI assistant
  const isAssistant = explanation.role === ChatRole.ASSISTANT

  // Format timestamp for accessibility
  const formattedDate = new Date(explanation.created_at).toLocaleString()

  return (
    <Card
      className={clsx(
        "transition-all duration-200",
        isAssistant ? "bg-primary/5" : "bg-background",
        className
      )}
      elevation="low"
      theme="system"
      // Add semantic role for accessibility
      role="article"
      aria-label={`${isAssistant ? "AI Assistant" : "User"} message from ${formattedDate}`}
    >
      <CardHeader spacing="normal">
        <CardTitle 
          as="h3"
          className={clsx(
            "text-lg font-semibold",
            isAssistant ? "text-primary" : "text-foreground"
          )}
        >
          {isAssistant ? "Tax Optimization Explanation" : "Your Question"}
        </CardTitle>
        <CardDescription
          color={isAssistant ? "accent" : "muted"}
          className="text-sm"
        >
          {isAssistant ? "AI-powered analysis and recommendations" : "User inquiry"}
        </CardDescription>
      </CardHeader>

      <CardContent
        className={clsx(
          "prose prose-sm dark:prose-invert max-w-none",
          "space-y-4"
        )}
      >
        {/* Handle error states */}
        {explanation.status === "error" ? (
          <p className="text-destructive">
            An error occurred displaying this message. Please try again.
          </p>
        ) : (
          // Split content into paragraphs for better readability
          explanation.content.split("\n").map((paragraph, index) => (
            <p
              key={`${explanation.id}-p-${index}`}
              className={clsx(
                "text-base leading-relaxed",
                isAssistant ? "text-primary-foreground/90" : "text-foreground/90"
              )}
            >
              {paragraph}
            </p>
          ))
        )}

        {/* Display metadata if available */}
        {explanation.metadata && Object.keys(explanation.metadata).length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(explanation.metadata).map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt className="font-medium text-muted-foreground">{key}:</dt>
                  <dd className="text-foreground">{String(value)}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ExplanationCard