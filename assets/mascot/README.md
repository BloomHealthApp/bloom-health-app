# Bloom mascot

Bloom is an **original character** drawn entirely in code (react-native-svg): a chubby "mochi bunny-bear" bean with two
small rounded ears (soft peach inside), a little sprout on the head, stubby arms and tiny feet. The look is a flat
pastel sticker: thick dark-brown outline, a white die-cut border and a soft drop shadow, big blush cheeks, tiny dot
eyes and a tiny mouth. The body stays cream-white; cheeks, props and accents follow the active theme
(Forest Trail, Midnight Navy, Cotton Candy, Lavender Dream, Mint Peach). All props (popsicle, flower, bottle, dumbbell, notebook, confetti) are
simple shapes made for this app. No third-party artwork is included.

## Where it lives

- `src/components/mascotArt.tsx` - the drawing (one function per layer: shadow, white border, colour artwork).
- `src/components/MascotStatic.tsx` - pure SVG, no animation; also the reduced-motion render.
- `src/components/Mascot.tsx` - the component screens use. Adds the gentle idle bob (skipped when the OS asks
  for reduced motion or `animated={false}`) and the accessibility label.
- `src/components/mascotTypes.ts` - the `MascotMood` union.

## Moods

| mood | use |
| --- | --- |
| `happy` | waving; sign-in, settings, daily message |
| `cheer` | welcome screen, daily message |
| `celebrating` | arms up with confetti; streak milestones |
| `loved` | holds a flower; sign-up |
| `eating` | popsicle, tongue out |
| `hydrate` | holds a water bottle; water tracker |
| `workout` | headband and tiny dumbbell; workout screen |
| `thinking` | looks at a blank notebook; OTP screen and empty states |
| `sleepy`, `sad` | quiet / offline states |

## Props

`<Mascot mood size animated accessibilityLabel />` - `size` is the rendered width and height (looks crisp from
80 to 200 and beyond, it is vector). Keep text beside or below the mascot, never behind it.

## Swapping in your own licensed artwork

The mascot slot is `customMascot` in `src/components/mascotAsset.ts`. If you own, or hold a licence for, your own
character artwork, export transparent PNG/WebP files (ideally 512x512) into this folder and map them by mood:

```ts
export const customMascot: CustomMascotSet | null = {
  happy: require('../../assets/mascot/happy.png'),
  eating: require('../../assets/mascot/eating.png'),
  // any subset of the moods; missing moods fall back to the built-in SVG
};
```

Restart Metro (`npx expo start -c`). Every screen renders through `Mascot`, so one change updates the whole app.
Only use artwork you created or are explicitly licensed to use in a published app.
