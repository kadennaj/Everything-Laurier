# Indoor location and interface update — October 21, 2026

The app remains on `main`. This update does not add an indoor-positioning service or claim room-level GPS.

## Location flow

- **Set indoor location** opens building, floor, and mapped room/entrance choices. Confirmation places a blue starting-point marker. It stays at that confirmed point until changed or cleared.
- **Estimate floor changes** is optional in the installed phone app. A starting floor confirmed within the last minute is required. The barometer supplies relative altitude on iOS; other supported phones use pressure-derived relative height. The browser keeps manual floor selection.
- Calibration requires at least four stable readings spanning three seconds. Unstable, stale, out-of-range, between-floor, or restarted-sensor readings provide no floor suggestion. Estimates expire after ten minutes and stop on pause, map closure, or switching to campus/another building. A missing or denied sensor falls back to manual selection; no endless loading is intended.
- The initial floor height of 3.5 m is explicitly an assumption. The location dialog exposes an optional 2.5–6 m adjustment. Building floor heights have not been surveyed. Pressure/HVAC/weather effects can still produce an incorrect estimate.
- A suggestion is labelled **Estimated floor**. **Update** opens confirmation on that floor and requires another mapped point. A suggestion never silently moves the blue dot or changes the route origin. Elevation does not identify the room or horizontal position.
- Native GPS requests the best navigation accuracy and more frequent foreground updates. Actual accuracy remains device/signal dependent; routes from GPS are withheld above 50 m reported uncertainty. The accuracy radius remains visible. No background location is requested.

## Routes

A confirmed indoor point can start campus directions. Room-to-room routes use traced corridors and floor connectors where available. Cross-campus journeys can include an indoor departure leg, campus paths, and an indoor arrival leg. A transfer instruction connects coordinate systems; no unsurveyed straight line is drawn between an indoor door and a campus access point. Displayed estimates cover mapped portions and explicitly exclude unmeasured access gaps. Access, elevator operation, floor coverage and accessibility still need on-campus checking.

## Clubs and writing

The full 184-club directory was present. The full-parent-height ClubCard could stretch the first native item over the list. Cards now size to content; the directory uses compact rows with a separate save control, searchable categories, and pagination. The preview showed multiple clubs without searching.

Removed promotional headings, repeated introductions, heading periods, redundant service subtitles, and a decorative venue text card. Essential sharing consent, prices, age choices, source attribution, privacy/data controls and access limitations remain.

Design follows the existing Laurier purple identity and DM Sans scale. Compact club rows retain 44+ point controls and wrapping text. New location text contrasts: purple #583785 on white 9.13:1; #382354 on #F5F1FA 12.26:1; #625A66 on #FFFEFA 6.56:1. New dialogs have labelled controls, Escape dismissal, and a focus trap. This is a code and browser review, not a complete screen-reader certification.

## Verification

- Map typecheck, lint, 83 tests, production build and embedded-map generation passed.
- App typecheck, lint and 66 tests passed. Native and web production exports passed.
- Focused tests cover stable up/down height changes, noisy/in-between readings, missing floors, sensor restart, stale/invalid timestamps, expired calibration, upstairs-to-campus, cross-campus room routes, elevator preference, coordinate-frame transfers and missing endpoints.
- Browser flow: confirmed Library Floor 3 Graduate Commons; browser sensor fallback; campus route to Bricker includes Floor 3 → Floor 2 stairs, exit transfer, and campus walking steps.
- Dependency audit reported zero findings, including development dependencies. Vendored security patches from the preceding update are preserved.
- Privacy Markdown, app JSON and public HTML include optional pressure/relative-height processing. The public site was published as version 12 with its existing public audience. The configured HTTPS privacy page passed the release check.
- A signed Release build was installed on the connected iPhone 15 through Apple’s direct installer and launched. The built app includes the specific motion-permission purpose string. The owner confirmed on October 21, 2026 that multiple clubs display and barometer calibration finishes on the iPhone. This confirms the sensor flow, not floor accuracy while moving between actual campus floors.
- Actual room/floor accuracy cannot be established by synthetic tests. A campus walk with known floors is still required to evaluate the height assumption and false suggestions. Manual confirmation is always the routing authority.
