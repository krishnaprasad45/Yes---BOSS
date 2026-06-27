import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';

/**
 * Mesh animated orb with flowing lines (purple ↔ cyan).
 * Concentric circles + rotating paths for 3D lattice effect.
 */
export function AnimatedOrb({
  size = 220,
  primaryColor = '#A855F7',
  secondaryColor = '#06B6D4',
}: {
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
}) {
  const rotation = useRef(new Animated.Value(0)).current;
  const rotation2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim1 = Animated.loop(
      Animated.timing(rotation, {
        toValue: 360,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const anim2 = Animated.loop(
      Animated.timing(rotation2, {
        toValue: -360,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim1.start();
    anim2.start();
    return () => {
      anim1.stop();
      anim2.stop();
    };
  }, [rotation, rotation2]);

  const rotateInterpolate1 = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });
  const rotateInterpolate2 = rotation2.interpolate({
    inputRange: [-360, 0],
    outputRange: ['-360deg', '0deg'],
  });

  const c = size / 2;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={[
          { width: size, height: size, justifyContent: 'center', alignItems: 'center', position: 'absolute' },
          { transform: [{ rotate: rotateInterpolate1 }] },
        ]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.6" />
              <Stop offset="50%" stopColor={secondaryColor} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={secondaryColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Outer glow */}
          <Circle cx={c} cy={c} r={c * 0.98} fill="url(#orbGlow)" />

          {/* Flowing wave paths - layer 1 */}
          <Path d={`M ${c * 0.3} ${c * 0.2} Q ${c * 0.5} ${c * 0.1} ${c * 1.7} ${c * 0.2}`} stroke={primaryColor} strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
          <Path d={`M ${c * 0.2} ${c * 0.5} Q ${c * 0.4} ${c * 0.4} ${c * 1.8} ${c * 0.5}`} stroke={secondaryColor} strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round" />
          <Path d={`M ${c * 0.25} ${c * 0.8} Q ${c * 0.5} ${c * 0.75} ${c * 1.75} ${c * 0.85}`} stroke={primaryColor} strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round" />
          <Path d={`M ${c * 0.3} ${c * 1.2} Q ${c * 0.6} ${c * 1.15} ${c * 1.7} ${c * 1.2}`} stroke={secondaryColor} strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round" />

          {/* Vertical flowing paths - layer 1 */}
          <Path d={`M ${c * 0.5} ${c * 0.3} Q ${c * 0.45} ${c * 0.6} ${c * 0.5} ${c * 1.7}`} stroke={primaryColor} strokeWidth="1.8" fill="none" opacity="0.5" strokeLinecap="round" />
          <Path d={`M ${c * 1.0} ${c * 0.2} Q ${c * 0.95} ${c * 0.6} ${c * 1.0} ${c * 1.8}`} stroke={secondaryColor} strokeWidth="1.8" fill="none" opacity="0.4" strokeLinecap="round" />
          <Path d={`M ${c * 1.5} ${c * 0.25} Q ${c * 1.45} ${c * 0.65} ${c * 1.5} ${c * 1.75}`} stroke={primaryColor} strokeWidth="1.8" fill="none" opacity="0.4" strokeLinecap="round" />
        </Svg>
      </Animated.View>

      {/* Concentric circles - rotating layer 2 */}
      <Animated.View
        style={[
          { width: size, height: size, justifyContent: 'center', alignItems: 'center', position: 'absolute' },
          { transform: [{ rotate: rotateInterpolate2 }] },
        ]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Concentric circles for depth */}
          <Circle cx={c} cy={c} r={c * 0.3} stroke={secondaryColor} strokeWidth="1.2" fill="none" opacity="0.4" />
          <Circle cx={c} cy={c} r={c * 0.5} stroke={primaryColor} strokeWidth="1.2" fill="none" opacity="0.3" />
          <Circle cx={c} cy={c} r={c * 0.7} stroke={secondaryColor} strokeWidth="1.2" fill="none" opacity="0.25" />

          {/* Counter-rotating flowing paths */}
          <Path d={`M ${c * 0.4} ${c * 0.15} Q ${c * 0.8} ${c * 0.3} ${c * 1.6} ${c * 0.9}`} stroke={primaryColor} strokeWidth="1.6" fill="none" opacity="0.35" strokeLinecap="round" />
          <Path d={`M ${c * 1.6} ${c * 0.2} Q ${c * 1.2} ${c * 0.6} ${c * 0.4} ${c * 1.5}`} stroke={secondaryColor} strokeWidth="1.6" fill="none" opacity="0.3" strokeLinecap="round" />
        </Svg>
      </Animated.View>

      {/* Center bright core */}
      <Circle cx={c} cy={c} r={c * 0.12} fill={primaryColor} opacity="0.9" />
      <Circle cx={c} cy={c} r={c * 0.06} fill="white" opacity="0.7" />
    </View>
  );
}
