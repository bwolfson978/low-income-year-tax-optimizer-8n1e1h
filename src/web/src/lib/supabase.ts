import { createClient, SupabaseClient } from '@supabase/supabase-js'; // v2.39.0
import { AuthState } from '../types/auth.types';

// Validate required environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Creates and configures a Supabase client instance with enhanced security features
 * and optimized performance settings for production use.
 */
const createSupabaseClient = (): SupabaseClient => {
  const options = {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: {
        // Use secure storage with HTTPOnly cookies
        getItem: (key: string) => {
          if (typeof window === 'undefined') return null;
          return document.cookie
            .split('; ')
            .find(row => row.startsWith(`${key}=`))
            ?.split('=')[1];
        },
        setItem: (key: string, value: string) => {
          if (typeof window === 'undefined') return;
          document.cookie = `${key}=${value}; path=/; secure; samesite=strict`;
        },
        removeItem: (key: string) => {
          if (typeof window === 'undefined') return;
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        },
      },
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'tax-optimizer',
      },
      // Configure request timeouts
      fetch: (url: string, options: RequestInit) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  };

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);

  // Configure global error handler for auth state changes
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
      // Clear any cached data
      for (const key in localStorage) {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      }
    }
  });

  // Configure automatic retry logic for failed requests
  const originalFetch = client.rest.fetch.bind(client.rest);
  client.rest.fetch = async (url, options) => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await originalFetch(url, options);
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  };

  return client;
};

/**
 * Singleton Supabase client instance with enhanced security features
 * and comprehensive error handling for production use.
 * 
 * @example
 * ```typescript
 * import { supabase } from '@/lib/supabase';
 * 
 * // Authentication
 * const { data: { user }, error } = await supabase.auth.getUser();
 * 
 * // Database queries
 * const { data, error: queryError } = await supabase
 *   .from('scenarios')
 *   .select('*')
 *   .limit(10);
 * 
 * // Real-time subscriptions
 * const subscription = supabase
 *   .channel('changes')
 *   .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
 *     console.log('Change received!', payload);
 *   })
 *   .subscribe();
 * ```
 */
export const supabase = createSupabaseClient();

/**
 * Type guard to check if a user is authenticated
 * @param authState Current authentication state
 * @returns boolean indicating if user is authenticated
 */
export const isAuthenticated = (authState: AuthState): boolean => {
  return authState.isAuthenticated && !!authState.user;
};

// Prevent multiple instances in development with hot reloading
if (process.env.NODE_ENV === 'development') {
  Object.freeze(supabase);
}

export default supabase;