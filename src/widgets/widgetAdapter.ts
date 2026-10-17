import { Platform } from 'react-native';
import { resolveForDay, type WidgetSnapshot } from './widgetData';

type WidgetLib = typeof import('react-native-android-widget');
type Widgets = typeof import('./BubuWidgets');

let lib: WidgetLib | null | undefined;
let widgets: Widgets | null = null;

/**
 * react-native-android-widget needs a native module that Expo Go and non-Android runtimes do not ship (importing it
 * calls TurboModuleRegistry.getEnforcing). It is therefore loaded lazily and everything here no-ops when it is missing.
 */
function load(): { lib: WidgetLib; widgets: Widgets } | null {
  if (Platform.OS !== 'android') return null;
  if (lib === undefined) {
    try {
      /* eslint-disable @typescript-eslint/no-require-imports */
      lib = require('react-native-android-widget') as WidgetLib;
      widgets = require('./BubuWidgets') as Widgets;
      /* eslint-enable @typescript-eslint/no-require-imports */
    } catch (e) {
      console.warn('[widget] android widget module is unavailable in this runtime (needs a dev/preview build).', e);
      lib = null;
    }
  }
  return lib && widgets ? { lib, widgets } : null;
}

/** Redraw every placed Bubu widget from `snapshot`. Safe to call anywhere; resolves without doing anything off-Android / in Expo Go. */
export async function requestWidgetRefresh(snapshot: WidgetSnapshot): Promise<void> {
  const m = load();
  if (!m) return;
  const resolved = resolveForDay(snapshot);
  try {
    await Promise.all(
      m.widgets.WIDGET_NAMES.map((widgetName) =>
        m.lib.requestWidgetUpdate({
          widgetName,
          renderWidget: (info) => m.widgets.renderBubuWidget(widgetName, resolved, { width: info.width, height: info.height }),
        }),
      ),
    );
  } catch (e) {
    // The package imports fine in Expo Go but throws "not linked" on first native call.
    console.warn('[widget] widget update skipped (native module not linked; needs a dev/preview build).', e);
    lib = null;
  }
}

/** Called once from the JS entry (index.ts) to let Android's headless task render widgets while the app is closed. */
export function registerWidgetTask(): void {
  const m = load();
  if (!m) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./widgetTaskHandler') as typeof import('./widgetTaskHandler')).registerBubuWidgetTaskHandler();
  } catch (e) {
    console.warn('[widget] could not register widget task handler', e);
  }
}
