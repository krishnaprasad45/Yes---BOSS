import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

// Refetch when connectivity returns (airplane mode off, wifi back).
onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => setOnline(!!state.isConnected)),
);

// Refetch stale queries when the app returns to foreground.
AppState.addEventListener('change', status => {
  focusManager.setFocused(status === 'active');
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000,
      retry: 2,
    },
  },
});
