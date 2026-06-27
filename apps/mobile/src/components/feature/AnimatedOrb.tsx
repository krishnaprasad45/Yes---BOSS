import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';

/**
 * Glowing animated orb with flowing lines (purple → cyan).
 * Used during voice listening/speaking states.
 */
export function AnimatedOrb({
  size = 220,
  primaryColor = '#2DD4BF',
  secondaryColor = '#9DB2FF',
}: {
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
}) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue: 360,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [rotation]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const radius = size / 2;

  return (
    <Animated.View
      style={[
        { width: size, height: size, justifyContent: 'center', alignItems: 'center' },
        { transform: [{ rotate: rotateInterpolate }] },
      ]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.4" />
            <Stop offset="70%" stopColor={secondaryColor} stopOpacity="0.15" />
            <Stop offset="100%" stopColor={secondaryColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Outer glow circle */}
        <Circle cx={radius} cy={radius} r={radius * 0.95} fill="url(#orbGlow)" />

        {/* Flowing lines (organic wave paths) */}
        <Path
          d={`M ${radius} ${radius * 0.2} Q ${radius * 0.3} ${radius * 0.4}, ${radius * 0.2} ${radius * 0.7} T ${radius * 0.4} ${radius * 1.4}`}
          stroke={primaryColor}
          strokeWidth="2.5"
          fill="none"
          opacity="0.7"
        />
        <Path
          d={`M ${radius * 1.8} ${radius * 0.2} Q ${radius * 1.7} ${radius * 0.5}, ${radius * 1.8} ${radius * 0.8} T ${radius * 1.6} ${radius * 1.4}`}
          stroke={secondaryColor}
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
        />
        <Path
          d={`M ${radius * 0.5} ${radius * 0.1} Q ${radius * 1.2} ${radius * 0.3}, ${radius * 1.5} ${radius * 0.5} T ${radius * 1.7} ${radius * 1.3}`}
          stroke={primaryColor}
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />
        <Path
          d={`M ${radius * 1.5} ${radius * 0.1} Q ${radius * 0.8} ${radius * 0.4}, ${radius * 0.5} ${radius * 0.8} T ${radius * 0.3} ${radius * 1.4}`}
          stroke={secondaryColor}
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />

        {/* Center bright core */}
        <Circle cx={radius} cy={radius} r={radius * 0.15} fill={primaryColor} opacity="0.8" />
        <Circle cx={radius} cy={radius} r={radius * 0.08} fill="white" opacity="0.6" />
      </Svg>
    </Animated.View>
  );
}
