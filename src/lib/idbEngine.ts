/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class IDBEngine {
  private dbName = 'FEETRACK_IDB_DATABASE';
  private storeName = 'FEETRACK_STATE_STORE';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;
  private writeQueue: Promise<any> = Promise.resolve();

  public init(): Promise<IDBDatabase> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.init();
  }

  public async getItem<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result !== undefined ? (request.result as T) : null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      console.error(`idbEngine: Failed to get item for key "${key}":`, e);
      return null;
    }
  }

  /**
   * Serialized setItem execution to eliminate Lost At Write (LAW) concurrency issues.
   */
  public async setItem<T>(key: string, value: T): Promise<void> {
    this.writeQueue = this.writeQueue.then(() => this.internalSetItem(key, value)).catch(err => {
      console.error(`idbEngine: Write error in queue for key "${key}":`, err);
    });
    return this.writeQueue;
  }

  private async internalSetItem<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      console.error(`idbEngine: Failed to set item for key "${key}":`, e);
    }
  }

  public async removeItem(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      console.error(`idbEngine: Failed to remove item for key "${key}":`, e);
    }
  }

  public async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      console.error('idbEngine: Failed to clear database:', e);
    }
  }

  /**
   * Seamless one-time migration from legacy synchronous localStorage
   */
  public async migrateFromLocalStorage(): Promise<void> {
    try {
      const isMigrated = await this.getItem<boolean>('s_idb_migration_done');
      if (isMigrated) {
        return;
      }

      console.log('idbEngine: Migrating legacy data from localStorage to high-performance IndexedDB...');
      const keys = [
        's_users',
        's_students',
        's_payments',
        's_terms',
        's_current_user',
        's_expenses',
        's_salaries',
        's_budget_targets',
        's_teacher_evaluations',
        's_exams_payments',
        's_exams_expenses',
        's_exams_settings',
        's_promotion_backups',
        's_backups',
        's_storage_preference',
        's_pending_local_edits',
        's_background_sync_enabled',
        's_system_settings'
      ];

      for (const key of keys) {
        const localVal = localStorage.getItem(key);
        if (localVal !== null) {
          try {
            const parsed = JSON.parse(localVal);
            await this.setItem(key, parsed);
          } catch {
            await this.setItem(key, localVal);
          }
        }
      }

      await this.setItem('s_idb_migration_done', true);
      console.log('idbEngine: Seamless local migration finalized successfully.');
    } catch (e) {
      console.error('idbEngine: Error performing local storage migration:', e);
    }
  }
}

export const idbEngine = new IDBEngine();
