import React, { useState, useRef, useEffect } from 'react';
import { UserCircle, Settings, LogOut } from 'lucide-react'; // v0.3.0
import { useAuthContext } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { AuthState } from '../../types/auth.types';

interface UserMenuProps {
  className?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({ className = '' }) => {
  // State and refs
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { authState, logout } = useAuthContext();

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key to close menu
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  // Handlers
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      // Announce logout to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = 'Successfully logged out';
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    } catch (error) {
      console.error('Logout failed:', error);
      // Announce error to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'alert');
      announcement.textContent = 'Logout failed. Please try again.';
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleProfileClick = () => {
    setIsOpen(false);
    // Save scroll position for back navigation
    sessionStorage.setItem('scrollPosition', window.scrollY.toString());
    window.location.href = '/profile';
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    // Save scroll position for back navigation
    sessionStorage.setItem('scrollPosition', window.scrollY.toString());
    window.location.href = '/settings';
  };

  if (!authState.isAuthenticated || !authState.user) {
    return null;
  }

  return (
    <div 
      ref={menuRef}
      className={`relative ${className}`}
      role="navigation"
      aria-label="User menu"
    >
      {/* Menu Trigger Button */}
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 px-3 py-2"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="user-menu"
        aria-haspopup="true"
      >
        <UserCircle className="h-5 w-5" aria-hidden="true" />
        <span className="hidden md:inline">{authState.user.email}</span>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="user-menu"
          className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
        >
          <div className="py-1" role="none">
            {/* Profile Button */}
            <Button
              variant="ghost"
              size="sm"
              className="flex w-full items-center px-4 py-2 text-left"
              onClick={handleProfileClick}
              role="menuitem"
              tabIndex={0}
            >
              <UserCircle className="mr-3 h-5 w-5" aria-hidden="true" />
              Profile
            </Button>

            {/* Settings Button */}
            <Button
              variant="ghost"
              size="sm"
              className="flex w-full items-center px-4 py-2 text-left"
              onClick={handleSettingsClick}
              role="menuitem"
              tabIndex={0}
            >
              <Settings className="mr-3 h-5 w-5" aria-hidden="true" />
              Settings
            </Button>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              className="flex w-full items-center px-4 py-2 text-left text-red-600 dark:text-red-400"
              onClick={handleLogout}
              disabled={isLoading}
              role="menuitem"
              tabIndex={0}
            >
              <LogOut className="mr-3 h-5 w-5" aria-hidden="true" />
              {isLoading ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;