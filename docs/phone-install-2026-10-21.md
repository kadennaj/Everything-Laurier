# iPhone update — October 21, 2026

A signed arm64 Release build of Everything Laurier 1.0.0 (`ca.everythinglaurier.preview`) was installed on the connected iPhone 15. After correcting CAPTCHA frame/storage requirements, a second Release build installed successfully and launched. Both builds completed with zero errors and one build warning.

Kaden confirmed on-device that the CAPTCHA check finishes and the requested email code arrives, that ordinary screens do not magnify when pinched, and that the map still zooms. The original user session and app identity were preserved; no store submission was made. The current development profile still expires October 24, 2026 at 18:34 UTC.

Validation: 66 tests, typecheck, lint, isolated clean npm install and security regressions pass. npm audit reports zero findings with documented local-source limitations. Web, iOS and Android JavaScript production exports pass. Expo Doctor passes 20/21 checks; its remaining version check recommends newer SDK 57 patches for Expo, Location and Router. See `BEFORE-PUBLISHING.md`, `dependency-security.md` and `captcha-setup.md`.
