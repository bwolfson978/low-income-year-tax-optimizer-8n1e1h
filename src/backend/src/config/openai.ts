import { Configuration } from 'openai'; // ^4.0.0

// Environment variable validation
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || (() => {
  throw new Error('OpenAI API key is required');
})();

const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID || (() => {
  throw new Error('OpenAI Organization ID is required');
})();

/**
 * OpenAI model identifiers for consistent model selection across the application
 */
export const OPENAI_MODELS = {
  GPT4: 'gpt-4',
  GPT4_TURBO: 'gpt-4-1106-preview'
} as const;

/**
 * OpenAI API settings and constraints for optimal performance and cost management
 */
export const OPENAI_SETTINGS = {
  // Maximum tokens to generate in response
  maxTokens: 2048,
  
  // Controls randomness: 0 = deterministic, 1 = most random
  temperature: 0.3,
  
  // Maximum retry attempts for failed API calls
  maxRetries: 3,
  
  // API request timeout in milliseconds
  timeout: 30000,
  
  // Penalize new tokens based on their presence in the text so far
  presencePenalty: 0.1,
  
  // Penalize new tokens based on their frequency in the text so far
  frequencyPenalty: 0.1
} as const;

/**
 * Creates and validates OpenAI configuration object with error handling
 * @returns {Configuration} Validated OpenAI configuration object
 * @throws {Error} If API key or organization ID validation fails
 */
const createOpenAIConfig = (): Configuration => {
  // Validate API key format and length
  if (typeof OPENAI_API_KEY !== 'string' || OPENAI_API_KEY.length < 40) {
    throw new Error('Invalid OpenAI API key format');
  }

  // Validate organization ID format
  if (typeof OPENAI_ORG_ID !== 'string' || !OPENAI_ORG_ID.startsWith('org-')) {
    throw new Error('Invalid OpenAI organization ID format');
  }

  try {
    return new Configuration({
      apiKey: OPENAI_API_KEY,
      organization: OPENAI_ORG_ID,
    });
  } catch (error) {
    throw new Error(`Failed to create OpenAI configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Validated OpenAI configuration instance for service usage
 * @type {Configuration}
 */
export const openaiConfig = createOpenAIConfig();