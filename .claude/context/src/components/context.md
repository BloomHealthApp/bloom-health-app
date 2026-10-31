# src/components/

## Purpose
Reusable UI. `ui.tsx` holds the basic primitives, and `periods/` holds the tracker UI ([periods/context.md](periods/context.md)).

## Rules
- Touch targets are at least 44pt, status is never shown by color alone, and interactive elements have labels and roles.
- Rest days are drawn as a soft cell without a reason (`CalendarDayCell`, `WeeklyProgressChart`).
- `CycleCard` is never rendered for viewers.

## Mascot
- `mascotArt.tsx` draws the original "Bloom": a chubby mochi bunny-bear with two small rounded ears, a head sprout, stubby arms and tiny feet. It has a sticker look: thick brown outline, flat pastel fills, white die-cut border, soft drop shadow, in a 200x200 viewBox.
- The body stays cream-white, while cheeks, props and accents follow the active theme.
- `Mascot.tsx` animates and disables idle animation when the OS asks for reduced motion, using `MascotStatic`.
- `mascotAsset.ts` is where to swap in custom art (see `assets/mascot/README.md`).
- Widgets reuse this art through `widgets/svg.ts`, so changing it changes them too. Don't duplicate artwork.
