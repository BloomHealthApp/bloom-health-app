# src/components/

## Purpose
Reusable UI. `ui.tsx` holds the basic primitives, and `periods/` holds the tracker UI ([periods/context.md](periods/context.md)).

## Rules
- `reminders/ReminderRow.tsx` previews mirror what actually appears: the Android loud alarm mock copies `AlarmActivity`, so change them together.
- Touch targets are at least 44pt, status is never shown by color alone, and interactive elements have labels and roles.
- Rest days are drawn as a soft cell without a reason (`CalendarDayCell`, `WeeklyProgressChart`).
- `CalendarDayCell` and the period tracker's `DayCell` fill an explicit seven-cell row (`chunkWeeks`). Don't lay them out with percentage widths in a wrapping row: on some screens seven cells round to more than the row's width, so the seventh wraps and every date shifts a column.
- `periods/PeriodsPanel` is the tracker, shown only from the Calendar tab and never rendered for viewers.

## Mascot
- `mascotArt.tsx` draws the original "Bloom": a chubby mochi bunny-bear with two small rounded ears, a head sprout, stubby arms and tiny feet. It has a sticker look: thick brown outline, flat pastel fills, white die-cut border, soft drop shadow, in a 200x200 viewBox.
- The body stays cream-white, while cheeks, props and accents follow the active theme.
- `Mascot.tsx` animates and disables idle animation when the OS asks for reduced motion, using `MascotStatic`.
- `mascotAsset.ts` is where to swap in custom art (see `assets/mascot/README.md`).
- Widgets reuse this art through `widgets/svg.ts`, so changing it changes them too. Don't duplicate artwork.
- `GlassLayer` gives surfaces glass depth with lower shading, an inner glow and a top gloss. Pair it with `glassShadow`. It must not draw a white rim or border: the user asked for glass without one. Place it under content. The gloss is a full-width fade, because an inset strip shows hard edges without a rim. Shared surfaces use it: `Card`, `Button`, `IconButton`, the `ScreenHeader` back button, `Segmented`, `GenderPicker`, rest-day chips, `FloatingTabBar`, `ThemePicker`, reminder options and the selected `IconPicker` cell. New screens should build on these, so the glass stays consistent. `Field` keeps a plain theme border instead, so inputs stay visible. Selected items keep a solid accent border too, because the glass alone doesn't show selection clearly. Calendar cells, chips, avatars and stickers stay flat: there are many of them, or they have their own border.
