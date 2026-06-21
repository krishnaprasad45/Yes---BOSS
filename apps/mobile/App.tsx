import React from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { queryClient } from '@/services/queryClient';
import { store, persistor } from '@/store';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { AuthProvider } from '@/hooks/useAuth';
import { NetworkProvider } from '@/components/feature/NetworkProvider';
import { RootNavigator } from '@/navigation/RootNavigator';

function ThemedRoot(): React.JSX.Element {
  const { mode, colors } = useTheme();
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NetworkProvider>
            <RootNavigator />
          </NetworkProvider>
        </AuthProvider>
      </QueryClientProvider>
      <Toast />
    </SafeAreaProvider>
  );
}

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider>
          <ThemedRoot />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
