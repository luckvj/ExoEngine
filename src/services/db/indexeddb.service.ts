// IndexedDB Service for ExoEngine
// Handles caching of manifest data, auth tokens, and saved builds
import type { SavedBuild } from '../../types';
import { tokenEncryption } from '../crypto/token-encryption.service';
import { infoLog, warnLog, errorLog, debugLog } from '../../utils/logger';

const DB_NAME = 'exoengine';
const DB_VERSION = 3;

interface StoreConfig {
  name: string;
  keyPath: string;
  indexes?: Array<{ name: string; keyPath: string; options?: IDBIndexParameters }>;
}

const STORES: StoreConfig[] = [
  {
    name: 'manifest',
    keyPath: 'tableName',
  },
  {
    name: 'manifestMeta',
    keyPath: 'key',
  },
  {
    name: 'auth',
    keyPath: 'key',
  },
  {
    name: 'savedBuilds',
    keyPath: 'id',
    indexes: [
      { name: 'by-class', keyPath: 'template.guardianClass' },
      { name: 'by-element', keyPath: 'template.element' },
      { name: 'by-created', keyPath: 'createdAt' },
    ],
  },
  {
    name: 'settings',
    keyPath: 'key',
  },
  {
    name: 'cache',
    keyPath: 'key',
  },
  {
    name: 'clarity_descriptions',
    keyPath: 'key',
  },
  {
    name: 'clarity_version',
    keyPath: 'key',
  },
];

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        errorLog('IndexedDB', 'Failed to open database:', request.error);
        reject(request.error);
      };

      request.onblocked = () => {
        warnLog('IndexedDB', 'Database upgrade blocked! Close other tabs to permit upgrade.');
        // We resolve anyway so the app doesn't hang, but the stores might be missing
        // Alternatively, we could keep it pending, but that's risky for UX.
      };

      request.onsuccess = () => {
        this.db = request.result;
        const storeNames = Array.from(this.db.objectStoreNames);
        debugLog('IndexedDB', `Database v${this.db.version} opened successfully. Stores:`, storeNames);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion;
        infoLog('IndexedDB', `Upgrading database from v${oldVersion} to v${newVersion}`);

        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath,
            });

            if (store.indexes) {
              for (const index of store.indexes) {
                objectStore.createIndex(index.name, index.keyPath, index.options);
              }
            }
          }
        }
      };
    });

    return this.initPromise;
  }

  private async getDB(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  // Generic CRUD operations
  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async set<T>(storeName: string, value: T): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.put(value);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllByIndex<T>(
    storeName: string,
    indexName: string,
    value: IDBValidKey
  ): Promise<T[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Manifest-specific operations
  async getManifestTable<T>(tableName: string): Promise<Record<string, T> | undefined> {
    const result = await this.get<{ tableName: string; data: Record<string, T> }>(
      'manifest',
      tableName
    );
    return result?.data;
  }

  async setManifestTable<T>(tableName: string, data: Record<string, T>): Promise<void> {
    await this.set('manifest', { tableName, data });
  }

  async getManifestVersion(): Promise<string | undefined> {
    const result = await this.get<{ key: string; version: string }>(
      'manifestMeta',
      'version'
    );
    return result?.version;
  }

  async setManifestVersion(version: string): Promise<void> {
    await this.set('manifestMeta', { key: 'version', version, updatedAt: Date.now() });
  }

  async clearManifest(): Promise<void> {
    await this.clear('manifest');
    await this.clear('manifestMeta');
  }

  // Auth-specific operations with encryption
  async getAuthTokens(): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    membershipId: string;
  } | undefined> {
    const result = await this.get<any>('auth', 'tokens');

    if (!result) return undefined;

    // Token format validation (no logging for security)

    // Check if tokens are in old plaintext format (backward compatibility)
    if (result.accessToken && result.refreshToken) {
      infoLog('IndexedDB', '🔐 Migrating plaintext tokens to encrypted format');

      try {
        // Migrate to encrypted format
        await this.setAuthTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
          membershipId: result.membershipId,
        });

        // Return the plaintext tokens for this session
        return {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
          membershipId: result.membershipId,
        };
      } catch (error) {
        errorLog('IndexedDB', 'Failed to migrate tokens:', error);
        // Clear corrupted tokens
        await this.clearAuth();
        return undefined;
      }
    }

    // Handle encrypted format (new format)
    if (result.encryptedAccessToken && result.encryptedRefreshToken) {
      try {
        // Decrypt tokens using AES-GCM
        const accessTokenData = JSON.parse(result.encryptedAccessToken);
        const refreshTokenData = JSON.parse(result.encryptedRefreshToken);

        const accessToken = await tokenEncryption.decrypt(accessTokenData);
        const refreshToken = await tokenEncryption.decrypt(refreshTokenData);

        return {
          accessToken,
          refreshToken,
          expiresAt: result.expiresAt,
          membershipId: result.membershipId,
        };
      } catch (error) {
        errorLog('IndexedDB', 'Failed to decrypt tokens:', error);
        // Clear corrupted tokens
        await this.clearAuth();
        return undefined;
      }
    }

    // Unknown format - clear and return undefined
    warnLog('IndexedDB', '⚠️ Unknown token format, clearing auth');
    await this.clearAuth();
    return undefined;
  }

  async setAuthTokens(tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    membershipId: string;
  }): Promise<void> {
    try {
      // Encrypt tokens using AES-GCM
      const encryptedAccessToken = await tokenEncryption.encrypt(tokens.accessToken);
      const encryptedRefreshToken = await tokenEncryption.encrypt(tokens.refreshToken);

      await this.set('auth', {
        key: 'tokens',
        encryptedAccessToken: JSON.stringify(encryptedAccessToken),
        encryptedRefreshToken: JSON.stringify(encryptedRefreshToken),
        expiresAt: tokens.expiresAt,
        membershipId: tokens.membershipId,
      });
    } catch (error) {
      errorLog('IndexedDB', 'Failed to encrypt tokens:', error);
      throw new Error('Failed to store authentication tokens securely');
    }
  }

  async clearAuth(): Promise<void> {
    await this.clear('auth');
    // Clear encryption key from memory
    tokenEncryption.clearKey();
  }

  async saveOAuthState(state: string): Promise<void> {
    await this.set('auth', { key: 'oauth_state', value: state, createdAt: Date.now() });
  }

  async getOAuthState(): Promise<string | undefined> {
    const result = await this.get<{ key: string; value: string }>('auth', 'oauth_state');
    return result?.value;
  }

  // Saved Builds operations
  async getSavedBuilds(): Promise<SavedBuild[]> {
    return this.getAll<SavedBuild>('savedBuilds');
  }

  async setSavedBuild(build: SavedBuild): Promise<void> {
    await this.set('savedBuilds', build);
  }

  async deleteSavedBuild(id: string): Promise<void> {
    await this.delete('savedBuilds', id);
  }

  // Clarity Community Descriptions operations
  async getClarityVersion(): Promise<number | undefined> {
    const result = await this.get<{ key: string; value: number }>('clarity_version', 'current');
    return result?.value;
  }

  async setClarityVersion(version: number): Promise<void> {
    await this.set('clarity_version', { key: 'current', value: version });
  }

  async getClarityDescriptions(): Promise<any | undefined> {
    const result = await this.get<{ key: string; data: any }>('clarity_descriptions', 'all');
    return result?.data;
  }

  async setClarityDescriptions(data: any): Promise<void> {
    await this.set('clarity_descriptions', { key: 'all', data });
  }

  /**
   * Generic get method
   */

  // Settings operations
  async getSetting<T>(key: string): Promise<T | undefined> {
    const result = await this.get<{ key: string; value: T }>('settings', key);
    return result?.value;
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    await this.set('settings', { key, value });
  }

  // Cache operations with TTL
  async getCached<T>(key: string): Promise<T | undefined> {
    const result = await this.get<{
      key: string;
      value: T;
      expiresAt: number;
    }>('cache', key);

    if (!result) return undefined;
    if (result.expiresAt < Date.now()) {
      await this.delete('cache', key);
      return undefined;
    }

    return result.value;
  }

  async setCached<T>(key: string, value: T, ttlMs: number): Promise<void> {
    await this.set('cache', {
      key,
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  // Database size estimation
  async estimateSize(): Promise<{ usage: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { usage: 0, quota: 0 };
  }

  // Clear profile cache
  async clearProfileCache(): Promise<void> {
    await this.clear('cache');
  }

  // Full database clear
  async clearAll(): Promise<void> {
    const db = await this.getDB();
    const storeNames = Array.from(db.objectStoreNames);

    for (const storeName of storeNames) {
      await this.clear(storeName);
    }
  }

  // Close database connection (prevent corruption on PWA freeze)
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * Destructive: Deletes the entire IndexedDB database.
   * Useful for "Hard Reset" scenarios.
   */
  async deleteDatabase(): Promise<void> {
    await this.close();
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        infoLog('IndexedDB', 'Database deleted successfully');
        resolve();
      };
    });
  }
}

// Export singleton instance
export const db = new IndexedDBService();

// Listen for PWA/Mobile freeze events (DIM parity)
if (typeof window !== 'undefined') {
  window.addEventListener('freeze', () => {
    db.close().catch(err => errorLog('IndexedDB', 'Failed to close database:', err));
  });
}
