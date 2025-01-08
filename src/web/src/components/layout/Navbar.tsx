import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react'; // v0.3.0
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { Button } from '../ui/Button';
import { UI_CONSTANTS } from '../../lib/constants';

/**
 * Main navigation bar component with mobile responsiveness and accessibility features.
 * Implements sticky header with backdrop blur and mobile menu functionality.
 */
const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Handle scroll events for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle mobile menu accessibility
  useEffect(() => {
    if (isMobileMenuOpen) {
      // Prevent body scroll when mobile menu is open
      document.body.style.overflow = 'hidden';
      // Announce menu state to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = 'Navigation menu opened';
      document.body.appendChild(announcement);

      return () => {
        document.body.style.overflow = '';
        document.body.removeChild(announcement);
      };
    }
  }, [isMobileMenuOpen]);

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isMobileMenuOpen]);

  // Toggle mobile menu with accessibility considerations
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${
        hasScrolled ? 'shadow-sm' : ''
      }`}
      role="banner"
    >
      <nav
        className="container mx-auto flex h-14 items-center px-4"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="mr-6 flex items-center space-x-2"
          aria-label="Tax Optimizer home"
        >
          <span className="text-xl font-bold">Tax Optimizer</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex md:space-x-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-foreground/60 transition-colors hover:text-foreground/80"
          >
            <Link href="/scenarios">Scenarios</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-foreground/60 transition-colors hover:text-foreground/80"
          >
            <Link href="/calculator">Calculator</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-foreground/60 transition-colors hover:text-foreground/80"
          >
            <Link href="/help">Help</Link>
          </Button>
        </div>

        {/* Right-side Actions */}
        <div className="ml-auto flex items-center space-x-4">
          {/* Theme Toggle */}
          <ThemeToggle className="transition-colors duration-200" />

          {/* User Menu */}
          <UserMenu className="hidden md:flex" />

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-0 top-14 z-50 grid h-[calc(100vh-4rem)] grid-flow-row auto-rows-max overflow-auto bg-background p-6 pb-32 shadow-md animate-in slide-in-from-bottom-80 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <div className="relative z-20 grid gap-6 rounded-md bg-background p-4">
            <Link
              href="/scenarios"
              className="flex items-center space-x-2 text-sm font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Scenarios
            </Link>
            <Link
              href="/calculator"
              className="flex items-center space-x-2 text-sm font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Calculator
            </Link>
            <Link
              href="/help"
              className="flex items-center space-x-2 text-sm font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Help
            </Link>
            <div className="border-t pt-4">
              <UserMenu />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;