# src/avatars/

## Purpose
Fifteen profile avatars. The server stores only the id (allowlist `bubu-01` to `bubu-15`), and the art is drawn locally. `bubu-10` to `bubu-15` are the male-oriented set: they use `BOLD_PALETTE` and skip the blush. Anyone can pick any avatar; gender never selects one (see `_shared/privacy-invariants.md`).

## Rules
- A null or unknown id shows the neutral Bloom face.
- The palette is fixed, not theme-dependent, so avatars look the same everywhere.
- `AvatarArt.tsx` uses only `Circle`, `Ellipse`, `G`, `Path`, `Rect` and `Line`, so its trees can be serialised to SVG strings by `widgets/svg.ts`.
- Art shares the Bloom silhouette from `components/mascotArt.tsx`, in a 200x200 viewBox. The background fills the square and the host crops it to a circle.
- Touch targets are at least 44pt.
- Ship new ids in the app before raising `Count` in the service's `pkg/enums/avatar`. An older build shows the neutral face for an id it doesn't know.

## Why
The "Choose your Bloom" screen shows once per account on a device, while the user has no avatar and the flag is unset (`avatarPrompt.ts`). Continue and Skip both set the flag, so it never returns after a skip. Storage failures resolve to "done", so a user can never be trapped.
