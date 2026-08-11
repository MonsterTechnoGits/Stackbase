import crypto from 'crypto';

/**
 * Utility class for encrypting / decrypting sensitive data (AES-256-CBC).
 * Format: `iv:encryptedData` (both hex-encoded).
 */
export class CryptoUtils {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly SECRET_KEY =
    process.env.CRYPTO_SECRET_KEY || 'your-default-secret-key-32-chars!!';

  /**
   * Encrypts a plain-text string.
   * @returns Encrypted string in format `iv:encryptedData` (hex).
   */
  static encrypt(plainText: string): string {
    const key = crypto.createHash('sha256').update(this.SECRET_KEY).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts an encrypted string.
   * @param encryptedText - The encrypted text in format: iv:encryptedData
   * @returns Decrypted plain text string
   */
  static decrypt(encryptedText: string): string {
    try {
      // Check if the text is already decrypted (for backwards compatibility)
      if (!encryptedText.includes(':')) {
        return encryptedText;
      }

      const textParts = encryptedText.split(':');
      if (textParts.length !== 2) {
        // If format is incorrect, return original (assume it's not encrypted)
        return encryptedText;
      }

      const [ivHex, encryptedData] = textParts;
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.createHash('sha256').update(this.SECRET_KEY).digest();
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.warn('Failed to decrypt password, using original value:', error);
      return encryptedText;
    }
  }
}

/*

 Option 1 (Online Tool):
  1. Go to https://www.devglan.com/online-tools/aes-encryption-decryption
  2. Enter your password in "Plain Text"
  3. Use your secret key in "Secret Key"
  4. Click "Encrypt"
  5. Copy the encrypted result

  Option 2 (Node.js Script):
  node encrypt-password.js "your-actual-password"

  This will output the encrypted password in the format
  iv:encryptedData that you can store in GitHub Secrets.

  Remember: Use the same CRYPTO_SECRET_KEY in both encryption
  and your environment variables for decryption to work.
  
*/
