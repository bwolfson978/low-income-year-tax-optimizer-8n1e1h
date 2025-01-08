import { PrismaClient, DatabaseError } from '@prisma/client';
import { AuditLogger } from '@company/audit-logger';
import { UserProfile, UserPreferences, TaxFilingStatus, NotificationSettings } from '../types/user.types';
import { prisma } from '../config/database';
import { supabase } from '../config/supabase';
import { SYSTEM_CONFIG } from '../config/constants';

/**
 * UserModel class for handling user-related database operations with enhanced security and audit logging
 * @version 1.0.0
 */
export class UserModel {
  private prisma: PrismaClient;
  private supabase: typeof supabase;
  private logger: AuditLogger;

  constructor() {
    this.prisma = prisma;
    this.supabase = supabase;
    this.logger = new AuditLogger({
      service: 'user-service',
      version: '1.0.0'
    });
  }

  /**
   * Creates a new user profile with comprehensive validation and security checks
   * @param profile User profile data to create
   * @returns Promise resolving to created user profile
   * @throws DatabaseError if creation fails
   */
  async createUser(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
    try {
      // Validate email format and uniqueness
      if (!profile.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('Invalid email format');
      }

      // Check for existing user
      const existingUser = await this.prisma.user.findUnique({
        where: { email: profile.email }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create user in Supabase Auth
      const { data: authUser, error: authError } = await this.supabase.auth.admin.createUser({
        email: profile.email,
        email_confirm: true,
        password_min_length: SYSTEM_CONFIG.PASSWORD_MIN_LENGTH
      });

      if (authError) {
        throw new Error(`Auth creation failed: ${authError.message}`);
      }

      // Create user profile in database
      const user = await this.prisma.user.create({
        data: {
          id: authUser.user.id,
          email: profile.email,
          name: profile.name,
          phone_number: profile.phone_number,
          is_active: true,
          created_by: 'SYSTEM',
          updated_by: 'SYSTEM',
          version: 1
        }
      });

      // Log user creation
      await this.logger.log('user.created', {
        userId: user.id,
        email: user.email,
        source: 'UserModel.createUser'
      });

      return user;
    } catch (error) {
      await this.logger.error('user.creation.failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        profile: { ...profile, password: '[REDACTED]' }
      });
      throw error instanceof DatabaseError ? error : new DatabaseError(
        'Failed to create user',
        'USER_CREATION_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Retrieves a user profile by ID with security checks
   * @param userId User ID to retrieve
   * @returns Promise resolving to user profile or null if not found
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId, is_active: true }
      });

      await this.logger.log('user.retrieved', {
        userId,
        success: !!user
      });

      return user;
    } catch (error) {
      await this.logger.error('user.retrieval.failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error instanceof DatabaseError ? error : new DatabaseError(
        'Failed to retrieve user',
        'USER_RETRIEVAL_ERROR',
        { userId }
      );
    }
  }

  /**
   * Updates a user's profile with validation and audit logging
   * @param userId User ID to update
   * @param updates Partial user profile updates
   * @returns Promise resolving to updated user profile
   */
  async updateUser(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      // Validate update payload
      if (updates.email && !updates.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('Invalid email format');
      }

      // Perform optimistic locking update
      const user = await this.prisma.user.update({
        where: { 
          id: userId,
          is_active: true,
          version: updates.version
        },
        data: {
          ...updates,
          updated_at: new Date(),
          updated_by: userId,
          version: { increment: 1 }
        }
      });

      await this.logger.log('user.updated', {
        userId,
        updates: { ...updates, password: updates.password ? '[REDACTED]' : undefined }
      });

      return user;
    } catch (error) {
      await this.logger.error('user.update.failed', {
        userId,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error instanceof DatabaseError ? error : new DatabaseError(
        'Failed to update user',
        'USER_UPDATE_ERROR',
        { userId, updates }
      );
    }
  }

  /**
   * Updates user preferences with validation
   * @param userId User ID to update preferences for
   * @param preferences New user preferences
   * @returns Promise resolving to updated preferences
   */
  async updatePreferences(userId: string, preferences: UserPreferences): Promise<UserPreferences> {
    try {
      // Validate preferences
      if (!Object.values(TaxFilingStatus).includes(preferences.tax_filing_status)) {
        throw new Error('Invalid tax filing status');
      }

      const updatedPreferences = await this.prisma.userPreferences.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          ...preferences
        },
        update: {
          ...preferences,
          updated_at: new Date()
        }
      });

      await this.logger.log('user.preferences.updated', {
        userId,
        preferences: updatedPreferences
      });

      return updatedPreferences;
    } catch (error) {
      await this.logger.error('user.preferences.update.failed', {
        userId,
        preferences,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error instanceof DatabaseError ? error : new DatabaseError(
        'Failed to update user preferences',
        'PREFERENCES_UPDATE_ERROR',
        { userId }
      );
    }
  }

  /**
   * Safely deactivates a user account with cleanup
   * @param userId User ID to deactivate
   * @returns Promise resolving when deactivation is complete
   */
  async deactivateUser(userId: string): Promise<void> {
    try {
      // Deactivate Supabase auth
      const { error: authError } = await this.supabase.auth.admin.deleteUser(userId);
      if (authError) throw new Error(`Auth deactivation failed: ${authError.message}`);

      // Deactivate database record
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          is_active: false,
          updated_at: new Date(),
          updated_by: 'SYSTEM',
          version: { increment: 1 }
        }
      });

      await this.logger.log('user.deactivated', {
        userId,
        timestamp: new Date()
      });
    } catch (error) {
      await this.logger.error('user.deactivation.failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error instanceof DatabaseError ? error : new DatabaseError(
        'Failed to deactivate user',
        'USER_DEACTIVATION_ERROR',
        { userId }
      );
    }
  }
}