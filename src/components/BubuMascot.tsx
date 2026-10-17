import React, { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { BubuMascotStatic } from './BubuMascotStatic';
import { customMascot } from './mascotAsset';
import type { MascotMood } from './mascotTypes';

export { BubuMascotStatic };

export type { MascotMood };

interface Props {
  mood?: MascotMood;
  size?: number;
  /** disable the idle animation (it is also disabled automatically when the OS asks for reduced motion) */
  animated?: boolean;
  accessibilityLabel?: string;
}

const LABELS: Record<MascotMood, string> = {
  happy: 'Bubu the bear, smiling',
  sleepy: 'Bubu the bear, sleepy',
  cheer: 'Bubu the bear, cheering',
  sad: 'Bubu the bear, a little sad',
};

export function BubuMascot({ mood = 'happy', size = 120, animated = true, accessibilityLabel }: Props) {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  const shouldAnimate = animated && !reduced;

  useEffect(() => {
    if (!shouldAnimate) {
      y.value = 0;
      return;
    }
    const amp = mood === 'cheer' ? -10 : mood === 'sleepy' ? -3 : -6;
    const dur = mood === 'sleepy' ? 1800 : 1100;
    y.value = withRepeat(
      withSequence(withTiming(amp, { duration: dur, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: dur, easing: Easing.inOut(Easing.quad) })),
      -1,
    );
  }, [shouldAnimate, mood, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const label = accessibilityLabel ?? LABELS[mood];

  const custom = customMascot?.[mood];
  const art = custom ? <Image source={custom} style={{ width: size, height: size }} resizeMode="contain" /> : <BubuMascotStatic mood={mood} size={size} />;

  if (!shouldAnimate) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={label}>
        {art}
      </View>
    );
  }
  return (
    <Animated.View style={style} accessible accessibilityRole="image" accessibilityLabel={label}>
      {art}
    </Animated.View>
  );
}
