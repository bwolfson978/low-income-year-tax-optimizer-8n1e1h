/**
 * Core TypeScript interfaces and types for user-related data structures
 * @version 1.0.0
 */

import { APIResponse } from './api.types';

/**
 * Enumeration of supported tax filing statuses
 */
export enum TaxFilingStatus {
  SINGLE = 'SINGLE',
  MARRIED_FILING_JOINTLY = 'MARRIED_FILING_JOINTLY',
  MARRIED_FILING_SEPARATELY = 'MARRIED_FILING_SEPARATELY',
  HEAD_OF_HOUSEHOLD = 'HEAD_OF_HOUSEHOLD'
}

/**
 * Enumeration of supported two-factor authentication methods
 */
export enum TwoFactorMethod {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  AUTHENTICATOR = 'AUTHENTICATOR'
}

/**
 * Enumeration of supported theme preferences
 */
export enum ThemePreference {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM'
}

/**
 * Interface representing a trusted device for security purposes
 */
export interface TrustedDevice {
  /** Unique identifier for the device */
  deviceId: string;
  /** User-friendly device name */
  deviceName: string;
  /** Device type (e.g., mobile, desktop) */
  deviceType: string;
  /** Last access timestamp */
  lastAccessedAt: Date;
  /** IP address of last access */
  lastIpAddress: string;
}

/**
 * Core user profile data structure with audit and versioning support
 */
export interface UserProfile {
  /** Unique identifier for the user */
  id: string;
  /** User's email address (unique) */
  email: string;
  /** User's full name */
  name: string;
  /** Optional phone number */
  phone_number: string | null;
  /** Account creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
  /** Last login timestamp */
  last_login_at: Date;
  /** Account status flag */
  is_active: boolean;
  /** ID of user who created this record */
  created_by: string;
  /** ID of user who last updated this record */
  updated_by: string;
  /** Record version for optimistic locking */
  version: number;
}

/**
 * Extended user preference settings including security and localization
 */
export interface UserPreferences {
  /** Default state for tax calculations */
  default_tax_state: string;
  /** Tax filing status */
  tax_filing_status: TaxFilingStatus;
  /** Notification preferences */
  notification_settings: NotificationSettings;
  /** Security preferences */
  security_preferences: SecurityPreferences;
  /** UI theme preference */
  theme_preference: ThemePreference;
  /** User's locale preference */
  locale: string;
}

/**
 * User security and authentication preferences
 */
export interface SecurityPreferences {
  /** Whether 2FA is enabled */
  two_factor_enabled: boolean;
  /** Selected 2FA method */
  two_factor_method: TwoFactorMethod;
  /** Session timeout in minutes */
  session_timeout_minutes: number;
  /** List of trusted devices */
  trusted_devices: TrustedDevice[];
}

/**
 * Comprehensive notification preferences including tax and security alerts
 */
export interface NotificationSettings {
  /** Enable/disable email notifications */
  email_notifications: boolean;
  /** Notifications for scenario updates */
  scenario_updates: boolean;
  /** Notifications for calculation completion */
  calculation_completion: boolean;
  /** Tax deadline reminder notifications */
  tax_deadline_reminders: boolean;
  /** Security-related notifications */
  security_alerts: boolean;
}

/**
 * Enhanced user registration request with consent tracking
 */
export interface UserRegistrationRequest {
  /** User's email address */
  email: string;
  /** User's password (will be hashed) */
  password: string;
  /** User's full name */
  name: string;
  /** Optional phone number */
  phone_number: string | null;
  /** Terms and conditions acceptance flag */
  terms_accepted: boolean;
  /** Marketing communications consent flag */
  marketing_consent: boolean;
}

/**
 * Type alias for user profile API response
 */
export type UserProfileResponse = APIResponse<UserProfile>;

/**
 * Type alias for user preferences API response
 */
export type UserPreferencesResponse = APIResponse<UserPreferences>;

/**
 * Type alias for user registration API response
 */
export type UserRegistrationResponse = APIResponse<UserProfile>;