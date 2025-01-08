/**
 * User data validation schemas and functions with enhanced security measures
 * @version 1.0.0
 */

import { object, string } from 'yup'; // v1.3+
import { UserProfile, UserAuthRequest, UserRegistrationRequest } from '../../types/user.types';

/**
 * Common email validation rules with security measures
 */
const emailSchema = string()
  .required('Email is required')
  .email('Invalid email format')
  .max(255, 'Email must not exceed 255 characters')
  .matches(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    'Invalid email format'
  )
  .trim()
  .lowercase();

/**
 * Enhanced password validation rules with security requirements
 */
const passwordSchema = string()
  .required('Password is required')
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  )
  .notOneOf(
    ['Password123!', 'Admin123!', 'Welcome123!'],
    'Password is too common'
  );

/**
 * Name validation rules with sanitization
 */
const nameSchema = string()
  .required('Name is required')
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .matches(
    /^[a-zA-Z0-9\s-']+$/,
    'Name can only contain letters, numbers, spaces, hyphens, and apostrophes'
  )
  .trim();

/**
 * Validation schema for user authentication
 */
export const userAuthSchema = object({
  email: emailSchema,
  password: passwordSchema
}).required();

/**
 * Validation schema for user registration with additional fields
 */
export const userRegistrationSchema = object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema
}).required();

/**
 * Validates user authentication data with enhanced error handling
 * @param data - User authentication request data
 * @returns Promise resolving to boolean indicating validation success
 * @throws ValidationError with detailed message if validation fails
 */
export const validateUserAuth = async (data: UserAuthRequest): Promise<boolean> => {
  try {
    // Sanitize input data
    const sanitizedData = {
      email: data.email?.trim().toLowerCase(),
      password: data.password
    };

    // Validate against schema
    await userAuthSchema.validate(sanitizedData, {
      abortEarly: false,
      stripUnknown: true
    });

    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Authentication validation failed: ${error.message}`);
    }
    throw new Error('Authentication validation failed');
  }
};

/**
 * Validates user registration data with comprehensive error handling
 * @param data - User registration request data
 * @returns Promise resolving to boolean indicating validation success
 * @throws ValidationError with detailed message if validation fails
 */
export const validateUserRegistration = async (data: UserRegistrationRequest): Promise<boolean> => {
  try {
    // Sanitize input data
    const sanitizedData = {
      email: data.email?.trim().toLowerCase(),
      password: data.password,
      name: data.name?.trim()
    };

    // Validate against schema
    await userRegistrationSchema.validate(sanitizedData, {
      abortEarly: false,
      stripUnknown: true
    });

    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Registration validation failed: ${error.message}`);
    }
    throw new Error('Registration validation failed');
  }
};