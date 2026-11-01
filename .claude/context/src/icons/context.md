# src/icons/

## Purpose
Bloom's custom sticker icons, drawn in code with `react-native-svg` in a 48x48 viewBox. `AppIcon` renders one; `HabitIcon` renders a habit's saved value; `IconPicker` is the choice grid in the habit form.

## Rules
- Add an icon to `ICON_NAMES`, `ART` and `ICON_LABELS` (`lib/habitIcon.ts`). Add it to `HABIT_ICON_CHOICES` if habits can use it.
- Each icon is drawn twice: a white silhouette, then the outlined art. That border keeps the dark outlines visible in dark mode.
- `tone`, `glint` and `dot` add shading and highlights in the art pass only. Keep them inside their shape, because there's no clipping.
- The activity icons (`run`, `walk`, `yoga`) use `bloomHead` so they read as the mascot.
- Only `accent` follows the theme. Everything else is a fixed colour, so a water drop stays blue.
- Art uses only `Circle`, `Ellipse`, `G`, `Path` and `Rect`, so it could be serialised for widgets later.

## Why
The API's habit `icon` is a free string of up to 32 characters, so names need no server change, and the service already seeds names like `sunrise`. Unknown names show `sparkles`, the service's default. Older emoji stay as saved: the default-habit emoji map to icons, and any other shows until the user picks an icon. `✓` stays as text because it's a typographic mark on coloured fills.
