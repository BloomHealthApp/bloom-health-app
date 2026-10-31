import React, { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { MascotStatic } from './MascotStatic';
import { customMascot } from './mascotAsset';
import type { MascotMood } from './mascotTypes';

export { MascotStatic };

export type { MascotMood };

interface Props {
  mood?: MascotMood;
  size?: number;
  /** disable the idle animation (it is also disabled automatically when the OS asks for reduced motion) */
  animated?: boolean;
  accessibilityLabel?: string;
}

const LABELS: Record<MascotMood, string> = {
  happy: 'Bloom the bunny-bear, smiling',
  sleepy: 'Bloom the bunny-bear, sleepy',
  cheer: 'Bloom the bunny-bear, cheering',
  sad: 'Bloom the bunny-bear, a little sad',
  eating: 'Bloom the bunny-bear, enjoying a popsicle',
  loved: 'Bloom the bunny-bear, holding a flower',
  celebrating: 'Bloom the bunny-bear, celebrating with confetti',
  hydrate: 'Bloom the bunny-bear, holding a water bottle',
  workout: 'Bloom the bunny-bear, lifting a tiny dumbbell',
  thinking: 'Bloom the bunny-bear, looking at a blank notebook',
};

export function Mascot({ mood = 'happy', size = 120, animated = true, accessibilityLabel }: Props) {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  const shouldAnimate = animated && !reduced;

  useEffect(() => {
    if (!shouldAnimate) {
      y.value = 0;
      return;
    }
    const calm = mood === 'sleepy' || mood === 'thinking';
    const amp = mood === 'cheer' || mood === 'celebrating' ? -10 : calm ? -3 : -6;
    const dur = calm ? 1800 : 1100;
    y.value = withRepeat(
      withSequence(withTiming(amp, { duration: dur, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: dur, easing: Easing.inOut(Easing.quad) })),
      -1,
    );
  }, [shouldAnimate, mood, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const label = accessibilityLabel ?? LABELS[mood];

  const custom = customMascot?.[mood];
  const art = custom ? <Image source={custom} style={{ width: size, height: size }} resizeMode="contain" /> : <MascotStatic mood={mood} size={size} />;

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
