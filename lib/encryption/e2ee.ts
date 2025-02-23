import { Redis } from 'ioredis';
import { metrics } from '../metrics';
import { webcrypto } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';

const { subtle } = webcrypto;

interface KeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

interface EncryptedMessage {
  iv: string;
  encryptedData: string;
  signature: string;
}

interface DoubleRatchetState {
  rootKey: CryptoKey;
  sendingKey: CryptoKey;
  receivingKey: CryptoKey;
  previousSendingKeys: Map<number, CryptoKey>;
  messageNumber: number;
  associatedData?: Uint8Array;
}

interface RatchetMessage extends EncryptedMessage {
  messageNumber: number;
  previousMessageNumber: number;
}

interface SerializedRatchetState {
  rootKey: JsonWebKey;
  sendingKey: JsonWebKey;
  receivingKey: JsonWebKey;
  previousSendingKeys: [number, JsonWebKey][];
  messageNumber: number;
  associatedData?: string;
}

interface PreKeyBundle {
  identityKey: JsonWebKey;
  signedPreKey: JsonWebKey;
  signedPreKeySignature: string;
  oneTimePreKey?: JsonWebKey;
  oneTimePreKeyId?: number;
}

interface UserKeys {
  identityKey: CryptoKeyPair;
  signedPreKey: CryptoKeyPair;
  oneTimePreKeys: Map<number, CryptoKeyPair>;
}

interface InitialKeyAgreement {
  sharedSecret: CryptoKey;
  associatedData: Uint8Array;
}

interface GroupSession {
  senderKey: CryptoKey;
  chainKey: CryptoKey;
  messageNumber: number;
  groupId: string;
  members: string[];
}

interface SerializedGroupSession {
  senderKey: JsonWebKey;
  chainKey: JsonWebKey;
  messageNumber: number;
  groupId: string;
  members: string[];
}

interface GroupMessage extends EncryptedMessage {
  groupId: string;
  senderId: string;
  messageNumber: number;
}

class E2EEncryption {
  private redis: Redis;
  private keyPairs: Map<string, CryptoKeyPair>;
  private sharedKeys: Map<string, CryptoKey>;
  private ratchetStates: Map<string, DoubleRatchetState>;
  private userKeys: Map<string, UserKeys>;
  private groupSessions: Map<string, GroupSession>;
  private readonly KEY_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly KEY_PREFIX = 'e2ee:key:';
  private readonly SHARED_KEY_PREFIX = 'e2ee:shared:';
  private readonly RATCHET_PREFIX = 'e2ee:ratchet:';
  private readonly MAX_SKIP = 100;
  private readonly PRE_KEY_PREFIX = 'e2ee:prekey:';
  private readonly MIN_ONE_TIME_KEYS = 20;
  private readonly MAX_ONE_TIME_KEYS = 100;
  private readonly GROUP_KEY_PREFIX = 'e2ee:group:';
  private readonly MAX_GROUP_MESSAGE_SKIP = 1000;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
    this.keyPairs = new Map();
    this.sharedKeys = new Map();
    this.ratchetStates = new Map();
    this.userKeys = new Map();
    this.groupSessions = new Map();

    // Start key rotation
    setInterval(() => this.rotateKeys(), this.KEY_ROTATION_INTERVAL);
    
    // Start pre-key maintenance
    setInterval(() => this.maintainPreKeys(), 60 * 60 * 1000); // hourly
  }

  private async generateKeyPair(): Promise<CryptoKeyPair> {
    const startTime = Date.now();
    try {
      const keyPair = await subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-384'
        },
        true,
        ['deriveKey']
      );

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'generateKeyPair' }, duration);
      return keyPair;
    } catch (error) {
      console.error('Key pair generation failed:', error);
      metrics.encryptionErrors.inc({ operation: 'generateKeyPair' });
      throw error;
    }
  }

  private async exportKey(key: CryptoKey): Promise<JsonWebKey> {
    return subtle.exportKey('jwk', key);
  }

  private async importKey(jwk: JsonWebKey, type: 'public' | 'private'): Promise<CryptoKey> {
    return subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'ECDH',
        namedCurve: 'P-384'
      },
      true,
      type === 'private' ? ['deriveKey'] : []
    );
  }

  private async deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
    const startTime = Date.now();
    try {
      const sharedKey = await subtle.deriveKey(
        {
          name: 'ECDH',
          public: publicKey
        },
        privateKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'deriveSharedKey' }, duration);
      return sharedKey;
    } catch (error) {
      console.error('Shared key derivation failed:', error);
      metrics.encryptionErrors.inc({ operation: 'deriveSharedKey' });
      throw error;
    }
  }

  private async generateSignedPreKey(userId: string): Promise<{ keyPair: CryptoKeyPair; signature: string }> {
    const startTime = Date.now();
    try {
      const keyPair = await this.generateKeyPair();
      const identityKeys = this.userKeys.get(userId)?.identityKey;
      
      if (!identityKeys) {
        throw new Error('Identity key not found');
      }

      // Sign the pre-key with identity key
      const preKeyBytes = await subtle.exportKey('raw', keyPair.publicKey);
      const signingKey = await subtle.importKey(
        'raw',
        await subtle.exportKey('raw', identityKeys.privateKey),
        { name: 'ECDSA', namedCurve: 'P-384' },
        false,
        ['sign']
      );

      const signature = await subtle.sign(
        { name: 'ECDSA', hash: 'SHA-384' },
        signingKey,
        preKeyBytes
      );

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'generateSignedPreKey' }, duration);

      return {
        keyPair,
        signature: Buffer.from(signature).toString('base64')
      };
    } catch (error) {
      console.error('Signed pre-key generation failed:', error);
      metrics.encryptionErrors.inc({ operation: 'generateSignedPreKey' });
      throw error;
    }
  }

  private async generateOneTimePreKeys(userId: string, count: number): Promise<Map<number, CryptoKeyPair>> {
    const startTime = Date.now();
    const keys = new Map<number, CryptoKeyPair>();
    
    try {
      const userKeys = this.userKeys.get(userId);
      if (!userKeys) throw new Error('User keys not found');

      const existingCount = userKeys.oneTimePreKeys.size;
      const neededCount = Math.min(count, this.MAX_ONE_TIME_KEYS - existingCount);

      for (let i = 0; i < neededCount; i++) {
        const keyId = Date.now() + i; // Unique ID based on timestamp
        const keyPair = await this.generateKeyPair();
        keys.set(keyId, keyPair);
        userKeys.oneTimePreKeys.set(keyId, keyPair);
      }

      // Store in Redis
      await this.storePreKeys(userId, Array.from(keys.entries()));

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'generateOneTimePreKeys' }, duration);

      return keys;
    } catch (error) {
      console.error('One-time pre-key generation failed:', error);
      metrics.encryptionErrors.inc({ operation: 'generateOneTimePreKeys' });
      throw error;
    }
  }

  private async storePreKeys(userId: string, keys: [number, CryptoKeyPair][]): Promise<void> {
    const multi = this.redis.multi();
    
    for (const [keyId, keyPair] of keys) {
      const publicKey = await this.exportKey(keyPair.publicKey);
      multi.hset(
        `${this.PRE_KEY_PREFIX}${userId}`,
        keyId.toString(),
        JSON.stringify({
          key: publicKey,
          createdAt: Date.now()
        })
      );
    }

    await multi.exec();
  }

  async initializeUser(userId: string): Promise<JsonWebKey> {
    const startTime = Date.now();
    try {
      // Generate identity key pair
      const identityKeyPair = await this.generateKeyPair();
      
      // Generate signed pre-key
      const { keyPair: signedPreKey, signature } = await this.generateSignedPreKey(userId);

      // Initialize user keys
      this.userKeys.set(userId, {
        identityKey: identityKeyPair,
        signedPreKey: signedPreKey,
        oneTimePreKeys: new Map()
      });

      // Generate initial one-time pre-keys
      await this.generateOneTimePreKeys(userId, this.MIN_ONE_TIME_KEYS);

      // Store public identity key
      const publicKey = await this.exportKey(identityKeyPair.publicKey);
      await this.redis.set(
        `${this.KEY_PREFIX}${userId}`,
        JSON.stringify({
          publicKey,
          createdAt: Date.now()
        })
      );

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'initializeUser' }, duration);
      return publicKey;
    } catch (error) {
      console.error('User initialization failed:', error);
      metrics.encryptionErrors.inc({ operation: 'initializeUser' });
      throw error;
    }
  }

  async rotateKeys(): Promise<void> {
    const startTime = Date.now();
    try {
      // Get all user keys
      const keys = await this.redis.keys(`${this.KEY_PREFIX}*`);
      
      for (const key of keys) {
        const userId = key.replace(this.KEY_PREFIX, '');
        await this.initializeUser(userId);
      }

      // Clear shared key cache
      this.sharedKeys.clear();

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'rotateKeys' }, duration);
    } catch (error) {
      console.error('Key rotation failed:', error);
      metrics.encryptionErrors.inc({ operation: 'rotateKeys' });
      throw error;
    }
  }

  private async getSharedKey(senderId: string, recipientId: string): Promise<CryptoKey> {
    const cacheKey = `${senderId}:${recipientId}`;
    
    if (this.sharedKeys.has(cacheKey)) {
      return this.sharedKeys.get(cacheKey)!;
    }

    const startTime = Date.now();
    try {
      // Get sender's private key and recipient's public key
      const senderKeyPair = this.keyPairs.get(senderId);
      if (!senderKeyPair) {
        throw new Error('Sender key pair not found');
      }

      const recipientKeyData = await this.redis.get(`${this.KEY_PREFIX}${recipientId}`);
      if (!recipientKeyData) {
        throw new Error('Recipient public key not found');
      }

      const { publicKey: recipientPublicJwk } = JSON.parse(recipientKeyData);
      const recipientPublicKey = await this.importKey(recipientPublicJwk, 'public');

      // Derive shared key
      const sharedKey = await this.deriveSharedKey(senderKeyPair.privateKey, recipientPublicKey);
      this.sharedKeys.set(cacheKey, sharedKey);

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'getSharedKey' }, duration);
      return sharedKey;
    } catch (error) {
      console.error('Shared key retrieval failed:', error);
      metrics.encryptionErrors.inc({ operation: 'getSharedKey' });
      throw error;
    }
  }

  private async initializeRatchet(
    senderId: string,
    recipientId: string,
    sharedSecret?: CryptoKey,
    associatedData?: Uint8Array
  ): Promise<DoubleRatchetState> {
    const startTime = Date.now();
    try {
      // Generate initial root key from shared secret or derive from existing keys
      let rootKey: CryptoKey;
      if (sharedSecret) {
        // Use shared secret from X3DH
        rootKey = sharedSecret;
      } else {
        // Fallback to deriving from existing keys (legacy path)
        const rootKeyMaterial = await subtle.exportKey(
          'raw',
          await this.getSharedKey(senderId, recipientId)
        );
        rootKey = await subtle.importKey(
          'raw',
          rootKeyMaterial,
          { name: 'HKDF' },
          false,
          ['deriveKey']
        );
      }

      // Generate initial sending and receiving keys
      const [sendingKey, receivingKey] = await Promise.all([
        this.deriveKey(rootKey, 'sending'),
        this.deriveKey(rootKey, 'receiving')
      ]);

      const state: DoubleRatchetState = {
        rootKey,
        sendingKey,
        receivingKey,
        previousSendingKeys: new Map(),
        messageNumber: 0
      };

      if (associatedData) {
        state.associatedData = associatedData;
      }

      // Store state in Redis
      await this.redis.set(
        `${this.RATCHET_PREFIX}${senderId}:${recipientId}`,
        JSON.stringify(await this.exportRatchetState(state))
      );

      this.ratchetStates.set(`${senderId}:${recipientId}`, state);

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'initializeRatchet' }, duration);
      
      return state;
    } catch (error) {
      console.error('Ratchet initialization failed:', error);
      metrics.encryptionErrors.inc({ operation: 'initializeRatchet' });
      throw error;
    }
  }

  private async deriveKey(key: CryptoKey, purpose: string): Promise<CryptoKey> {
    const info = new TextEncoder().encode(purpose);
    const salt = randomBytes(32);

    return subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-384',
        salt,
        info
      },
      key,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  private async turnRatchet(state: DoubleRatchetState): Promise<void> {
    // Store previous sending key
    state.previousSendingKeys.set(state.messageNumber, state.sendingKey);

    // Clean up old keys
    for (const [num, _] of state.previousSendingKeys) {
      if (state.messageNumber - num > this.MAX_SKIP) {
        state.previousSendingKeys.delete(num);
      }
    }

    // Generate new keys
    const [newRootKey, newSendingKey] = await Promise.all([
      this.deriveKey(state.rootKey, 'root'),
      this.deriveKey(state.sendingKey, 'next')
    ]);

    state.rootKey = newRootKey;
    state.sendingKey = newSendingKey;
    state.messageNumber++;
  }

  private async exportRatchetState(state: DoubleRatchetState): Promise<SerializedRatchetState> {
    // Export keys to JWK format
    const [rootJwk, sendingJwk, receivingJwk] = await Promise.all([
      this.exportKey(state.rootKey),
      this.exportKey(state.sendingKey),
      this.exportKey(state.receivingKey)
    ]);

    // Export previous sending keys
    const previousKeys: [number, JsonWebKey][] = [];
    for (const [num, key] of state.previousSendingKeys) {
      previousKeys.push([num, await this.exportKey(key)]);
    }

    const serialized: SerializedRatchetState = {
      rootKey: rootJwk,
      sendingKey: sendingJwk,
      receivingKey: receivingJwk,
      previousSendingKeys: previousKeys,
      messageNumber: state.messageNumber
    };

    if (state.associatedData) {
      serialized.associatedData = Buffer.from(state.associatedData).toString('base64');
    }

    return serialized;
  }

  private async importRatchetState(serialized: SerializedRatchetState): Promise<DoubleRatchetState> {
    const [rootKey, sendingKey, receivingKey] = await Promise.all([
      this.importKey(serialized.rootKey, 'private'),
      this.importKey(serialized.sendingKey, 'private'),
      this.importKey(serialized.receivingKey, 'private')
    ]);

    const previousKeys = new Map();
    for (const [num, key] of serialized.previousSendingKeys) {
      previousKeys.set(num, await this.importKey(key, 'private'));
    }

    const state: DoubleRatchetState = {
      rootKey,
      sendingKey,
      receivingKey,
      previousSendingKeys: previousKeys,
      messageNumber: serialized.messageNumber
    };

    if (serialized.associatedData) {
      state.associatedData = Buffer.from(serialized.associatedData, 'base64');
    }

    return state;
  }

  private async performInitialKeyAgreement(
    senderId: string,
    recipientId: string,
    preKeyBundle: PreKeyBundle
  ): Promise<InitialKeyAgreement> {
    const startTime = Date.now();
    try {
      const senderKeys = this.userKeys.get(senderId);
      if (!senderKeys) throw new Error('Sender keys not found');

      // Import recipient's keys
      const [recipientIdentityKey, recipientSignedPreKey] = await Promise.all([
        this.importKey(preKeyBundle.identityKey, 'public'),
        this.importKey(preKeyBundle.signedPreKey, 'public')
      ]);

      // Verify signed pre-key signature
      const isValid = await this.verifySignature(
        recipientIdentityKey,
        preKeyBundle.signedPreKeySignature,
        recipientSignedPreKey
      );

      if (!isValid) {
        throw new Error('Invalid signed pre-key signature');
      }

      // Generate ephemeral key pair
      const ephemeralKeyPair = await this.generateKeyPair();

      // Calculate DH outputs
      const dh1 = await this.deriveSharedKey(senderKeys.identityKey.privateKey, recipientSignedPreKey);
      const dh2 = await this.deriveSharedKey(ephemeralKeyPair.privateKey, recipientIdentityKey);
      const dh3 = await this.deriveSharedKey(ephemeralKeyPair.privateKey, recipientSignedPreKey);

      let dh4: CryptoKey | null = null;
      if (preKeyBundle.oneTimePreKey) {
        const recipientOneTimePreKey = await this.importKey(preKeyBundle.oneTimePreKey, 'public');
        dh4 = await this.deriveSharedKey(ephemeralKeyPair.privateKey, recipientOneTimePreKey);
      }

      // Combine DH outputs using HKDF
      const ikm = await this.combineKeys([dh1, dh2, dh3, dh4].filter(Boolean) as CryptoKey[]);
      const salt = webcrypto.getRandomValues(new Uint8Array(32));
      const info = new TextEncoder().encode('X3DH');

      const sharedSecret = await subtle.deriveKey(
        {
          name: 'HKDF',
          hash: 'SHA-384',
          salt,
          info
        },
        ikm,
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Associated data includes identity keys and ephemeral key
      const associatedData = await this.constructAssociatedData(
        senderId,
        recipientId,
        await this.exportKey(ephemeralKeyPair.publicKey)
      );

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'initialKeyAgreement' }, duration);

      return { sharedSecret, associatedData };
    } catch (error) {
      console.error('Initial key agreement failed:', error);
      metrics.encryptionErrors.inc({ operation: 'initialKeyAgreement' });
      throw error;
    }
  }

  private async verifySignature(
    publicKey: CryptoKey,
    signature: string,
    data: CryptoKey
  ): Promise<boolean> {
    try {
      const verifyingKey = await subtle.importKey(
        'raw',
        await subtle.exportKey('raw', publicKey),
        { name: 'ECDSA', namedCurve: 'P-384' },
        false,
        ['verify']
      );

      const isValid = await subtle.verify(
        { name: 'ECDSA', hash: 'SHA-384' },
        verifyingKey,
        Buffer.from(signature, 'base64'),
        await subtle.exportKey('raw', data)
      );

      return isValid;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  private async combineKeys(keys: CryptoKey[]): Promise<CryptoKey> {
    // Combine multiple keys using HKDF
    const keyMaterials = await Promise.all(
      keys.map(key => subtle.exportKey('raw', key))
    );

    const combinedMaterial = new Uint8Array(keyMaterials.reduce((acc, cur) => acc + cur.byteLength, 0));
    let offset = 0;
    keyMaterials.forEach(material => {
      combinedMaterial.set(new Uint8Array(material), offset);
      offset += material.byteLength;
    });

    return subtle.importKey(
      'raw',
      combinedMaterial,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );
  }

  private async constructAssociatedData(
    senderId: string,
    recipientId: string,
    ephemeralKey: JsonWebKey
  ): Promise<Uint8Array> {
    const data = {
      sender: senderId,
      recipient: recipientId,
      ephemeralKey,
      timestamp: Date.now()
    };

    return new TextEncoder().encode(JSON.stringify(data));
  }

  async encryptMessage(senderId: string, recipientId: string, message: string): Promise<RatchetMessage> {
    const startTime = Date.now();
    try {
      let state = this.ratchetStates.get(`${senderId}:${recipientId}`);
      
      if (!state) {
        // Perform initial key agreement if no ratchet state exists
        const preKeyBundle = await this.getPreKeyBundle(recipientId);
        const { sharedSecret, associatedData } = await this.performInitialKeyAgreement(
          senderId,
          recipientId,
          preKeyBundle
        );

        // Initialize ratchet with the shared secret
        state = await this.initializeRatchet(senderId, recipientId, sharedSecret, associatedData);
      }

      // Turn the ratchet
      await this.turnRatchet(state);

      // Encrypt message
      const iv = webcrypto.getRandomValues(new Uint8Array(12));
      const encodedMessage = new TextEncoder().encode(message);
      const encryptedData = await subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        state.sendingKey,
        encodedMessage
      );

      // Update state in Redis
      await this.redis.set(
        `${this.RATCHET_PREFIX}${senderId}:${recipientId}`,
        JSON.stringify(await this.exportRatchetState(state))
      );

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'encrypt' }, duration);

      return {
        iv: Buffer.from(iv).toString('base64'),
        encryptedData: Buffer.from(encryptedData).toString('base64'),
        signature: '', // Signature handled by ratchet
        messageNumber: state.messageNumber,
        previousMessageNumber: state.messageNumber - 1
      };
    } catch (error) {
      console.error('Message encryption failed:', error);
      metrics.encryptionErrors.inc({ operation: 'encrypt' });
      throw error;
    }
  }

  async decryptMessage(recipientId: string, senderId: string, encrypted: EncryptedMessage): Promise<string> {
    const startTime = Date.now();
    try {
      const sharedKey = await this.getSharedKey(recipientId, senderId);

      // Decrypt
      const iv = Buffer.from(encrypted.iv, 'base64');
      const encryptedData = Buffer.from(encrypted.encryptedData, 'base64');
      const signature = Buffer.from(encrypted.signature, 'base64');

      const decrypted = await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        sharedKey,
        encryptedData
      );

      // Verify signature
      const messageKey = await subtle.importKey(
        'raw',
        decrypted,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );
      const isValid = await subtle.verify(
        'HMAC',
        messageKey,
        signature,
        decrypted
      );

      if (!isValid) {
        throw new Error('Message signature verification failed');
      }

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'decrypt' }, duration);

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Message decryption failed:', error);
      metrics.encryptionErrors.inc({ operation: 'decrypt' });
      throw error;
    }
  }

  async verifyKeyHealth(): Promise<boolean> {
    const startTime = Date.now();
    try {
      // Test encryption/decryption
      const testMessage = `test-${Date.now()}`;
      const alice = uuidv4();
      const bob = uuidv4();

      await this.initializeUser(alice);
      await this.initializeUser(bob);

      const encrypted = await this.encryptMessage(alice, bob, testMessage);
      const decrypted = await this.decryptMessage(bob, alice, encrypted);

      const isHealthy = decrypted === testMessage;
      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'healthCheck' }, duration);
      
      if (!isHealthy) {
        metrics.encryptionErrors.inc({ operation: 'healthCheck' });
      }

      return isHealthy;
    } catch (error) {
      console.error('Key health verification failed:', error);
      metrics.encryptionErrors.inc({ operation: 'healthCheck' });
      return false;
    }
  }

  async cleanup(): Promise<void> {
    await this.redis.quit();
  }

  private async maintainPreKeys(): Promise<void> {
    const startTime = Date.now();
    try {
      for (const [userId, keys] of this.userKeys.entries()) {
        const currentCount = keys.oneTimePreKeys.size;
        if (currentCount < this.MIN_ONE_TIME_KEYS) {
          const neededCount = this.MIN_ONE_TIME_KEYS - currentCount;
          await this.generateOneTimePreKeys(userId, neededCount);
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'maintainPreKeys' }, duration);
    } catch (error) {
      console.error('Pre-key maintenance failed:', error);
      metrics.encryptionErrors.inc({ operation: 'maintainPreKeys' });
    }
  }

  async getPreKeyBundle(userId: string): Promise<PreKeyBundle> {
    const startTime = Date.now();
    try {
      const userKeys = this.userKeys.get(userId);
      if (!userKeys) throw new Error('User keys not found');

      const [identityKey, signedPreKey] = await Promise.all([
        this.exportKey(userKeys.identityKey.publicKey),
        this.exportKey(userKeys.signedPreKey.publicKey)
      ]);

      // Get a random one-time pre-key if available
      let oneTimePreKey: JsonWebKey | undefined;
      let oneTimePreKeyId: number | undefined;

      if (userKeys.oneTimePreKeys.size > 0) {
        const keyId = Array.from(userKeys.oneTimePreKeys.keys())[
          Math.floor(Math.random() * userKeys.oneTimePreKeys.size)
        ];
        const keyPair = userKeys.oneTimePreKeys.get(keyId)!;
        oneTimePreKey = await this.exportKey(keyPair.publicKey);
        oneTimePreKeyId = keyId;

        // Remove used one-time pre-key
        userKeys.oneTimePreKeys.delete(keyId);
        await this.redis.hdel(`${this.PRE_KEY_PREFIX}${userId}`, keyId.toString());
      }

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'getPreKeyBundle' }, duration);

      return {
        identityKey,
        signedPreKey,
        signedPreKeySignature: '', // TODO: Add actual signature
        oneTimePreKey,
        oneTimePreKeyId
      };
    } catch (error) {
      console.error('Pre-key bundle retrieval failed:', error);
      metrics.encryptionErrors.inc({ operation: 'getPreKeyBundle' });
      throw error;
    }
  }

  async createGroupSession(groupId: string, members: string[]): Promise<void> {
    const startTime = Date.now();
    try {
      // Generate sender key for the group
      const senderKey = await subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Generate initial chain key
      const chainKey = await subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      const session: GroupSession = {
        senderKey,
        chainKey,
        messageNumber: 0,
        groupId,
        members
      };

      // Store session
      this.groupSessions.set(groupId, session);
      await this.storeGroupSession(session);

      // Distribute sender key to all members
      await Promise.all(
        members.map(async (memberId) => {
          const encryptedSenderKey = await this.encryptMessage(
            groupId,
            memberId,
            JSON.stringify({
              senderKey: await this.exportKey(senderKey),
              chainKey: await this.exportKey(chainKey),
              groupId,
              members
            })
          );

          await this.redis.rpush(
            `${this.GROUP_KEY_PREFIX}${groupId}:${memberId}`,
            JSON.stringify(encryptedSenderKey)
          );
        })
      );

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'createGroupSession' }, duration);
    } catch (error) {
      console.error('Group session creation failed:', error);
      metrics.encryptionErrors.inc({ operation: 'createGroupSession' });
      throw error;
    }
  }

  private async storeGroupSession(session: GroupSession): Promise<void> {
    const serialized: SerializedGroupSession = {
      senderKey: await this.exportKey(session.senderKey),
      chainKey: await this.exportKey(session.chainKey),
      messageNumber: session.messageNumber,
      groupId: session.groupId,
      members: session.members
    };

    await this.redis.set(
      `${this.GROUP_KEY_PREFIX}${session.groupId}`,
      JSON.stringify(serialized)
    );
  }

  private async loadGroupSession(groupId: string): Promise<GroupSession | undefined> {
    const data = await this.redis.get(`${this.GROUP_KEY_PREFIX}${groupId}`);
    if (!data) return undefined;

    const serialized: SerializedGroupSession = JSON.parse(data);
    return {
      senderKey: await this.importKey(serialized.senderKey, 'private'),
      chainKey: await this.importKey(serialized.chainKey, 'private'),
      messageNumber: serialized.messageNumber,
      groupId: serialized.groupId,
      members: serialized.members
    };
  }

  private async deriveNextChainKey(session: GroupSession): Promise<CryptoKey> {
    const info = new TextEncoder().encode(`${session.groupId}:${session.messageNumber + 1}`);
    return this.deriveKey(session.chainKey, info.toString());
  }

  async encryptGroupMessage(groupId: string, senderId: string, message: string): Promise<GroupMessage> {
    const startTime = Date.now();
    try {
      let session = this.groupSessions.get(groupId);
      if (!session) {
        session = await this.loadGroupSession(groupId);
        if (!session) {
          throw new Error('Group session not found');
        }
        this.groupSessions.set(groupId, session);
      }

      // Derive next chain key
      const nextChainKey = await this.deriveNextChainKey(session);

      // Encrypt message
      const iv = webcrypto.getRandomValues(new Uint8Array(12));
      const encodedMessage = new TextEncoder().encode(message);
      const encryptedData = await subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        session.senderKey,
        encodedMessage
      );

      // Update session state
      session.chainKey = nextChainKey;
      session.messageNumber++;
      await this.storeGroupSession(session);

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'encryptGroupMessage' }, duration);

      return {
        iv: Buffer.from(iv).toString('base64'),
        encryptedData: Buffer.from(encryptedData).toString('base64'),
        signature: '', // Group messages use sender key for authenticity
        groupId,
        senderId,
        messageNumber: session.messageNumber
      };
    } catch (error) {
      console.error('Group message encryption failed:', error);
      metrics.encryptionErrors.inc({ operation: 'encryptGroupMessage' });
      throw error;
    }
  }

  async decryptGroupMessage(message: GroupMessage): Promise<string> {
    const startTime = Date.now();
    try {
      let session = this.groupSessions.get(message.groupId);
      if (!session) {
        session = await this.loadGroupSession(message.groupId);
        if (!session) {
          throw new Error('Group session not found');
        }
        this.groupSessions.set(message.groupId, session);
      }

      // Verify message is from group member
      if (!session.members.includes(message.senderId)) {
        throw new Error('Sender is not a group member');
      }

      // Handle out-of-order messages
      if (message.messageNumber > session.messageNumber + this.MAX_GROUP_MESSAGE_SKIP) {
        throw new Error('Message too far ahead in the chain');
      }

      // Decrypt message
      const iv = Buffer.from(message.iv, 'base64');
      const encryptedData = Buffer.from(message.encryptedData, 'base64');

      const decrypted = await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        session.senderKey,
        encryptedData
      );

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'decryptGroupMessage' }, duration);

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Group message decryption failed:', error);
      metrics.encryptionErrors.inc({ operation: 'decryptGroupMessage' });
      throw error;
    }
  }

  async addGroupMember(groupId: string, newMemberId: string): Promise<void> {
    const startTime = Date.now();
    try {
      const session = await this.loadGroupSession(groupId);
      if (!session) {
        throw new Error('Group session not found');
      }

      // Add member to session
      if (!session.members.includes(newMemberId)) {
        session.members.push(newMemberId);
        await this.storeGroupSession(session);

        // Send sender key to new member
        const encryptedSenderKey = await this.encryptMessage(
          groupId,
          newMemberId,
          JSON.stringify({
            senderKey: await this.exportKey(session.senderKey),
            chainKey: await this.exportKey(session.chainKey),
            groupId,
            members: session.members
          })
        );

        await this.redis.rpush(
          `${this.GROUP_KEY_PREFIX}${groupId}:${newMemberId}`,
          JSON.stringify(encryptedSenderKey)
        );
      }

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'addGroupMember' }, duration);
    } catch (error) {
      console.error('Adding group member failed:', error);
      metrics.encryptionErrors.inc({ operation: 'addGroupMember' });
      throw error;
    }
  }

  async removeGroupMember(groupId: string, memberId: string): Promise<void> {
    const startTime = Date.now();
    try {
      const session = await this.loadGroupSession(groupId);
      if (!session) {
        throw new Error('Group session not found');
      }

      // Remove member from session
      const index = session.members.indexOf(memberId);
      if (index !== -1) {
        session.members.splice(index, 1);
        
        // Generate new sender key and chain key
        const [newSenderKey, newChainKey] = await Promise.all([
          subtle.generateKey(
            {
              name: 'AES-GCM',
              length: 256
            },
            true,
            ['encrypt', 'decrypt']
          ),
          subtle.generateKey(
            {
              name: 'AES-GCM',
              length: 256
            },
            true,
            ['encrypt', 'decrypt']
          )
        ]);

        session.senderKey = newSenderKey;
        session.chainKey = newChainKey;
        session.messageNumber = 0;

        await this.storeGroupSession(session);

        // Distribute new keys to remaining members
        await Promise.all(
          session.members.map(async (remainingMemberId) => {
            const encryptedSenderKey = await this.encryptMessage(
              groupId,
              remainingMemberId,
              JSON.stringify({
                senderKey: await this.exportKey(newSenderKey),
                chainKey: await this.exportKey(newChainKey),
                groupId,
                members: session.members
              })
            );

            await this.redis.rpush(
              `${this.GROUP_KEY_PREFIX}${groupId}:${remainingMemberId}`,
              JSON.stringify(encryptedSenderKey)
            );
          })
        );

        // Remove old keys for the removed member
        await this.redis.del(`${this.GROUP_KEY_PREFIX}${groupId}:${memberId}`);
      }

      const duration = (Date.now() - startTime) / 1000;
      metrics.encryptionOperations.observe({ operation: 'removeGroupMember' }, duration);
    } catch (error) {
      console.error('Removing group member failed:', error);
      metrics.encryptionErrors.inc({ operation: 'removeGroupMember' });
      throw error;
    }
  }
}

export const e2ee = new E2EEncryption(); 