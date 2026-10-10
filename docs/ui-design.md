# Everything Laurier UI

## Visual direction

A quiet, contemporary campus app. Warm neutral backgrounds, white surfaces, restrained Laurier purple, and occasional sage accents. Content and actions carry the hierarchy; decorative slogans and repeated labels should not compete with them.

- DM Sans throughout, including heroes and artwork: regular (400) for body text, medium (500) for controls, and semibold (600) for headings.
- Keep tracking close to natural spacing; avoid tightly packed headings or widely spaced small labels.
- Shared colors, control radii, and card radii live in `src/lib/theme.ts`.
- Page headings describe the task; supporting copy stays short.
- Cards use a fine border rather than stacked shadows.
- Buttons and filters use consistent sizing and pressed feedback.
- Primary actions remain prominent, with secondary actions in lavender.
- Navigation keeps the existing five destinations and all routes.
- Short route fades respect the system's Reduce Motion setting.
- Labels wrap where possible; text scaling remains enabled.

## Content presentation

Never delete source data to simplify a screen. Hide absent optional fields in the UI instead. Empty captions, missing media, absent contact emails, and empty external links should not produce blank rows or invented values. Genuine loading, empty, and error states still explain what is happening and offer recovery.

The Instagram feed keeps its existing fetch and polling behavior. During manual refresh, keep already loaded posts visible. Use static skeletons for the first load and a concise error message if refreshing fails. The scraper, database, authentication, and saved-item storage are unchanged.

The empty future club-updates panel and outdated statement that crowd reports are unavailable have been removed. The student-tutor tab is retained with a concise availability message and its existing support action.

## Review expectations

Run lint, TypeScript checks, the existing functional tests, and the web export. Review phone, landscape, tablet, and desktop layouts. Exercise club search, detail navigation, bookmark persistence, nightlife filters, Instagram refresh and failures, room-code lookup, sign-in validation, profile forms, and line reporting with test transport. Test reduced motion and larger text. Native device review is still required before release; browser layout checks do not substitute for native accessibility testing.
