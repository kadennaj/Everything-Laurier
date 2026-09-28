# Everything Laurier

A UI prototype for student life around Laurier Waterloo, built with React Native, Expo, TypeScript, and Expo Router.

## Current scope

- Five main tabs: Discover, Nightlife, Clubs, Map, and More. People and Help remain available through More.
- Searchable local snapshot of 184 club listings, with club detail pages and available official links.
- A researched nightlife edit with four venues, six weekly programmes, and a past one-off event spotlight.
- Venue and night detail pages, day/music filters, global search, and local bookmarks.
- Illustrative campus event cards and fictional networking profiles.
- Local bookmarks that persist on the device.
- An illustrated campus guide with building search and external directions.
- Official academic support links and a tutor placeholder.
- Responsive layouts for mobile and desktop browser previews.

This is a frontend prototype. There is no backend, authentication, Instagram scraper, live event feed, messaging, tutor verification, or location tracking. Campus events and people are sample content. Nightlife is an editorial snapshot of linked sources, not a live event feed. The map is an illustration, not a verified navigation map. Students’ Union approval is pending; no endorsement is claimed.

## Run locally

Install a Node.js version supported by Expo SDK 57, then run:

```sh
npm ci
npm run dev
```

Open http://localhost:8081 for the browser preview. For Expo's device workflow, use `npm start`. This prototype has not yet been validated on a physical iPhone.

## Checks

```sh
npm run typecheck
npm run lint
npm run export:web
```

## Structure

- `src/app/`: Expo Router screens.
- `src/components/`: shared interface, artwork, cards, and campus illustration.
- `src/data/`: local directory snapshot and sample content.
- `src/lib/`: design tokens and local bookmark state.
- `assets/`: bundled images and app assets.

No credentials or environment variables are required for the current UI.

## Sources and credits

Club listings are a local snapshot of the [Students’ Union directory](https://www.yourstudentsunion.ca/club-listings), collected September 24, 2026. Availability and contact details may change; this is not a live feed.

The campus photograph is [Schlegel Centre by LeonV](https://commons.wikimedia.org/wiki/File:Schlegel_Centre_(Laurier%27s_school_of_business_and_economics).JPG), licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). It is displayed with cropping and a colour overlay. Its licence remains applicable independently of the code licence. Event illustrations are original UI artwork.


### Nightlife research

Reviewed September 27, 2026. Original poster artwork is illustrative; no venue endorsement is claimed.

- [Phil’s official site](https://www.philsgrandsons.com/) and [Sunday programme](https://www.philsgrandsons.com/sunday): Wednesday Night School, Retro Sundays, and the archived Raving Lunatics Vol. 5 special.
- [Crown Bar & Social](https://crownsocial.ca/): The Weekly and Saturday Social. Opening times conflict across the site, so the UI asks users to confirm instead of choosing one.
- [The Pub on King](https://www.thepubonking.com/): address, listed opening hours, and Taco Tuesday. Menu offers and admission are not guaranteed.
- [Wilf’s](https://www.yourstudentsunion.ca/wilfs) and [reservation policies](https://www.yourstudentsunion.ca/reservation-policies): campus location and Wednesday trivia. The current term schedule remains unconfirmed.
- [Imprint’s Crown rebrand report](https://uwimprint.ca/the-crown-makes-grand-entrance-in-waterloo/): The Drink became Crown in September 2025.

Weekly programmes do not create dated occurrences. The archived special is not shown as an upcoming event. Crowd levels, wait times, and ticket availability are not fabricated. Source links and review dates appear in detail views.
