# src/avatars/

## Purpose
Nine profile avatars. The server stores only the id (allowlist `bubu-01` to `bubu-09`), and the art is drawn locally.

## Rules
- A null or unknown id shows the neutral Bloom face.
- The palette is fixed, not theme-dependent, so avatars look the same everywhere.
- `AvatarArt.tsx` uses only `Circle`, `Ellipse`, `G`, `Path`, `Rect` and `Line`, so its trees can be serialised to SVG strings by `widgets/svg.ts`.
- Art shares the Bloom silhouette from `components/mascotArt.tsx`, in a 200x200 viewBox. The background fills the square and the host crops it to a circle.
- Touch targets are at least 44pt.

## Why
The "Choose your Bloom" screen shows once per account on a device, while the user has no avatar and the flag is unset (`avatarPrompt.ts`). Continue and Skip both set the flag, so it never returns after a skip. Storage failures resolve to "done", so a user can never be trapped.
