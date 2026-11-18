import { useCallback, useEffect, useState } from 'react';

interface LocalStorageOptions {
  persist?: boolean;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options: LocalStorageOptions = {}
) {
  const persist = options.persist !== false;
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!persist) {
      try {
        const item = window.localStorage.getItem(key);
        if (item !== null) return JSON.parse(item) as T;
      } catch {
        // Fallback to initial value
      }
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item) as T;
      }
    } catch {
      // Fallback to initial value
    }
    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        try {
          if (persist) window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Storage quota exceeded or unavailable
        }
        return next;
      });
    },
    [key, persist]
  );

  useEffect(() => {
    if (!persist) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch {
          // Ignore malformed external updates
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, persist]);

  return [storedValue, setValue] as const;
}
