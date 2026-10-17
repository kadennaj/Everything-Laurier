# iPhone development install — October 17, 2026

- Regenerated the ignored native iOS project from the current Expo app configuration and compiled a signed arm64 Release build from main (`6754df1`; application changes through `5fa49b3`).
- Installed Everything Laurier 1.0.0, bundle identifier `ca.everythinglaurier.preview`, directly on the connected iPhone 15 running iOS 18.6.2. Installation reached 100%, and the device's installed-app inventory confirms the app.
- Native build: zero errors, one warning. Typecheck and lint passed.
- Local signature verification passed; the embedded provisioning profile matches the app identifier and development team and includes the connected phone. The current development provisioning profile expires October 24, 2026 at 18:34 UTC. Renew/reinstall for continued testing after expiry.
- First launch is currently blocked by iOS's developer-trust security gate. The phone owner must trust the development certificate in Settings → General → VPN & Device Management before launch can be verified. Do not treat installation as successful runtime testing.
- The Release build includes its JavaScript bundle and does not need Metro to run. Online features still need internet access.

The deferred publication requirements remain in [BEFORE-PUBLISHING.md](BEFORE-PUBLISHING.md). No store submission was performed.
