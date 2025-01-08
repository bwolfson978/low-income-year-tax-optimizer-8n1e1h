/**
 * Encryption utilities for secure data protection using AES-256-GCM
 * Implements authenticated encryption for financial data and PII
 * @version 1.0.0
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2 } from 'crypto';
import { promisify } from 'util';
import { APIError } from '../../types/api.types';

// Cryptographic constants
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM mode
const AUTH_TAG_LENGTH = 16; // 128 bits authentication tag
const SALT_LENGTH = 32; // 256 bits salt for key derivation
const KEY_ITERATIONS = 100000; // PBKDF2 iterations for key stretching
const KEY_LENGTH = 32; // 256 bits key length

// Promisified crypto functions
const pbkdf2Async = promisify(pbkdf2);

/**
 * Structure for encrypted data with authentication metadata
 */
export interface EncryptedData {
  /** Encrypted data buffer */
  data: Buffer;
  /** Initialization vector used for encryption */
  iv: Buffer;
  /** Authentication tag for integrity verification */
  authTag: Buffer;
}

/**
 * Generates a cryptographically secure encryption key using PBKDF2
 * @param password - Secret password for key derivation
 * @param salt - Optional salt buffer (generates random if not provided)
 * @returns Promise resolving to derived key buffer
 * @throws APIError if key generation fails
 */
export async function generateEncryptionKey(
  password: string,
  salt?: Buffer
): Promise<Buffer> {
  try {
    // Validate password strength
    if (!password || password.length < 12) {
      throw new Error('Password must be at least 12 characters long');
    }

    // Generate or use provided salt
    const keySalt = salt || randomBytes(SALT_LENGTH);

    // Derive key using PBKDF2-SHA512
    const key = await pbkdf2Async(
      password,
      keySalt,
      KEY_ITERATIONS,
      KEY_LENGTH,
      'sha512'
    );

    return key;
  } catch (error) {
    throw {
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate encryption key',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    } as APIError;
  }
}

/**
 * Encrypts data using AES-256-GCM with authenticated encryption
 * @param data - Data to encrypt (Buffer or string)
 * @param key - Encryption key (must be 32 bytes)
 * @returns Promise resolving to EncryptedData object
 * @throws APIError if encryption fails
 */
export async function encrypt(
  data: Buffer | string,
  key: Buffer
): Promise<EncryptedData> {
  try {
    // Validate inputs
    if (!data) throw new Error('Data is required');
    if (!key || key.length !== KEY_LENGTH) {
      throw new Error('Invalid encryption key');
    }

    // Convert string to buffer if needed
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    // Generate random IV
    const iv = randomBytes(IV_LENGTH);

    // Create cipher with AES-256-GCM
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    // Encrypt data
    const encryptedData = Buffer.concat([
      cipher.update(dataBuffer),
      cipher.final()
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      data: encryptedData,
      iv,
      authTag
    };
  } catch (error) {
    throw {
      code: 'INTERNAL_ERROR',
      message: 'Encryption failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    } as APIError;
  }
}

/**
 * Decrypts data using AES-256-GCM with authentication verification
 * @param encryptedData - EncryptedData object containing data, IV, and auth tag
 * @param key - Decryption key (must be 32 bytes)
 * @returns Promise resolving to decrypted data buffer
 * @throws APIError if decryption or authentication fails
 */
export async function decrypt(
  encryptedData: EncryptedData,
  key: Buffer
): Promise<Buffer> {
  try {
    // Validate inputs
    if (!encryptedData?.data || !encryptedData.iv || !encryptedData.authTag) {
      throw new Error('Invalid encrypted data structure');
    }
    if (!key || key.length !== KEY_LENGTH) {
      throw new Error('Invalid decryption key');
    }

    // Create decipher
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      key,
      encryptedData.iv
    );

    // Set auth tag for verification
    decipher.setAuthTag(encryptedData.authTag);

    // Decrypt data
    const decryptedData = Buffer.concat([
      decipher.update(encryptedData.data),
      decipher.final()
    ]);

    return decryptedData;
  } catch (error) {
    throw {
      code: 'INTERNAL_ERROR',
      message: 'Decryption failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    } as APIError;
  }
}

/**
 * Rotates encryption key by re-encrypting data with a new key
 * @param encryptedData - Currently encrypted data
 * @param oldKey - Current encryption key
 * @param newKey - New encryption key
 * @returns Promise resolving to data re-encrypted with new key
 * @throws APIError if key rotation fails
 */
export async function rotateKey(
  encryptedData: EncryptedData,
  oldKey: Buffer,
  newKey: Buffer
): Promise<EncryptedData> {
  try {
    // Validate keys
    if (!oldKey || !newKey || oldKey.length !== KEY_LENGTH || newKey.length !== KEY_LENGTH) {
      throw new Error('Invalid encryption keys');
    }

    // Decrypt with old key
    const decryptedData = await decrypt(encryptedData, oldKey);

    // Re-encrypt with new key
    const reencryptedData = await encrypt(decryptedData, newKey);

    return reencryptedData;
  } catch (error) {
    throw {
      code: 'INTERNAL_ERROR',
      message: 'Key rotation failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    } as APIError;
  }
}