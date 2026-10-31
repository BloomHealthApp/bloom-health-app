import type { ImageSourcePropType } from 'react-native';

/**
 * Swap in your own mascot artwork here (see assets/mascot/README.md).
 * Leave `null` to use the built-in original SVG Bloom.
 * Example:  export const customMascot = { happy: require('../../assets/mascot/happy.png'), ... }
 */
export type CustomMascotSet = Partial<Record<import('./mascotTypes').MascotMood, ImageSourcePropType>>;
export const customMascot: CustomMascotSet | null = null;
