// Headless task: Android calls this when a widget is added / resized / periodically updated, even if the app is closed.
// It only reads the last persisted snapshot (no network, no SQLite) and re-expresses it for the current day.
import { registerWidgetTaskHandler, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { renderHealthWidget } from './HealthWidgets';
import { loadSnapshot, resolveForDay } from './widgetData';

export async function healthWidgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, widgetInfo, renderWidget } = props;
  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const snapshot = resolveForDay(await loadSnapshot());
      renderWidget(renderHealthWidget(widgetInfo.widgetName, snapshot, { width: widgetInfo.width, height: widgetInfo.height }));
      return;
    }
    default:
      // WIDGET_CLICK with OPEN_APP is handled natively; WIDGET_DELETED needs no cleanup.
      return;
  }
}

export function registerHealthWidgetTaskHandler(): void {
  registerWidgetTaskHandler(healthWidgetTaskHandler);
}

