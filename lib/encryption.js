const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Get encryption key from environment or generate one
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Derive a key from the master key and salt
 * @param {string} salt - Salt for key derivation
 * @returns {Buffer} Derived key
 */
function deriveKey(salt) {
  return crypto.pbkdf2Sync(
    ENCRYPTION_KEY,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypt a message
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted message in format: salt:iv:authTag:ciphertext (base64)
 */
function encrypt(text) {
  if (!text) return text;

  try {
    // Generate salt and derive key
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(salt);

    // Generate IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ]);

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine components and convert to base64
    return Buffer.concat([
      salt,
      iv,
      authTag,
      encrypted
    ]).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Message encryption failed');
  }
}

/**
 * Decrypt a message
 * @param {string} encryptedText - Encrypted message in format: salt:iv:authTag:ciphertext (base64)
 * @returns {string} Decrypted plain text
 */
function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;

  try {
    // Convert from base64 and extract components
    const buffer = Buffer.from(encryptedText, 'base64');
    
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive key
    const key = deriveKey(salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Message decryption failed');
  }
}

/**
 * Verify the integrity of an encrypted message
 * @param {string} encryptedText - Encrypted message
 * @returns {boolean} True if message is valid
 */
function verifyMessage(encryptedText) {
  try {
    const decrypted = decrypt(encryptedText);
    return !!decrypted;
  } catch {
    return false;
  }
}

module.exports = {
  encrypt,
  decrypt,
  verifyMessage
}; 