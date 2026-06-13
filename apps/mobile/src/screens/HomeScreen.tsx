import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { checkSecureHealth } from '@/services/api/auth.api';
import { useAuth } from '@/hooks/useAuth';

/** Placeholder dashboard — proves the authed pipeline end to end (Phase 0). */
export function HomeScreen() {
  const { logout } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['health', 'secure'],
    queryFn: checkSecureHealth,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      {isLoading && <Text style={styles.muted}>Checking backend…</Text>}
      {error && <Text style={styles.error}>{error.message}</Text>}
      {data && (
        <Text style={styles.ok}>
          Backend connected — API ✓ DB {data.data.db ? '✓' : '✗'}
        </Text>
      )}

      <TouchableOpacity style={styles.button} onPress={() => refetch()}>
        <Text style={styles.buttonText}>Re-check</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={logout}>
        <Text style={styles.buttonText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  muted: { color: '#666' },
  error: { color: '#c00' },
  ok: { color: '#080' },
  button: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  secondary: { backgroundColor: '#666' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
