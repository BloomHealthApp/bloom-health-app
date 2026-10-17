# Bubu mascot assets

The app ships with an **original, simple SVG** Bubu (a round blob bear with blush cheeks and a little sprout)
drawn in code in `src/components/BubuMascot.tsx` (`BubuMascotStatic` is the pure-SVG, non-animated version
used as the reduced-motion / fallback render). No third-party or copyrighted character artwork is included.

## Using your own artwork

1. Drop PNG/WebP files (transparent background, ideally 512x512) in this folder, e.g.
   `happy.png`, `sleepy.png`, `cheer.png`, `sad.png`. You can provide just one mood; missing moods fall back to the SVG.
2. Open `src/components/mascotAsset.ts` and set:

   ```ts
   export const customMascot: CustomMascotSet | null = {
     happy: require('../../assets/mascot/happy.png'),
     sleepy: require('../../assets/mascot/sleepy.png'),
     cheer: require('../../assets/mascot/cheer.png'),
     sad: require('../../assets/mascot/sad.png'),
   };
   ```
3. Restart Metro (`npx expo start -c`). The onboarding screens, empty states, milestone card and the daily
   message all render through `BubuMascot`, so one swap updates everywhere.

Only use artwork you have the rights to use.
