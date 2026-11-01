import React from 'react';
import { Circle, Path, Rect, Svg } from 'react-native-svg';

export type LineIconName = 'person' | 'mail' | 'phone' | 'copy' | 'pencil' | 'gender' | 'calendar' | 'chevron';

/** Simple outline icons in a 24x24 viewBox, for details and controls where a sticker would be too loud. */
export function LineIcon({ name, color, size = 18 }: { name: LineIconName; color: string; size?: number }) {
  const s = { fill: 'none', stroke: color, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'person' ? (
        <>
          <Circle cx={12} cy={8} r={4} {...s} />
          <Path d="M4.5 21c.7-4.4 3.8-6.8 7.5-6.8s6.8 2.4 7.5 6.8" {...s} />
        </>
      ) : name === 'mail' ? (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={2.5} {...s} />
          <Path d="m4 7 8 6 8-6" {...s} />
        </>
      ) : name === 'phone' ? (
        <Path d="M6.6 3.5 9 3l2 4.6-2.2 1.7a12 12 0 0 0 5.9 5.9l1.7-2.2 4.6 2-.5 2.4a2.6 2.6 0 0 1-2.6 2.1A15.4 15.4 0 0 1 4.5 6.1a2.6 2.6 0 0 1 2.1-2.6Z" {...s} />
      ) : name === 'copy' ? (
        <>
          <Rect x={9} y={8} width={11} height={13} rx={2} {...s} />
          <Path d="M15 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" {...s} />
        </>
      ) : name === 'pencil' ? (
        <Path d="m4 20 1-4.5L16.5 4a2.1 2.1 0 0 1 3 0l.5.5a2.1 2.1 0 0 1 0 3L8.5 19 4 20ZM14.5 6l3.5 3.5" {...s} />
      ) : name === 'gender' ? (
        <>
          <Circle cx={10} cy={14} r={5} {...s} />
          <Path d="M13.6 10.4 20 4m-5 0h5v5" {...s} />
        </>
      ) : name === 'calendar' ? (
        <>
          <Rect x={3.5} y={5} width={17} height={16} rx={2.5} {...s} />
          <Path d="M8 3v4M16 3v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" {...s} />
        </>
      ) : (
        <Path d="m9 5 7 7-7 7" {...s} />
      )}
    </Svg>
  );
}
