"use client"

import { useRouter } from 'next/navigation'; // ^14.0.0
import { useToast } from '@/hooks/use-toast'; // ^1.0.0
import ResetPasswordForm from '../../../components/auth/ResetPasswordForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';

/**
 * Password reset page component with enhanced security and accessibility features.
 * Implements secure password reset flow with rate limiting and CSRF protection.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();

  /**
   * Handles successful password reset request
   * Updates UI and redirects user with success message
   */
  const handleResetSuccess = () => {
    // Show success toast with screen reader consideration
    toast({
      title: "Reset Email Sent",
      description: "Check your email for password reset instructions",
      duration: 5000,
      variant: "success",
      role: "status",
      "aria-live": "polite",
    });

    // Redirect to login page with success parameter
    router.push('/auth/login?reset=requested');
  };

  /**
   * Handles password reset request errors
   * Provides user feedback and updates accessibility context
   */
  const handleResetError = (error: string) => {
    toast({
      title: "Reset Request Failed",
      description: error,
      duration: 5000,
      variant: "destructive",
      role: "alert",
      "aria-live": "assertive",
    });
  };

  return (
    <main 
      className="flex min-h-screen items-center justify-center p-4 bg-background"
      role="main"
      aria-labelledby="reset-password-title"
    >
      <Card 
        className="w-full max-w-md mx-auto shadow-lg"
        elevation="medium"
        theme="system"
      >
        <CardHeader className="space-y-2">
          <CardTitle
            as="h1"
            id="reset-password-title"
            className="text-2xl font-bold tracking-tight"
          >
            Reset Password
          </CardTitle>
          <CardDescription color="muted">
            Enter your email address and we&apos;ll send you instructions to reset your password.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ResetPasswordForm
            onSuccess={handleResetSuccess}
            onError={handleResetError}
          />

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/auth/login')}
              className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-sm"
              type="button"
            >
              Back to Login
            </button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

// Add metadata for SEO and security
export const metadata = {
  title: 'Reset Password - Tax Optimizer',
  description: 'Reset your password to regain access to your Tax Optimizer account',
  robots: 'noindex, nofollow',
  headers: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none';",
  },
};