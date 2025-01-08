'use client';

import Link from 'next/link'; // ^14.0.0
import { buttonVariants } from '../components/ui/Button';

/**
 * Custom 404 Not Found error page component that provides a user-friendly error message
 * and navigation options while maintaining accessibility standards and theme support.
 * 
 * @returns {JSX.Element} Rendered 404 page with semantic structure and themed navigation
 */
export default function NotFound(): JSX.Element {
  return (
    <main 
      className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background text-foreground"
      role="main"
      aria-labelledby="error-heading"
    >
      <div className="container flex max-w-[700px] flex-col items-center justify-center space-y-8 px-4 py-8 text-center">
        <h1 
          id="error-heading"
          className="text-4xl font-bold tracking-tight sm:text-5xl"
        >
          404 - Page Not Found
        </h1>
        
        <p className="text-lg text-muted-foreground">
          We couldn&apos;t find the page you&apos;re looking for. The page may have been moved,
          deleted, or never existed. Please check the URL or return to the home page.
        </p>

        <Link
          href="/"
          className={buttonVariants({
            variant: 'default',
            size: 'lg',
            className: 'mt-8'
          })}
          aria-label="Return to home page"
        >
          Return to Home
        </Link>
      </div>
    </main>
  );
}