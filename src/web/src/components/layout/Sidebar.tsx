import React, { useCallback, useEffect, useState, memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from 'class-variance-authority';
import {
  LayoutDashboard,
  Calculator,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LogOut,
  type LucideIcon
} from 'lucide-react'; // v0.3.0
import { buttonVariants } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

interface SidebarProps {
  className?: string;
  isCollapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  enableTouchGestures?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  requiresAuth: boolean;
  ariaLabel: string;
  role?: string;
}

const TOUCH_THRESHOLD = 50;
const COLLAPSE_TRANSITION_MS = 200;

const Sidebar = memo<SidebarProps>(({
  className,
  isCollapsed,
  onCollapse,
  enableTouchGestures = true
}) => {
  const { isAuthenticated, logout } = useAuth();
  const { isDark } = useTheme();
  const pathname = usePathname();
  const [touchStart, setTouchStart] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Memoized navigation items
  const navItems = React.useMemo(() => getNavItems(isAuthenticated), [isAuthenticated]);

  // Handle theme transition effects
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, COLLAPSE_TRANSITION_MS);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableTouchGestures) return;
    setTouchStart(e.touches[0].clientX);
  }, [enableTouchGestures]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableTouchGestures || !touchStart) return;

    const currentTouch = e.touches[0].clientX;
    const diff = touchStart - currentTouch;

    if (Math.abs(diff) > TOUCH_THRESHOLD) {
      setIsTransitioning(true);
      onCollapse(diff > 0);
      setTouchStart(0);
    }
  }, [enableTouchGestures, touchStart, onCollapse]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsTransitioning(true);
      onCollapse(!isCollapsed);
    }
  }, [isCollapsed, onCollapse]);

  // Handle logout with error boundary
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-background focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>

      <aside
        className={cn(
          'flex flex-col h-screen sticky top-0 transition-all duration-200',
          'border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
          isCollapsed ? 'w-[70px]' : 'w-[240px]',
          isTransitioning && 'transition-gpu',
          isDark && 'border-slate-800',
          className
        )}
        aria-label="Sidebar navigation"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Collapse toggle button */}
        <button
          onClick={() => {
            setIsTransitioning(true);
            onCollapse(!isCollapsed);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'absolute right-[-12px] top-6 z-10 h-6 w-6',
            'flex items-center justify-center rounded-full border',
            'bg-background text-muted-foreground hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            isDark && 'border-slate-800'
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1 p-4" role="navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  buttonVariants({
                    variant: isActive ? 'secondary' : 'ghost',
                    size: 'sm',
                  }),
                  'w-full justify-start',
                  isCollapsed && 'justify-center px-2',
                  isActive && 'bg-secondary'
                )}
              >
                <item.icon className={cn('h-5 w-5', !isCollapsed && 'mr-2')} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout button for authenticated users */}
        {isAuthenticated && (
          <div className="p-4 border-t border-border">
            <button
              onClick={handleLogout}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'w-full justify-start',
                isCollapsed && 'justify-center px-2'
              )}
              aria-label="Log out"
            >
              <LogOut className={cn('h-5 w-5', !isCollapsed && 'mr-2')} />
              {!isCollapsed && <span>Log out</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
});

// Memoized navigation items generator
const getNavItems = memo((isAuthenticated: boolean): NavItem[] => {
  const items: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      requiresAuth: true,
      ariaLabel: 'Go to dashboard',
      role: 'menuitem'
    },
    {
      label: 'Calculate',
      href: '/calculate',
      icon: Calculator,
      requiresAuth: true,
      ariaLabel: 'Start new calculation',
      role: 'menuitem'
    },
    {
      label: 'History',
      href: '/history',
      icon: History,
      requiresAuth: true,
      ariaLabel: 'View calculation history',
      role: 'menuitem'
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      requiresAuth: true,
      ariaLabel: 'Manage settings',
      role: 'menuitem'
    },
    {
      label: 'Help',
      href: '/help',
      icon: HelpCircle,
      requiresAuth: false,
      ariaLabel: 'View help documentation',
      role: 'menuitem'
    }
  ];

  return items.filter(item => !item.requiresAuth || isAuthenticated);
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;