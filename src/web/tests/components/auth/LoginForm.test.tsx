import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { axe } from '@axe-core/react';
import { ThemeProvider } from '../../../src/context/ThemeContext';
import LoginForm from '../../../src/components/auth/LoginForm';
import { useAuth } from '../../../src/hooks/useAuth';

// Mock useAuth hook
vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test data
const validCredentials = {
  email: 'test@example.com',
  password: 'Password123!',
  rememberMe: false
};

const invalidCredentials = {
  email: 'invalid-email',
  password: 'short',
  rememberMe: false
};

describe('LoginForm', () => {
  // Setup mock auth hook before each test
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      login: vi.fn().mockResolvedValue({ success: true }),
      error: null,
      loading: false,
      rateLimitExceeded: false
    });
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  describe('Rendering and Accessibility', () => {
    it('renders all form elements with proper ARIA attributes', () => {
      render(
        <ThemeProvider>
          <LoginForm />
        </ThemeProvider>
      );

      // Check form elements
      expect(screen.getByRole('form')).toHaveAttribute('aria-label', 'Login form');
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('meets WCAG accessibility standards', async () => {
      const { container } = render(
        <ThemeProvider>
          <LoginForm />
        </ThemeProvider>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      render(
        <ThemeProvider>
          <LoginForm />
        </ThemeProvider>
      );

      const form = screen.getByRole('form');
      const focusableElements = within(form).getAllByRole('textbox');
      
      // Tab through form elements
      for (const element of focusableElements) {
        element.focus();
        expect(document.activeElement).toBe(element);
      }
    });
  });

  describe('Form Validation', () => {
    it('validates email format', async () => {
      render(
        <ThemeProvider>
          <LoginForm />
        </ThemeProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, 'invalid-email');
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('validates password requirements', async () => {
      render(
        <ThemeProvider>
          <LoginForm />
        </ThemeProvider>
      );

      const passwordInput = screen.getByLabelText(/password/i);
      await userEvent.type(passwordInput, 'short');
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('shows error messages for empty required fields', async () => {
      render(
        <ThemeProvider>
          <LoginForm />
        </ThemeProvider>
      );

      const submitButton = screen.getByRole('button', { name: /log in/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('handles successful login', async () => {
      const mockLogin = vi.fn().mockResolvedValue({ success: true });
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        error: null,
        loading: false
      });

      render(
        <ThemeProvider>
          <LoginForm />
        </ThemeProvider>
      );

      // Fill form
      await userEvent.type(screen.getByLabelText(/email/i), validCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
      await userEvent.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(expect.objectContaining({
          email: validCredentials.email,
          password: validCredentials.password
        }));
      });
    });

    it('displays error message on failed login', async () => {
      const errorMessage = 'Invalid credentials';
      const mockLogin = vi.fn().mockResolvedValue({ 
        success: false, 
        error: { message: errorMessage } 
      });
      
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        error: null,
        loading: false
      });

      render(
        <ThemeProvider>
          <LoginForm />
        </ThemeProvider>
      );

      await userEvent.type(screen.getByLabelText(/email/i), validCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
      await userEvent.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
      });
    });

    it('handles rate limiting', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        login: vi.fn(),
        error: { message: 'Too many attempts. Please try again later.' },
        loading: false,
        rateLimitExceeded: true
      });

      render(
        <ThemeProvider>
          <LoginForm />
        </ThemeProvider>
      );

      await userEvent.type(screen.getByLabelText(/email/i), validCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
      await userEvent.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/too many attempts/i);
      });
    });
  });

  describe('UI Interactions', () => {
    it('toggles password visibility', async () => {
      render(
        <ThemeProvider>
          <LoginForm />
        </ThemeProvider>
      );

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      expect(passwordInput).toHaveAttribute('type', 'password');
      await userEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      await userEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('shows loading state during submission', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        login: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
        error: null,
        loading: true
      });

      render(
        <ThemeProvider>
          <LoginForm />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();
      });
    });

    it('maintains form state during theme changes', async () => {
      render(
        <ThemeProvider>
          <LoginForm />
        </ThemeProvider>
      );

      await userEvent.type(screen.getByLabelText(/email/i), validCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);

      // Simulate theme change
      const { rerender } = render(
        <ThemeProvider>
          <LoginForm />
        </ThemeProvider>
      );

      expect(screen.getByLabelText(/email/i)).toHaveValue(validCredentials.email);
      expect(screen.getByLabelText(/password/i)).toHaveValue(validCredentials.password);
    });
  });
});