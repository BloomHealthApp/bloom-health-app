# src/theme/

## Purpose
Tokens, five themes, and `ThemeProvider`. The server profile theme is the cross-device preference once signed in.

## Rules
Base palettes from the spec, with remaining roles (text, border, status) derived for contrast:

| Theme | Colors |
|---|---|
| Cotton Candy | `#F8D7E8`, `#D65B98`, `#FFF9F5` |
| Lavender Dream | `#E9E2FF`, `#B9A7E8`, `#51436B` |
| Mint Peach | `#DDF3E7`, `#FFE3D6`, `#6E9D88` |
| Forest Trail (default) | `#DCE8D6`, `#2F6B4F`, `#F6F8F2` |
| Midnight Navy | `#D9E2F0`, `#1F3A5F`, `#F4F6FA` |

Forest Trail and Midnight Navy set `blush`, so the mascot's cheeks aren't mixed with pink.

Signup has no theme field, so `AuthProvider.verifyOtp` sends the theme picked on the welcome screen with `PATCH /me` for a new account. Otherwise the server default would overwrite it. If that call fails, signup still succeeds on the default.

## Gotchas
A new theme name must ship in the app before the service accepts it: `ThemeNameSchema` is a strict enum, so an older build can't parse a user with an unknown theme.
