import { MMKV } from 'react-native-mmkv';
import type { Storage } from 'redux-persist';

/**
 * MMKV-backed implementation of redux-persist's async Storage interface.
 * MMKV is synchronous + memory-mapped (way faster than AsyncStorage), so the
 * persisted offline snapshot rehydrates in a few ms on cold start.
 */
const mmkv = new MMKV({ id: 'yes-boss-store' });

export const mmkvStorage: Storage = {
  setItem: (key, value) => {
    mmkv.set(key, value);
    return Promise.resolve(true);
  },
  getItem: key => {
    const value = mmkv.getString(key);
    return Promise.resolve(value ?? null);
  },
  removeItem: key => {
    mmkv.delete(key);
    return Promise.resolve();
  },
};
