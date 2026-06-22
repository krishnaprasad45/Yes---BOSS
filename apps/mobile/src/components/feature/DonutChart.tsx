import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';

export interface DonutSegment {
  value: number;
  color: string;
}

/**
 * Lightweight donut chart drawn with react-native-svg (no chart lib). Each
 * segment is an arc rendered via strokeDasharray on a circle. Children render
 * centered inside the ring (e.g. the "Total ₹2,840" label).
 */
export function DonutChart({
  segments,
  size = 180,
  thickness = 22,
  children,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, x) => s + x.value, 0);

  let offset = 0;
  const arcs =
    total > 0
      ? segments.map((seg, i) => {
          const fraction = seg.value / total;
          const dash = fraction * circumference;
          const arc = (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              fill="none"
            />
          );
          offset += dash;
          return arc;
        })
      : [];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Track ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.cardAlt}
          strokeWidth={thickness}
          fill="none"
        />
        {/* Rotate so the first slice starts at 12 o'clock. */}
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {arcs}
        </G>
      </Svg>
      {children}
    </View>
  );
}
