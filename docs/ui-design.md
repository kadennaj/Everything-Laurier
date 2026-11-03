# Everything Laurier UI

## Visual direction

A quiet, contemporary campus app. Cool neutral backgrounds, white surfaces, restrained Laurier purple, and occasional sage accents. Content and actions carry the hierarchy; decorative slogans and repeated labels should not compete with them.

- Platform system typography throughout: regular body text, medium controls and semibold headings. The supplied Laurier logo and purple accent retain the app’s identity.
- Keep tracking close to natural spacing; avoid tightly packed headings or widely spaced small labels.
- Shared colors, control radii, and card radii live in `src/lib/theme.ts`.
- Page headings describe the task; supporting copy stays short.
- White cards and spacing group content. Quiet separators mark navigation and settings.
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

## November 3, 2026 update

Home uses a campus-photo hero, a direct map action and four quick actions. The first-run welcome offers sign-in/create-account and guest browsing without requesting notification permission. Existing signed-in accounts skip the welcome. Notification settings use labelled native switches and an explicit enable action; denied permission provides a Settings path. Shared pages retain tablet/sidebar and large-text layouts. Apple-inspired typography and hierarchy do not imply Apple affiliation.
