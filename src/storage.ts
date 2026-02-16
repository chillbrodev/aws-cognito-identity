/**
 * Abstract storage for Cognito session/device data.
 * Implement for persistent storage (e.g. localStorage, AsyncStorage).
 */
export interface CognitoStorage {
  setItem(key: string, value: unknown): Promise<unknown>;
  getItem(key: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
  clear(): Promise<void>;
}

const dataMemory: Record<string, unknown> = {};

/** In-memory implementation of {@link CognitoStorage}; data is lost when the process exits. */
export class CognitoMemoryStorage implements CognitoStorage {
  async setItem(key: string, value: unknown): Promise<unknown> {
    dataMemory[key] = value;
    return dataMemory[key];
  }

  async getItem(key: string): Promise<unknown> {
    return dataMemory[key];
  }

  async removeItem(key: string): Promise<unknown> {
    const v = dataMemory[key];
    delete dataMemory[key];
    return v;
  }

  async clear(): Promise<void> {
    for (const key of Object.keys(dataMemory)) delete dataMemory[key];
  }
}

/** Wrapper that exposes a {@link CognitoStorage} instance (e.g. for pool or user). */
export class CognitoStorageHelper<S extends CognitoStorage> {
  constructor(public storage: S) {}
  getStorage(): S {
    return this.storage;
  }
}
