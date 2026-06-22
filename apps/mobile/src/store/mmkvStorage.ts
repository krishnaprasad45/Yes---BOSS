import type { Storage } from 'redux-persist';

// Debug builds: plain in-memory Map — no MMKV, no native module needed.
// Data resets on reload but the app works fine for development.
// Release builds: MMKV (synchronous, memory-mapped, fast rehydration).
function makeMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    setItem: (key, value) => { map.set(key, value); return Promise.resolve(true); },
    getItem: key => Promise.resolve(map.get(key) ?? null),
    removeItem: key => { map.delete(key); return Promise.resolve(); },
  };
}

function makeMMKVStorage(): Storage {
  // Imported inline so the module is never evaluated in debug bundles.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
  const mmkv = new MMKV({ id: 'yes-boss-store' });
  return {
    setItem: (key, value) => { mmkv.set(key, value); return Promise.resolve(true); },
    getItem: key => Promise.resolve(mmkv.getString(key) ?? null),
    removeItem: key => { mmkv.delete(key); return Promise.resolve(); },
  };
}

export const mmkvStorage: Storage = __DEV__ ? makeMemoryStorage() : makeMMKVStorage();
