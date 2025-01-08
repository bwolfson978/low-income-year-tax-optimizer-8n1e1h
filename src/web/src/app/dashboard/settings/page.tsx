'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { withErrorBoundary } from 'react-error-boundary';
import { toast } from 'react-hot-toast';
import { Card } from '@shadcn/ui';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import { Select } from '../../../components/ui/Select';
import { TAX_CONSTANTS, UI_CONSTANTS } from '../../../lib/constants';

// Type definitions for form data
interface NotificationPreferences {
  emailNotifications: boolean;
  calculationAlerts: boolean;
  marketUpdates: boolean;
  emailFrequency: 'daily' | 'weekly' | 'monthly';
  digestType: 'summary' | 'detailed';
}

interface UserSettings {
  defaultTaxState: string;
  theme: 'light' | 'dark' | 'system';
  notificationPreferences: NotificationPreferences;
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
  };
  language: 'en' | 'es';
}

// Error boundary fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="p-6 text-center" role="alert">
    <h2 className="text-xl font-semibold text-destructive">Settings Error</h2>
    <p className="mt-2 text-muted-foreground">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="mt-4 px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 focus:ring-2"
    >
      Try Again
    </button>
  </div>
);

const SettingsPage = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<UserSettings>({
    defaultValues: {
      defaultTaxState: user?.user_metadata?.defaultTaxState || '',
      theme: theme as 'light' | 'dark' | 'system',
      notificationPreferences: {
        emailNotifications: true,
        calculationAlerts: true,
        marketUpdates: false,
        emailFrequency: 'weekly',
        digestType: 'summary'
      },
      accessibility: {
        highContrast: false,
        reducedMotion: false
      },
      language: 'en'
    }
  });

  const handleSettingsSave = useCallback(async (data: UserSettings) => {
    try {
      setIsSaving(true);
      
      // Optimistically update theme if changed
      if (data.theme !== theme) {
        toggleTheme();
      }

      // Apply accessibility settings
      if (data.accessibility.reducedMotion) {
        document.documentElement.style.setProperty('--motion-reduce', 'reduce');
      }

      // Update user preferences in database
      // Note: Actual API call would go here

      toast.success('Settings saved successfully');
      reset(data);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [theme, toggleTheme, reset]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight" tabIndex={0}>
        Account Settings
      </h1>

      <form onSubmit={handleSubmit(handleSettingsSave)} className="space-y-6">
        {/* General Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4" tabIndex={0}>
            General Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="defaultTaxState" className="block text-sm font-medium mb-1">
                Default Tax State
              </label>
              <Select
                id="defaultTaxState"
                name="defaultTaxState"
                value={register('defaultTaxState').value}
                onChange={(value) => register('defaultTaxState').onChange({ target: { value } })}
                options={TAX_CONSTANTS.SUPPORTED_STATES.map(state => ({
                  value: state,
                  label: state
                }))}
                error={errors.defaultTaxState?.message}
                ariaLabel="Select your default tax state"
              />
            </div>

            <div>
              <label htmlFor="theme" className="block text-sm font-medium mb-1">
                Theme Preference
              </label>
              <Select
                id="theme"
                name="theme"
                value={register('theme').value}
                onChange={(value) => register('theme').onChange({ target: { value } })}
                options={UI_CONSTANTS.THEME_OPTIONS.map(option => ({
                  value: option,
                  label: option.charAt(0).toUpperCase() + option.slice(1)
                }))}
                error={errors.theme?.message}
                ariaLabel="Select theme preference"
              />
            </div>
          </div>
        </Card>

        {/* Notification Preferences */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4" tabIndex={0}>
            Notification Preferences
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="emailNotifications" className="text-sm font-medium">
                Email Notifications
              </label>
              <input
                type="checkbox"
                id="emailNotifications"
                {...register('notificationPreferences.emailNotifications')}
                className="rounded border-gray-300 focus:ring-2"
              />
            </div>

            <div>
              <label htmlFor="emailFrequency" className="block text-sm font-medium mb-1">
                Email Frequency
              </label>
              <Select
                id="emailFrequency"
                name="emailFrequency"
                value={register('notificationPreferences.emailFrequency').value}
                onChange={(value) => register('notificationPreferences.emailFrequency').onChange({ target: { value } })}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' }
                ]}
                error={errors.notificationPreferences?.emailFrequency?.message}
                ariaLabel="Select email frequency"
              />
            </div>
          </div>
        </Card>

        {/* Accessibility Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4" tabIndex={0}>
            Accessibility
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="highContrast" className="text-sm font-medium">
                High Contrast Mode
              </label>
              <input
                type="checkbox"
                id="highContrast"
                {...register('accessibility.highContrast')}
                className="rounded border-gray-300 focus:ring-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="reducedMotion" className="text-sm font-medium">
                Reduced Motion
              </label>
              <input
                type="checkbox"
                id="reducedMotion"
                {...register('accessibility.reducedMotion')}
                className="rounded border-gray-300 focus:ring-2"
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-busy={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Export with error boundary wrapper
export default withErrorBoundary(SettingsPage, {
  FallbackComponent: ErrorFallback,
  onReset: () => {
    // Reset error state
    window.location.reload();
  }
});