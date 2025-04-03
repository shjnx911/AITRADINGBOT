import crypto from 'crypto';

// A secure environment variable for encryption key
// In production, this should be stored in environment variables
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'ef3ee1bf05f35b5eb41e1bb46a66fa6d';
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts sensitive data like API keys and secrets
 * @param text Plain text to encrypt
 * @returns Encrypted text as hex string with IV prepended
 */
export function encrypt(text: string): string {
  // Create a random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher with key and iv
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET_KEY, 'hex'), iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Prepend IV to the encrypted data for later decryption
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts previously encrypted data
 * @param encryptedText Encrypted text with IV prepended
 * @returns Original plain text
 */
export function decrypt(encryptedText: string): string {
  try {
    // Split IV and encrypted text
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // Create decipher with same key and iv
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET_KEY, 'hex'), iv);
    
    // Decrypt the text
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return ''; // Return empty string on error
  }
}

/**
 * Masks sensitive data for display, showing only the first and last few characters
 * @param text Text to mask
 * @param visibleChars Number of characters to show at beginning and end
 * @returns Masked string with asterisks in the middle
 */
export function maskSensitiveData(text: string, visibleChars: number = 4): string {
  if (!text || text.length <= visibleChars * 2) {
    return text;
  }
  
  const start = text.substring(0, visibleChars);
  const end = text.substring(text.length - visibleChars);
  const middle = '*'.repeat(Math.min(10, text.length - (visibleChars * 2)));
  
  return `${start}${middle}${end}`;
}

/**
 * Hash function for passwords
 * @param password Plain text password
 * @returns Hashed password
 */
export function hashPassword(password: string): string {
  // Use a strong, slow hashing algorithm with salt (e.g., bcrypt)
  // For simplicity here, we're using a basic SHA256 hash with salt
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash
 * @param password Plain text password to verify
 * @param hashedPassword Previously hashed password from database
 * @returns True if password matches
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}