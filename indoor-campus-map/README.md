# Indoor campus map prototype

An independently runnable, mobile-responsive campus explorer. In the Everything-Laurier repository it lives in `indoor-campus-map/` on `feature/indoor-campus-map`, with its own packages and checks. It has not been connected to the main Expo app or deployed.

## Run

From this folder, with Node.js 22.12 or newer:

```sh
npm ci
npm run dev
```

Open http://localhost:5174. This port is independent of the main app's 8081 preview. Location works on localhost; testing location from a phone on the local network requires an HTTPS origin. No account, API key, environment file, or backend is required.

```sh
npm run check
npm test
npm run build
```

## Included

- Real OpenStreetMap building footprints, pedestrian paths, and 31 campus places, including Conrad Hall Residence, with academic, residence, food, student-life, and athletics filters.
- Three.js campus rendering, building picking, animated entry into Bricker, Lazaridis, the library, Science, Arts/Concourse, Peters, Schlegel, and DAWB, pan/zoom, rotation controls, and 2D/3D perspectives.
- Floors 1–3 for Bricker and Lazaridis, Floors 1–7 for the library, and the supplied Science Floor 1, manually traced from the supplied plans, with coloured rooms, stair and elevator markers where shown, and original-plan comparison.
- A single-floor cutaway by default, plus an optional separated floor stack. Stair and elevator cores use a shared coordinate frame.
- Search across named buildings and rooms; select rooms or markers directly on the map.
- Draft shortest routes within a building, including floor changes and a preference that excludes stair transitions. The four outer auditorium stair markers in Bricker have no verified corridor connections and are excluded from routing.
- Outdoor pedestrian route previews between campus places, including mapped campus service lanes without OSM pedestrian restrictions, while excluding main road-centre segments. Building access points are taken from OSM where available. Missing pedestrian connections produce a clear error and an external-directions option.
- **Find a room** and **Around campus** direction sections, with an indoor building chooser and campus-wide building/place endpoints. Switching to campus directions from inside preselects that building as the start.
- **Your location** is available in both endpoint lists. Outdoors, live browser GPS supplies a blue dot and accuracy radius; device compass readings supply the facing cone. **Centre**, **Follow**, and **Heading** control the camera. Location-based directions update as you move. Indoors, select a room and choose **Set as your location** to place a manual blue dot; GPS does not identify indoor rooms. Denied, failed, stale and off-campus fixes have clear feedback. Location stays in memory and is neither sent to a backend nor saved.
- Shareable building/floor/room URLs, reduced-motion support, keyboard controls, and a source-plan fallback if WebGL is unavailable.

## Accuracy and coverage

This is a functional visual prototype, not a surveyed navigation system. Room polygons and corridors are simplified hand traces; room labels are retained where legible. Unreadable small offices use a generic label. Decorative landscaping, heights, and interior elevations are illustrative. Do not infer walking distances from the indoor drawing units.

Door positions, stair continuity, lift service, entrances, opening hours, and accessibility need a campus survey. Prefer-elevator routing does not certify a step-free route. The supplied Lazaridis second-floor sheet also contains an LH3094 conference annotation; the Floor 2 oval theatre is preserved as an unverified landmark and excluded from routing, while LH3094 is available on Floor 3. The library opens on its Floor 2 main entrance. Known staff areas are reference landmarks and excluded from routing. Other floors are deliberately unavailable until plans are supplied.

The source-plan viewer preserves the supplied drawings so this model can be compared and corrected. Original attachments are unchanged; reference copies and cropped floor images are bundled under `public/blueprints/`.

## Structure

- `src/MapScene.ts`: map rendering, picking, camera animation, and projected labels.
- `src/App.tsx`: independent explorer UI, search, location, directions, and floor controls.
- `src/routing.ts`: corridor graphs, connectors, and shortest-path routing.
- `src/data/indoors.json`: fourteen manually traced indoor floor models, including library shelves, seating, study tables, and service counters.
- `src/data/new-indoors.json`: fourteen additional photographed floor models, stored independently of the earlier maps.
- `src/data/indoor-connections.json`: source-supported door pairs linking Arts/Peters/Schlegel and, separately, Science/Bricker. DAWB is isolated.
- `scripts/prepare-new-floorplans.py`: photo assignments, room/corridor traces, shaft registration, source gallery, and comparison crops.
- `tests/connected-routing.test.ts`: connected-building routes, floor offsets, reference-only exclusions, and checks against paths crossing enclosed rooms or voids.
- `src/data/campus.json`: reduced OpenStreetMap snapshot and pedestrian network.
- `scripts/prepare-blueprints.py`: trace definitions and reference-asset preparation.
- `scripts/refine-maps.py`: registered pixel traces for Lazaridis Floors 2–3 and all seven library floors; invoked by the base blueprint script.
- `scripts/prepare-campus.py`: OpenStreetMap snapshot reduction.
- `scripts/prepare-science-map.py`: Science room polygons, entrances, stairwells, courtyard cutouts, and traced corridors; also invoked by the base blueprint workflow.
- `tests/routing.test.ts`: route continuity, elevator-only routes, disconnected inputs, and source coverage.

Model and routing data are separate from rendering so they can later be moved into the approved native app architecture. Native device integration has not been implemented or tested. The prototype's package files, dependencies, location handling, and preview server remain separate.

## Sources

- [Laurier’s interactive campus map](https://map.concept3d.com/?id=638), compared with [Google Maps around Peters](https://www.google.com/maps/search/?api=1&query=Frank+C.+Peters+Building+Wilfrid+Laurier+University), October 11, 2026.
- [Laurier Library’s exterior campus description](https://www.library.wlu.ca/index.php/locations/waterloo/description-exterior-waterloo-campus-library) confirms Library west of DAWB and south of the Peters/Schlegel/Arts C complex.
- [Laurier’s accessibility timeline](https://www.wlu.ca/about/discover-laurier/accessibility/assets/resources/accessibility-timeline.html) describes the historical Arts C/Peters door/ramp and elevator connections; it does not establish current access.

- User-supplied `proper bricker.pdf`: PDF page 1 contains Floors 1 and 2; page 2 contains Floor 3.
- User-supplied `proper laz.pdf`: PDF pages 1–3 contain Floors 1–3.
- User-supplied library screenshots (Floors 1–7), matched to the native plan images from [Laurier Library](https://library.wlu.ca/locations/waterloo), retrieved October 4, 2026. Albert Street is the top/west edge of these plans; north points right.
- [Laurier's official campus maps](https://www.wlu.ca/about/campuses-and-locations/index.html).
- [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), snapshot retrieved October 4, 2026 via the public OSM map API. Outdoor geometry is ODbL data; see [data attribution](DATA-LICENSE.md).

See [development boundaries and later integration](../../docs/indoor-campus-map.md).

## Science map and readable reference

Open http://localhost:5174/#building=SCI&floor=1 for the Science 3D cutaway. Science also opens from the campus building list. The supplied floor includes 88 room/landmark shapes: 78 source labels, two atrium entrance vestibules, the Bricker building connection, and seven stairwells. Directions follow the traced corridors from each entrance to rooms with legible labels and sufficiently clear access. Uncertain labels, unclear suite doors, and three outer theatre stairwells remain visible reference landmarks and are excluded from directions. No elevator or additional floor is invented. The Bricker connection is an endpoint, not a route between the two indoor coordinate systems.

Open http://localhost:5174/science-review.html for the independently rendered Science floor plan. It contains 54 visually read labels, 24 tentative readings, room search, zoom, pan, original/typed comparison, and a downloadable SVG. Tentative readings use amber question marks on the drawing and remain explicitly tentative in the room list. Areas without a recovered label retain the original annotation.

Both views derive from the user-supplied 2015 conference plan (page 47); current geometry and access need verification. The original PDF is preserved. Positions and readings are recorded in `public/blueprints/science/labels.json`; rebuild the readable reference with `scripts/prepare-science-review.py` and the supplied PDF path, then rebuild the indoor model with `scripts/prepare-science-map.py`. The generators use Pillow and pypdf. All changes remain in this isolated prototype; the main application is unchanged.

Current classroom identifiers were cross-checked against [Laurier's classroom directory](https://students.wlu.ca/campus-services/classrooms-and-spaces/classrooms/index.html), which cannot validate historical geometry or every office identifier.


## New photographed floorplans

The 22 photos in `NEW FLOORPLANS` add 14 floors, bringing the prototype to 28 mapped floors across eight indoor views. The existing floor selector, 2D/3D cutaway, stacked view, room search, source comparison, and route planner are retained. Peters and Schlegel are treated as connected wings of one complex, with their source names retained in the room selector and route steps. Arts A/C/E opens the same Arts & Concourse model from each corresponding campus footprint. Fred Nichols remains a separate campus place; its interior was not supplied.

| Source photo(s) | Assigned plan |
| --- | --- |
| IMG_1451–1457 | Arts Floor 1, Concourse and adjoining context |
| IMG_1458 | Arts Floor 2, with the Peters Floor 1 pathway |
| IMG_1459 | Arts Floor 3, confirmed by you |
| IMG_1460 | Peters Floor 1 / Main Floor |
| IMG_1461 / 1462 / 1463 | Schlegel Floors 1 / 2 / 3, from SB1xx / SB2xx / SB3xx |
| IMG_1464–1466 | Peters Floor 2, overlapping views |
| IMG_1467 | Peters Floor 3 |
| IMG_1468 / 1469 | DAWB Floors 1 / 2, from AW1 / AW2 labels |
| IMG_1470 / 1471 / 1472 | DAWB Floors 3 / 4 / 5 |

Your clarification repeated IMG_1469 for two levels; IMG_1468's printed AW1 labels resolve the first-floor assignment. The photo gallery at http://localhost:5174/floorplan-sources.html preserves every original view, with the assignment recorded in `public/blueprints/new-floorplans/manifest.json`. Blueprint crops and full photo copies are local assets; the original HEIC files are unchanged.

Directions join Arts Floor 2 ↔ Peters Floor 1, Peters ↔ Schlegel on supplied Floors 1–3, and Science Floor 1 ↔ Bricker Floor 1. DAWB is excluded from indoor links following the user's correction. The map toolbar offers **Connected** and **Individual** views; the individual view uses the source drawing without geographic rotation. The view choice is preserved in the URL (`view=individual`). Directions remain available across each connected group; in individual mode the displayed route is limited to the focused building, with route steps opening the next building.

Connected views use approximate campus registration, source floor numbers and a common geographic bearing. Peters, Science and Bricker use angle-preserving transformations to avoid sheared rooms and corridors. Dashed portal links indicate an unsurveyed passage; they do not certify current access or step-free continuity.

Some office suites and unclear doorways remain visible reference landmarks and are excluded from routing. DAWB Floor 5 retains the printed room functions without invented room numbers. Peters/Schlegel Level 0 appears only as context on the Arts Floor 1 sign, so no Level 0 interior is created. Room polygons are simplified photo traces in drawing units. Registration uses the elevator shaft; camera perspective and unsurveyed dimensions limit exact vertical correspondence of other features.

Classroom names were checked against [Laurier's official classroom directory](https://students.wlu.ca/campus-services/classrooms-and-spaces/classrooms/index.html), with building context from [Laurier's campus maps](https://www.wlu.ca/about/campuses-and-locations/index.html). These sources do not validate every office or doorway in historical photographs.

The shared display aligns Arts 2 with Peters/Schlegel 1, and Arts 3 with Peters/Schlegel 2. DAWB stays in its individual view. Peters and Schlegel therefore sit one display level above the corresponding Arts floor number. Each label and blueprint retains its original building and floor number; the right-hand selector controls the focused building. A wing without a supplied floor at the current level appears as a faded reference outline labelled above/below; no Level 0 or additional interior is invented. `src/connected-layout.ts` applies per-floor registration for display and converts local edge lengths into approximate metres for routing. Local traces retain their original coordinates and source identifiers.


## Campus registration and fastest-route estimates

`python scripts/register-connected-floorplans.py` derives `src/data/indoor-registration.json` and the visual overlay `docs/registration-overlay.png`. It matches identifiable photo perimeter landmarks, Schlegel/Peters passage ends, and elevator anchors to the existing georeferenced OSM campus footprint snapshot. Each building's first elevator stays fixed across floors. An affine transform compensates approximately for scale and camera perspective; all wings then share the same global view rotation, with a working north arrow. Residual landmark disagreements can exceed 20 m after preserving source angles, so the registration must not be used as surveyed positioning. These are interpreted registrations, not survey accuracy or Google indoor positioning. The other four indoor models use an approximate scale derived from footprint area. Source photos remain available for comparison.

Your walking description places the Schlegel connection at the wide hallway in the bottom-left of IMG_1460, matching IMG_1461. The Arts arrival is beside the Peters elevator/south stair and P107, labelled **P107 · Service Laurier**. The upper Peters-to-Schlegel passages now use the corresponding elevator-side corridor stubs, avoiding the former route through the far office wing. Door positions remain approximate. Small corridor diagonals are included only where the photo shows open yellow circulation space; obstacle tests reject edges that cross enclosed rooms or courtyard holes.

Routing minimizes estimated travel time across the supported graph. Walking is estimated at 1.3 m/s, stairs at 20 seconds per floor, elevator travel at 6 seconds per floor, elevator boarding/waiting at 25 seconds once per continuous ride, and connecting doors at 2 seconds plus an approximate gap walk. Dijkstra keeps separate elevator-arrival states so a faster multi-floor ride is not discarded or charged repeated boarding waits. These are prototype assumptions, with no live elevator wait, congestion, opening-hours, or access data. “Prefer elevators” excludes stairs; it does not certify accessibility. The route UI rounds estimates up to minutes.

Corridor polylines now split at interior crossings as well as shared endpoints. Outdoor routes snap to the middle of eligible pedestrian segments and split both origin/destination projections together; this removes endpoint detours, excludes road-only edges, and excludes stair edges when requested. An outdoor route starts/ends on the nearest mapped pedestrian path; no unsurveyed straight walk through a building is invented.


## Outdoor directions update — October 12, 2026

The OSM API snapshot is stored in `source-data/campus-2026-10-12.osm`; regenerate geometry with `scripts/prepare-campus.py`. Mapped service lanes with permitted pedestrian access are visible and eligible, while private/foot-prohibited lanes and road-only segments remain excluded. The graph preserves OSM junction IDs, avoiding fabricated crossings between paths at different levels. Building endpoints use OSM entrance tags or mapped pedestrian access points on footprint boundaries where available; otherwise directions begin/end at the nearest mapped path. Nearby competing snaps are evaluated by total travel time. The Library main entrance → Athletic Complex mapped access point route is approximately 544 m / about 8 minutes, compared with approximately 759 m before the campus lanes were included. Distances and times remain estimates, not live closure or access information.


## Visible travel-time estimates

Every calculated indoor or outdoor route shows a prominent **Estimated travel time** card in directions and a matching badge on the map. The directions panel scrolls to the result after calculation. Labels distinguish walking, walking with stairs, and walking with an elevator; the panel also shows approximate distance. Estimates come from the same time costs used to choose the fastest mapped route and are rounded up to whole minutes. They include walking, stair transitions and one assumed boarding wait per continuous elevator ride. They do not use live access or queue information. Changing endpoints clears the old result; applying or clearing filters immediately recalculates an existing route and its estimate.

## Directions sections and location endpoints

Use **Find a room** to select any mapped indoor building and route to a room, including rooms in its connected group. Use **Around campus** for building-to-building or other outdoor walks. Both sections are available from every map. On phones, direction controls appear above the map.

Choose **Your location** in either From or To. For campus routes, allow the browser location request, wait for a fresh fix, then choose **Show route**. GPS follows your movement and automatically updates an existing location-based route after meaningful movement (5–15 m, accounting for reported accuracy). Indoors, close directions, select your current room, and choose **Set as your location**; this manual location can then be used in either endpoint. A room location is usable only within its connected indoor group. Swapping endpoints preserves the chosen location.

## Live GPS and heading

Use **Centre** for one-time recentring, **Follow** for continuous north-up GPS tracking, or **Heading** for a map that turns with your physical compass. A blue dot and accuracy circle show the location; the blue facing cone appears only with a valid compass reading. Panning switches to browsing while GPS remains live. **Stop live GPS** removes the dot and stops both sensor feeds. Hidden pages and indoor maps stop the outdoor sensor feeds; returning from a hidden page resumes an existing session, while returning from an indoor map requires starting GPS again.

GPS uses one `watchPosition` subscription; compass uses absolute device orientation or Safari's compass heading, including screen rotation. GPS travel course and relative device rotation are never used as facing direction. Freshness limits hide fixes older than 30 seconds and compass readings older than 5 seconds. Missing compass falls back to north-up GPS follow with a visible explanation. A location-based route retained during signal loss is explicitly marked as based on the last fix. Campus routes still require a fix inside this map's coverage.

Location and orientation require a compatible device/browser, permission, and a secure context (HTTPS or localhost). Ordinary HTTP over a phone's LAN address cannot provide the same sensor support. No location history is persisted or uploaded by this prototype. Physical GPS/compass performance still needs an outdoor phone test. The browser indicator is rendered by Three.js; the separate [SwiftUI/MapKit component](ios/LiveGPSMapView.swift) uses Apple's native user annotation. See [iOS integration instructions](ios/README.md). That component is prepared and Swift type checked, but is not installed in a separate Xcode app target.

The Vite-only [sensor integration fixture](tests/fixtures/live-gps.html) is clearly labelled **SIMULATED GPS & COMPASS — TEST ONLY**, uses injected sensor data, and is not an entry point of the production build. It checks the real map/UI without replacing browser APIs or granting real permissions. References: [live geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition), [orientation permission](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static).

## Indoor-preferred campus walks and Conrad

In **Around campus**, choose From and To, then **Show route**. The default **Fastest route** compares eligible outdoor paths, mapped entrances and supported indoor links by estimated total time. It does not require an indoor/outdoor choice. Open **Filters** to apply **Prefer indoor paths** or **Avoid stairs**. Indoor preference minimizes outdoor walking before total time and follows the confirmed Music underpass passage. **Clear filters** restores the fastest route. Room directions offer **Prefer elevators** under the same Filters control.

The router compares all eligible mapped entrances rather than forcing a main door. Intermediate indoor transfers include estimated approach time when choosing the entrance and summing the journey; building endpoints can start or finish at a mapped entrance. Unchanged outdoor legs are cached across reversed trips and endpoint changes. Schlegel → Athletics now defaults to a mixed walk through Arts C and Concourse: approximately 473 m / 391 seconds, displayed as **About 7 min**, versus 441 seconds / **About 8 min** for the previous outdoor-only default. Library → Athletics remains the direct approximately 544 m / **About 8 min** outdoor route. These are model estimates, not measured walking times.

The supported building sequence for Schlegel → Athletics is Schlegel → Peters → Arts C → Concourse/Arts E → John Aird/Music, followed by the bridgeway exit toward the parking lots and the mapped outdoor path to Athletics. This sequence and exit description come from the user's walking directions. [Laurier identifies Concourse as Arts E](https://wlu.ca/campus-status/building-hours.html); [its historical music-building notice identifies the west underpass entrance](https://www.wlu.ca/campus-status/notices/2023/may/main-floor-hallway-closure-at-john-aird-building-monday-may-15-to-august-31-2023.html). The approximate exit is matched to existing OSM entrance node 5035209106. The historical notice is location context, not a statement about current access or closures. Science/Bricker's supported indoor link is also available in this preference. DAWB remains outside all indoor links.

Blue dashed lines are a building-level connection overview, distinct from solid purple outdoor path traces. New Music corridor geometry has not been surveyed or traced; no new room/floor plan is invented. Indoor overview distances use OSM footprint-centre gaps and approximate indoor access gaps, with walking at 1.3 m/s and the existing Arts floor-change assumptions. The Schlegel → Athletics example is roughly 607 m total / 301 m outdoors / 9 minutes, with a rough indoor time estimate. Avoid-stairs preference excludes mapped outdoor steps and selects the Arts elevator estimate; it cannot establish step-free continuity inside untraced corridors.

Conrad was omitted because its footprint is OSM multipolygon relation 1584007 rather than a tagged way. The importer now includes its real outer ring and courtyard, mapped outdoor access points, map label, residence search/filter entry, and both direction endpoint lists. [Laurier's residence directory identifies Clara Conrad Hall](https://students.wlu.ca/campus-services/residence-and-off-campus-housing/residence/buildings/index.html). Its indoor room plans remain unavailable.


### Floor and food refinements · October 13

User-confirmed Lazaridis corrections: Floor 1 south lounge is Byte 75 restaurant; Floor 2 south lecture rooms are 2066, 2068 and 2070 from west to east; Floor 3 west curved area is an open hallway with the lounge furniture removed. Source generators preserve these corrections.

Click Starbucks or Byte 75 in the campus list/search to open their identified space on the supplied indoor plan. Tim Hortons highlights Science Building and offers its indoor map; the supplied plan does not identify the counter, so no precise indoor pin is invented. Campus food directions use host-building entrances and identify the result as building access. Selected map labels have priority and leader lines when moved to avoid nearby labels. Indoor framing reserves room for floor controls.

The user confirmed the indoor connecting passage through the Solarium between Concourse, Dining Hall and John Aird/Music. Supported campus links now include Dining Hall, with Solarium instructions in both directions. These remain building-level overview links, not newly surveyed corridor geometry; DAWB remains separate.


Campus street names are plain text aligned to the mapped road direction, with a light halo for readability. Ezra, Bricker and other named nearby streets are available as you pan and zoom. Street labels have no bubbles or leader lines, and indoor building names have no decorative bullet dots.
