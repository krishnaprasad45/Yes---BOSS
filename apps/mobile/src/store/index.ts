import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist';
import { mmkvStorage } from './mmkvStorage';
import calls from './slices/callsSlice';
import smsTxns from './slices/smsTxnsSlice';
import stats from './slices/statsSlice';
import settings from './slices/settingsSlice';
import pendingOps from './slices/pendingOpsSlice';
import network from './slices/networkSlice';

const rootReducer = combineReducers({
  calls,
  smsTxns,
  stats,
  settings,
  pendingOps,
  network,
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage: mmkvStorage,
  // network is live-only; everything else survives a cold start so the app
  // paints fully without internet.
  whitelist: ['calls', 'smsTxns', 'stats', 'settings', 'pendingOps'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist dispatches these with non-serializable internals.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
