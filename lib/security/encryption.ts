import { webcrypto } from 'node:crypto';
const { subtle } = webcrypto;

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  salt: string;
}

export class MessageEncryption {
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(message: string, threadKey: string): Promise<EncryptedMessage> {
    const encoder = new TextEncoder();
    const salt = webcrypto.getRandomValues(new Uint8Array(16));
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    
    const key = await this.deriveKey(threadKey, salt);
    
    const ciphertext = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encoder.encode(message)
    );

    return {
      ciphertext: Buffer.from(ciphertext).toString('base64'),
      iv: Buffer.from(iv).toString('base64'),
      salt: Buffer.from(salt).toString('base64')
    };
  }

  static async decrypt(
    encryptedMessage: EncryptedMessage,
    threadKey: string
  ): Promise<string> {
    const decoder = new TextDecoder();
    const salt = Buffer.from(encryptedMessage.salt, 'base64');
    const iv = Buffer.from(encryptedMessage.iv, 'base64');
    const ciphertext = Buffer.from(encryptedMessage.ciphertext, 'base64');

    const key = await this.deriveKey(threadKey, salt);

    const plaintext = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      ciphertext
    );

    return decoder.decode(plaintext);
  }

  static generateThreadKey(): string {
    const key = webcrypto.getRandomValues(new Uint8Array(32));
    return Buffer.from(key).toString('base64');
  }
} 