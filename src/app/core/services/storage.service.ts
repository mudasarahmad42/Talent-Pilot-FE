import { Injectable } from '@angular/core';

type StorageArea = 'local' | 'session';

@Injectable({ providedIn: 'root' })
export class StorageService {
  getString(key: string, area: StorageArea = 'local'): string | null {
    return this.getStorage(area)?.getItem(key) ?? null;
  }

  setString(key: string, value: string, area: StorageArea = 'local'): void {
    this.getStorage(area)?.setItem(key, value);
  }

  remove(key: string, area: StorageArea = 'local'): void {
    this.getStorage(area)?.removeItem(key);
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
