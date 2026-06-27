import React from 'react';
import { View } from 'react-native';

/**
 * Debug orb - simple red circle to test if anything renders.
 */
export function AnimatedOrb({
  size = 220,
}: {
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
}) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: '#FF0000',
        }}
      />
    </View>
  );
}
