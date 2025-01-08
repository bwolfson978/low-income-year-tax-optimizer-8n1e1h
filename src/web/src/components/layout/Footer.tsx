import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../../context/ThemeContext';
import { Button, buttonVariants } from '../ui/Button';
import { UI_CONSTANTS } from '../../lib/constants';

/**
 * Props interface for Footer component
 */
interface FooterProps {
  className?: string;
  ariaLabel?: string;
  testId?: string;
  role?: string;
}

/**
 * Returns the current year for copyright notice with error handling
 */
const getCurrentYear = (): number => {
  try {
    return new Date().getFullYear();
  } catch (error) {
    console.error('Error getting current year:', error);
    return 2024; // Fallback year
  }
};

/**
 * Footer component with enhanced accessibility and responsive design
 */
const Footer = React.memo<FooterProps>(({
  className = '',
  ariaLabel = 'Site footer',
  testId = 'footer',
  role = 'contentinfo'
}) => {
  const { theme, isDark } = useTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const currentYear = getCurrentYear();

  // Handle theme transitions
  const handleThemeTransition = useCallback(() => {
    setIsTransitioning(true);
    requestAnimationFrame(() => {
      setIsTransitioning(false);
    });
  }, []);

  // Cleanup animation frames on unmount
  useEffect(() => {
    return () => {
      if (isTransitioning) {
        setIsTransitioning(false);
      }
    };
  }, [isTransitioning]);

  return (
    <footer
      className={`w-full border-t border-gray-200 dark:border-gray-800 transition-colors duration-200 ${className} ${
        isTransitioning ? 'transition-none' : ''
      }`}
      aria-label={ariaLabel}
      data-testid={testId}
      role={role}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Company Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Tax Optimizer
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Optimize your financial decisions during periods of reduced income.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Quick Links
            </h3>
            <nav aria-label="Footer quick links" className="space-y-2">
              <Link
                href="/scenarios"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'block text-sm'
                })}
              >
                My Scenarios
              </Link>
              <Link
                href="/calculator"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'block text-sm'
                })}
              >
                Tax Calculator
              </Link>
              <Link
                href="/help"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'block text-sm'
                })}
              >
                Help Center
              </Link>
            </nav>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Legal
            </h3>
            <nav aria-label="Footer legal links" className="space-y-2">
              <Link
                href="/privacy"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'block text-sm'
                })}
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'block text-sm'
                })}
              >
                Terms of Service
              </Link>
              <Link
                href="/disclaimer"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'block text-sm'
                })}
              >
                Tax Disclaimer
              </Link>
            </nav>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Contact
            </h3>
            <address className="not-italic text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>Email: support@taxoptimizer.com</p>
              <p>Hours: Mon-Fri 9AM-5PM EST</p>
            </address>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {currentYear} Tax Optimizer. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a
                href="https://twitter.com/taxoptimizer"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on Twitter"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Twitter
              </a>
              <a
                href="https://linkedin.com/company/taxoptimizer"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on LinkedIn"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export { Footer, type FooterProps };