# Everything Laurier

A UI prototype for student life around Laurier Waterloo, built with React Native, Expo, TypeScript, and Expo Router.

## Current scope

- Five main screens: Discover, Clubs, Map, People, and Help.
- Searchable local snapshot of 184 club listings, with club detail pages and available official links.
- Illustrative event cards and fictional networking profiles.
- Local bookmarks that persist on the device.
- An illustrated campus guide with building search and external directions.
- Official academic support links and a tutor placeholder.
- Responsive layouts for mobile and desktop browser previews.

This is a frontend prototype. There is no backend, authentication, Instagram scraper, live event feed, messaging, tutor verification, or location tracking. Events and people are sample content. The map is an illustration, not a verified navigation map. Students’ Union approval is pending; no endorsement is claimed.

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
