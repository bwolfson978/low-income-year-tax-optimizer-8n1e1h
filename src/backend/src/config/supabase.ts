import { createClient } from '@supabase/supabase-js';
import { API_VERSION } from './constants';

// Environment variable validation
const REQUIRED_ENV_VARS = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
} as const;

// Validate all required environment variables
Object.entries(REQUIRED_ENV_VARS).forEach(([key, value]) => {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Please check your environment configuration.`
    );
  }
});

/**
 * Common client options for both regular and admin clients
 * @version 1.0.0
 */
const commonClientOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-api-version': API_VERSION,
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
} as const;

/**
 * Enhanced options for admin client with elevated privileges
 * @version 1.0.0
 */
const adminClientOptions = {
  ...commonClientOptions,
  db: {
    ...commonClientOptions.db,
    poolSize: 20,
    connectionTimeout: 30000,
  },
  auth: {
    ...commonClientOptions.auth,
    autoRefreshToken: false, // Admin tokens don't need auto-refresh
  },
} as const;

/**
 * Creates and configures a standard Supabase client instance
 * @returns {ReturnType<typeof createClient>} Configured Supabase client
 * @version 1.0.0
 */
const createSupabaseClient = () => {
  try {
    const client = createClient(
      REQUIRED_ENV_VARS.SUPABASE_URL,
      REQUIRED_ENV_VARS.SUPABASE_ANON_KEY,
      {
        ...commonClientOptions,
        // Configure retry strategy
        retryAttempts: 3,
        retryInterval: (attemptCount) => Math.min(1000 * Math.pow(2, attemptCount), 10000),
        // Configure request timeouts
        queryTimeout: 10000,
        connectionTimeout: 20000,
      }
    );

    // Configure real-time subscription error handling
    client.realtime.setAuth(REQUIRED_ENV_VARS.SUPABASE_ANON_KEY);
    client.realtime.onError((error) => {
      console.error('Supabase real-time connection error:', error);
      // Implement your error tracking here
    });

    // Configure automatic reconnection
    client.realtime.onDisconnect(() => {
      console.warn('Supabase real-time disconnected. Attempting to reconnect...');
      setTimeout(() => client.realtime.connect(), 1000);
    });

    return client;
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    throw new Error('Supabase client initialization failed');
  }
};

/**
 * Creates and configures a Supabase admin client with elevated privileges
 * @returns {ReturnType<typeof createClient>} Configured admin Supabase client
 * @version 1.0.0
 */
const createSupabaseAdminClient = () => {
  try {
    const adminClient = createClient(
      REQUIRED_ENV_VARS.SUPABASE_URL,
      REQUIRED_ENV_VARS.SUPABASE_SERVICE_KEY,
      {
        ...adminClientOptions,
        // Enhanced security options for admin client
        db: {
          ...adminClientOptions.db,
          ssl: true,
          maxRetries: 5,
        },
      }
    );

    // Configure admin-specific error handling
    adminClient.realtime.onError((error) => {
      console.error('Supabase admin client error:', error);
      // Implement your error tracking here
    });

    return adminClient;
  } catch (error) {
    console.error('Failed to create Supabase admin client:', error);
    throw new Error('Supabase admin client initialization failed');
  }
};

// Initialize clients
export const supabase = createSupabaseClient();
export const supabaseAdmin = createSupabaseAdminClient();

// Type exports for better TypeScript support
export type { SupabaseClient } from '@supabase/supabase-js';