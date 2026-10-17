// Custom entry: keep Expo Router's entry, and also register the Android home-screen widget's headless task so widgets
// can render while the app is closed. The widget module is loaded lazily and is a no-op in Expo Go / on other platforms.
import 'expo-router/entry';
import { registerWidgetTask } from './src/widgets/widgetAdapter';

registerWidgetTask();
