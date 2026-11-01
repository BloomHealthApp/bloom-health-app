// Android home-screen widget layouts, built from react-native-android-widget primitives (no hooks, no react-native views).
// Pure functions of (snapshot, size) so they can be rendered by the headless task handler while the app is closed.
import React from 'react';
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { flameSvg, mascotSvg, ringSvg } from './svg';
import type { WidgetSnapshot } from './widgetData';
import { widgetGlass, widgetPalette } from './widgetTheme';

export const WIDGET_SMALL = 'BubuSmall';
export const WIDGET_MEDIUM = 'BubuMedium';
export const WIDGET_NAMES = [WIDGET_SMALL, WIDGET_MEDIUM] as const;

export interface WidgetSize {
  width?: number;
  height?: number;
}

const isLive = (s: WidgetSnapshot) => s.state === 'ready' || s.state === 'noHabits';
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function SmallWidget({ snapshot: s, size = {} }: { snapshot: WidgetSnapshot; size?: WidgetSize }) {
  const p = widgetPalette(s.theme, s.dark);
  const box = Math.min(size.width || 110, size.height || 110);
  const mascot = Math.max(40, Math.round(box * (isLive(s) ? 0.5 : 0.55)));
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={isLive(s) ? `Bloom Health. ${plural(s.currentStreak, 'day')} streak. Tap to open.` : `Bloom Health. ${s.message}`}
      style={{ height: 'match_parent', width: 'match_parent', ...widgetGlass(p), padding: 8, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
    >
      <SvgWidget svg={mascotSvg(s.mood, s.theme)} style={{ width: mascot, height: mascot }} />
      {isLive(s) ? (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
          <SvgWidget svg={flameSvg(p.accent)} style={{ width: 20, height: 20 }} />
          <TextWidget text={String(s.currentStreak)} style={{ fontSize: 22, fontWeight: '800', color: p.text, marginLeft: 3 }} />
          <TextWidget text="day streak" style={{ fontSize: 10, color: p.muted, marginLeft: 3 }} />
        </FlexWidget>
      ) : (
        <TextWidget text={s.message} maxLines={2} truncate="END" style={{ fontSize: 12, fontWeight: '700', color: p.text, marginTop: 2 }} />
      )}
    </FlexWidget>
  );
}

export function MediumWidget({ snapshot: s, size = {} }: { snapshot: WidgetSnapshot; size?: WidgetSize }) {
  const p = widgetPalette(s.theme, s.dark);
  // Sized from the height so the text column keeps most of the width on a 4x2 widget.
  const h = size.height || 110;
  const mascot = Math.max(48, Math.min(72, h - 30));
  const ring = Math.max(48, Math.min(64, h - 36));
  if (!isLive(s)) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        accessibilityLabel={`Bloom Health. ${s.message}`}
        style={{ height: 'match_parent', width: 'match_parent', ...widgetGlass(p), padding: 10, flexDirection: 'row', alignItems: 'center' }}
      >
        <SvgWidget svg={mascotSvg(s.mood, s.theme)} style={{ width: mascot, height: mascot }} />
        <FlexWidget style={{ flex: 1, marginLeft: 12, flexDirection: 'column', justifyContent: 'center' }}>
          <TextWidget text="Bloom Health" style={{ fontSize: 16, fontWeight: '800', color: p.text }} />
          <TextWidget text={s.message} maxLines={2} truncate="END" style={{ fontSize: 13, color: p.muted, marginTop: 2 }} />
        </FlexWidget>
      </FlexWidget>
    );
  }
  const habits = s.state === 'noHabits' ? 'No habits scheduled today' : `${s.completed} of ${s.eligible} habits done`;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`Bloom Health. ${plural(s.currentStreak, 'day')} streak, ${s.percent} percent done today. Tap to open.`}
      style={{ height: 'match_parent', width: 'match_parent', ...widgetGlass(p), padding: 10, flexDirection: 'row', alignItems: 'center' }}
    >
      <SvgWidget svg={mascotSvg(s.mood, s.theme)} style={{ width: mascot, height: mascot }} />
      <FlexWidget style={{ flex: 1, marginLeft: 8, flexDirection: 'column', justifyContent: 'center' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <SvgWidget svg={flameSvg(p.accent)} style={{ width: 20, height: 20 }} />
          <TextWidget text={`${s.currentStreak} day streak`} style={{ fontSize: 14, fontWeight: '800', color: p.text, marginLeft: 3 }} />
        </FlexWidget>
        <TextWidget text={`Longest: ${plural(s.longestStreak, 'day')}`} style={{ fontSize: 12, color: p.muted }} />
        <TextWidget text={habits} style={{ fontSize: 12, fontWeight: '700', color: p.text, marginTop: 2 }} />
        <TextWidget text={s.message} maxLines={2} truncate="END" style={{ fontSize: 11, color: p.muted, marginTop: 2 }} />
      </FlexWidget>
      <OverlapWidget style={{ width: ring, height: ring, marginLeft: 6 }}>
        <SvgWidget svg={ringSvg(s.percent, p.track, p.accent)} style={{ width: ring, height: ring }} />
        <FlexWidget style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget text={`${s.percent}%`} style={{ fontSize: 15, fontWeight: '800', color: p.text }} />
        </FlexWidget>
      </OverlapWidget>
    </FlexWidget>
  );
}

/** Pick the layout for a registered widget name. */
export function renderHealthWidget(widgetName: string, snapshot: WidgetSnapshot, size?: WidgetSize): React.JSX.Element {
  return widgetName === WIDGET_MEDIUM ? <MediumWidget snapshot={snapshot} size={size} /> : <SmallWidget snapshot={snapshot} size={size} />;
}
