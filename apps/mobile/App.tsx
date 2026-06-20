import React from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { queryClient } from '@/services/queryClient';
import { store, persistor } from '@/store';
import { AuthProvider } from '@/hooks/useAuth';
import { NetworkProvider } from '@/components/feature/NetworkProvider';
import { RootNavigator } from '@/navigation/RootNavigator';

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <StatusBar barStyle="dark-content" />
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NetworkProvider>
                <RootNavigator />
              </NetworkProvider>
            </AuthProvider>
          </QueryClientProvider>
          <Toast />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
