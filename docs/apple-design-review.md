# Design review: Everything Laurier

October 17, 2026. React Native / Expo 57, iOS and Android, with a responsive web preview. Audience: Laurier Waterloo students. Goal: make everyday campus tasks easy to find and complete. The supplied purple-and-gold logo is retained unchanged. This is a focused interface improvement, not App Review certification.

## Summary

Initial rating: Needs work. The campus map is the distinctive utility, but a large promotional club hero appears before everyday tasks. Search excludes mapped rooms and buildings, and account/help destinations are buried behind More. The design thesis is **find your next place, person or campus activity from one useful starting point**.

## Improvements identified

- **High — Navigation:** detail screens lack an obvious in-app back control. The account sits behind More despite being needed for tutoring and profiles. `tab-bars.md › Best practices`: “Avoid overflow tabs.” Use five stable destinations, with the map beside Home and a direct You tab; keep campus services visible from Home, You and the regular-width sidebar.
- **High — Search:** global search ignores the map's room/building catalog. `searching.md › Best practices`: “Aim to make your app’s content searchable through a single location.” Add a lightweight index generated from the actual map models and direct links to the selected floor/room. Do not index uncertain room labels.
- **High — Hierarchy (design judgment):** the 244–288 pt promotional hero delays quick actions. Put campus search and daily actions first. Use a smaller campus-photo feature for club discovery below the utility section. Move nightlife below campus events; retain the dedicated Nightlife tab and age checks.
- **Medium — Readability:** shared body text is 15 pt and several actions are 13–14 pt. `typography.md › Specifications › iOS, iPadOS Dynamic Type sizes › Large (default)` specifies 17 pt body. Raise shared body/input styles to 17 pt and buttons to 16 pt, permit wrapping, and adapt columns/navigation to the available width and font scale.
- **Medium — Grouping:** an undifferentiated stack of large cards makes campus services harder to scan. `lists-and-tables.md › Best practices`: “Prefer displaying text in a list or table.” Use grouped navigation rows for campus services and search matches.
- **Medium — Forms:** ensure the keyboard does not cover the current task, retain visible labels and make course/evidence steps easier to distinguish. `layout.md › Best practices`: “Adapt your layout to account for changes in context.” Use a keyboard-avoiding content region, multiline-friendly controls and wrapping pagination.

## Compact design system planned before layout changes

Roles: grouped background #F5F4F8, surface #FFFFFF, content #24212B, secondary content #605B68, action #583785, selected surface #EEE8F5. White on action, content on surface, secondary on grouped background and action on selected surface are checked numerically during verification. Existing green/gold semantic accents remain for campus wayfinding and existing status states. Never use color as the only selected-state cue.

Dark counterparts for a future complete appearance pass: background #17151D, surface #24212D, content #F4F1F8, secondary #C2BACD, action #D1B4FF, selected surface #362A48. Do not enable a partial dark appearance while untouched screens still use fixed light colors.

Measured contrast pairs (WCAG relative luminance):

| Role pairing | Light | Planned dark |
| --- | --- | --- |
| Content / surface | 15.82:1 | 14.12:1 |
| Secondary / grouped background | 6.01:1 | 9.64:1 |
| Primary action label / action background | White / #583785: 9.13:1 | #D1B4FF / #17151D: 10.06:1 |
| Selected label / selected surface | 7.61:1 | 7.39:1 |

The form's unselected field boundary is #89818F, 3.42:1 against its grouped background. These figures verify the listed pairs, not every image/background combination throughout the app. The campus-photo feature uses a dark overlay for its light text; no new text is placed directly over an untreated photo.

Type: existing DM Sans retains the app's voice; display 30/36, section 22/29, body 17/26, action 16/22, supporting text 14/21, compact tab label 12/18. System font scaling stays enabled. Controls are at least 48 pt high where shared. No custom blur is introduced, so Reduce Transparency retains solid readable surfaces. The existing reduced-motion-aware transition stays brief.

Layout: compact widths stack useful actions; regular widths add a sidebar and two-column content without removing functionality.

```text
Compact                         Regular
[logo / title   search]          [logo + sidebar] [view title / search]
[Campus, within reach]                           [Campus, within reach]
[Search campus____________]                      [Search campus____________]
[Map / Help] [People / Saved]                     [Map / Help / People / Saved]
[campus-photo club feature]                      [campus-photo club feature]
[upcoming campus events]                         [upcoming events in columns]
[nightlife / community]                          [nightlife / community]
[Home Map Clubs Nightlife You]
```

Signature: the existing campus photography and indoor map connect this utility to Laurier rather than a generic dashboard. Restraint: remove the second map promotion and generic marketing headline. Navigation stays quiet; purple identifies actions and selection. The supplied logo remains a single contextual anchor in navigation.

Plan critique: a generic feature-card grid would preserve the original problem. This plan instead adds an actual room-search-to-floor flow, exposes tutoring and services, and lets students reach the map before promotional content. No invented events, live occupancy, precise indoor positioning or student data are introduced.

## What works

Keep the real campus photography and attribution, floor selector, permission-in-context location, optional guest browsing, selected-state labels, honest route limitations, private tutor review, destructive-action confirmations and public support contact.

## Platform notes and verification limits

The web preview is evaluated as a responsive website; macOS menu-bar conventions do not apply. The current cross-platform navigation remains React Native controls, not a claim of native Liquid Glass or automatic foldable adaptation. Full native tab migration, full dark appearance, hardware VoiceOver/TalkBack and the largest system accessibility sizes require separate device evidence. Browser screenshots cannot verify native gestures or physical keyboard avoidance.

## Completed checks

Implemented five direct primary destinations (Home, Map, Clubs, Nightlife, You), contextual titles/back navigation, a scrollable regular-width sidebar, keyboard avoidance, 17 pt shared body/input type, 16 pt button labels, 48–50 pt shared control targets, explicit web selected states, font-scale-aware grids, grouped campus services, and tutor form sections/instructions. The original supplied PNG is used for app/web icons, navigation, sign-in and startup; the website's matching logo was published separately as Sites version 7. The user chose to apply the prepared email template manually; no hosted email template was changed.

Global search has 779 destinations generated from the same map source (campus places and readable, routeable indoor room entries). It supports spaced room codes, building-qualified room searches and outdoor places. Results open the selected indoor floor/room or outdoor place. Uncertain room labels stay excluded. Native and web map sharing preserve the new outdoor place parameter.

The browser flow exposed an existing route-timing defect: reading `window.location.search` while mounting the iframe sometimes read the previous URL. The web map now initializes from Expo Router's route parameters. Browser checks confirmed Library 2-207 opens on Floor 2 and FNCC opens its campus place details. Direct You → Campus services → Peer tutoring opens the tutoring panel. The application form renders labeled fields and the reason the submission control is unavailable; no application or transcript was submitted.

Automated checks: app TypeScript and ESLint pass; 53 app tests pass, including new room-code matching, exact destination links, uncertainty exclusion, parent-navigation and contrast tests. Map typecheck/lint, 75 tests and production builds pass. Production exports for iOS, Android and web pass. The first-party privacy inventory was refreshed; the changes add local map indexing, not a new data collection endpoint.

React quality review: hooks remain unconditional, async effects keep existing cleanup, image sources are static, lists use stable destination IDs, icon-only actions have labels, and no new dependency or blur was added for this design pass. The prior branding change adds Expo's compatible splash-screen module. Existing authorization, transcript privacy, age gating and irreversible-action confirmations are preserved.

Responsive browser checks passed at 320 × 740, 375 × 812, 812 × 375 and 1280 × 900 without root horizontal overflow. The smallest width uses one-column actions; regular widths use the sidebar. The short landscape map remains vertically scrollable. Home → Search → Back returns to Home. Keyboard Tab from the search field reaches the All filter with a visible solid 2 px focus outline. Temporary viewport overrides were reset after testing. Saved previews: [phone](design-preview/home-phone.png) and [desktop](design-preview/home-desktop.png).

Final craft critique: removed the oversized generic promotional hero and duplicate map promotion; grouped services and actual search-to-map navigation carry more information with fewer decorative elements. The supplied campus photography, logo and purple action color preserve Laurier identity. Full dark appearance, native system tab/gesture migration and physical-device accessibility testing remain explicit limits, rather than being represented as verified by browser testing.
