import { Injectable } from '@angular/core';

export type StorageArea = 'local' | 'session';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly fallbackStorage = new Map<StorageArea, Map<string, string>>([
    ['local', new Map<string, string>()],
    ['session', new Map<string, string>()],
  ]);

  getString(key: string, area: StorageArea = 'local'): string | null {
    const storage = this.getStorage(area);
    if (!storage) {
      return this.fallbackStorage.get(area)?.get(key) ?? null;
    }

    return storage.getItem(key);
  }

  setString(key: string, value: string, area: StorageArea = 'local'): void {
    const storage = this.getStorage(area);
    if (!storage) {
      this.fallbackStorage.get(area)?.set(key, value);
      return;
    }

    storage.setItem(key, value);
  }

  remove(key: string, area: StorageArea = 'local'): void {
    const storage = this.getStorage(area);
    if (!storage) {
      this.fallbackStorage.get(area)?.delete(key);
      return;
    }

    storage.removeItem(key);
  }

  getJson<T>(key: string, fallback: T, area: StorageArea = 'local'): T {
    const storedValue = this.getString(key, area);
    if (!storedValue) {
      return fallback;
    }

    try {
      return JSON.parse(storedValue) as T;
    } catch {
      return fallback;
    }
  }

  setJson<T>(key: string, value: T, area: StorageArea = 'local'): void {
    this.setString(key, JSON.stringify(value), area);
  }

  private getStorage(area: StorageArea): Storage | null {
    try {
      return area === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    } catch {
      return null;
    }
  }
}
