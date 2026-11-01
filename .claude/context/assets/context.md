# assets/

## Purpose
`brand/` holds the logo masters. `logo-mark.svg` is the white outline butterfly, traced from `logo-outline-source.png`, and `logo-gradient.svg` is the icon background. `logo-source.png` is the earlier filled version.

## Rules
- Don't edit the icons, splash or favicon by hand. Change a master, then run `node scripts/generate-brand-assets.mjs`.
- Bloom the mascot is the in-app character. The butterfly is only the brand mark, so widgets and the welcome screen keep the mascot.

## Why
The gradient is deeper than in `logo-outline-source.png`, because the white lines lost contrast on its pale pink and peach areas.

## Gotchas
- Icon and splash changes need a new build. Expo Go doesn't show them.
- Keep the Android foreground mark inside the center 66%, or masks clip the wings.
- `app.json` uses the solid purple `#6C45EF` where only one color is allowed: the adaptive icon fallback, splash background and notification tint.
