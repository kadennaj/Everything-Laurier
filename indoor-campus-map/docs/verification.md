# Prototype verification

Verification history. Latest check: October 12, 2026. Earlier dated sections describe previous prototype behavior.

## Automated checks

- TypeScript: passed.
- ESLint: passed.
- Production build: passed. The current Three.js/data bundle is approximately 345 KB compressed; Vite reports its expected uncompressed chunk-size warning. Further renderer loading optimisation is appropriate before native integration or production release.
- Routing suite: 20 tests passed, including reachability of mapped destinations, elevator-only floor transitions, connector alignment, door boundaries, excluded unverified stairs, malformed/disconnected inputs, source-plan coverage, and a Lazaridis-to-Bricker pedestrian path.

## Browser flow verification

Chrome was checked at desktop size and a 390 × 844 mobile viewport with no uncaught runtime errors or horizontal page overflow:

- Campus entry and all three indoor building transitions.
- All thirteen floors; 2D and 3D perspectives; stacked and single-floor views.
- Room search, deep-linked floor/room selection, and manual start/destination choices.
- An outdoor Lazaridis-to-Bricker route and an indoor Bricker entrance-to-Floor-3 route via elevators.
- Library defaults to its Floor 2 main entrance; its entrance-to-Floor-7 group-study route uses five aligned elevator transitions.
- Lazaridis Floors 2–3 were retraced from the source pixel layouts, preserving the curved west wing, atrium cutout and oval theatre.
- Seven-floor controls and zoom tools were checked for pointer accessibility without overlapping each other.
- Mismatched room/floor URLs drop the stale room selection; changing floors clears the selection.
- Original blueprint images and dialog closing.
- Simulated outdoor location with a visible accuracy state, permission denial, an off-campus location, and a blue accuracy marker outdoors, and a manually placed indoor blue dot that is shown only on its assigned floor or in stacked view.
- Reduced-motion building entry.
- WebGL failure fallback with a working source-plan viewer.

These are browser and data-structure checks, not campus surveys. Actual phone GPS, native iOS/Android embedding, real room access, elevator service, and accessibility have not been validated.

## Science addition

The Science addition passed TypeScript, ESLint, all 25 routing tests, and a production build. The new tests cover all three entrance points, seven stairwells, exclusion of uncertain identifiers, and routes from every entrance to every routable Science destination without crossing another enclosed room. Only the supplied Floor 1 is offered; there is no invented elevator or upper-floor route.

The in-app browser verified Science entry from the campus list, room search for N1042, a route from Atrium entrance A to N1042 with its visible corridor highlight, and the 3D entrance/stairwell markers. It also verified a route to the end-wing stairwell and a manual blue starting dot at Atrium entrance A. The readable source page links directly to the Science indoor map. See `preview-science.png` for the final view. Previous browser checks above describe the earlier thirteen-floor coverage.

The original main checkout remained clean on `main` at `22267c132be9f3a09bcf8bb993d47301021c4fa9`. All prototype changes are isolated in `feature/indoor-campus-map`.


### October 11, 2026 — connected photographed floors

Added Arts/Concourse (3 floors), Peters (3), Schlegel (3), and DAWB (5), retaining all 22 source photographs and the original 14 floor models. New tests check all public destination reachability, source existence, globally unique IDs, door boundaries, aligned elevator shafts, routes across all four connected areas, and absence of walking edges crossing unrelated enclosed rooms or courtyard voids. Unconfirmed connections and reference-only destinations fail cleanly. Cross-building edges use named portal pairs rather than arbitrary coordinate proximity.

The user confirmed Arts Floor 3 and DAWB Floors 1–5 and clarified the connected wings/pathways. The repeated IMG_1469 in their answer was resolved using IMG_1468's AW1 labels. Public room labels were compared with Laurier's classroom directory. Precise survey geometry, current door access, elevator operation, and accessibility have not been established.


Final validation: `npm run check`, `npm test` (37 passed), and `npm run build` all passed. Vite retains the expected large-chunk warning for the Three.js/data bundle (approximately 374 KB compressed). In-app browser checks confirmed DAWB 2-105 → SB203 through DAWB, Arts/Concourse, Peters, and Schlegel with elevator preference; route retention when a step opens Schlegel Floor 2; the three-floor Schlegel stack; a loaded Schlegel Floor 3 comparison image and original photo link; all 22 photo-gallery entries; and no horizontal overflow at 390 × 844. The wider new plans reserve camera space for the existing floor and zoom controls. No browser errors were recorded during the final Arts view.

The final Arts/Concourse view and connected-building controls are saved in `preview-connected-campus.jpg`. Local preview: http://localhost:5174/#building=ARTS&floor=1. Photo gallery: http://localhost:5174/floorplan-sources.html.

### October 11, 2026 — shared indoor canvas and building labels

Arts/Concourse, Peters, Schlegel and DAWB now render together on one persistent indoor canvas. Separate building labels and a Concourse label identify the wings; separate campus labels have leader lines to their mapped footprints. The focused building controls its original floor selector, room list and blueprint. The common display aligns Arts 2 with Peters/Schlegel 1 without renumbering source floors. Missing levels appear only as faded, labelled reference outlines. Wing placement, rotations and dashed links are schematic; source geometry and route costs remain local and unchanged.

The in-app browser checked Arts 2/Peters 1/Schlegel 1 together, Peters/Schlegel Floor 2 together with Arts 3, wing switching without leaving the shared view, selection of SB106 in the correct Schlegel floor/sidebar, flat and stacked modes, and an Arts → Peters → Schlegel route. All four campus labels were visually checked after spacing them apart. Checks, 40 tests and production build passed. Vite retains its existing large-chunk warning (approximately 376 KB gzip). Screenshots: `preview-campus-labels.jpg` and `preview-shared-interiors.jpg`.


## October 12: separate DAWB, optional groups, and shorter outdoor routes

Current behavior supersedes earlier references to a four-building indoor group. DAWB has no indoor connection edges and renders only its own source floors. Printed DAWB/Concourse markers are reference-only. Connected groups are Arts/Peters/Schlegel and Science/Bricker. Connected/Individual toolbar controls preserve source floor IDs and persist the view mode in the URL. Individual maps use source coordinates; cross-building route steps open the relevant building without losing the route. Science/Bricker Floor 1 portals are joined with a named connection, based on supplied plans and the user's confirmation.

Peters' former affine shear is replaced by an angle-preserving transformation with one bearing across its three floors and the original common elevator anchor. Science and Bricker also preserve drawing angles. Registration remains approximate, with residuals exceeding 20 m in some landmarks; dashed links are unsurveyed connecting passages, not measured corridors. Building badges are kept away from controls and other badges; controls wrap into a second row on smaller map panels. Zoom tools sit below the plan on narrow desktop panels to avoid covering the Arts wing.

Research: inspected [Laurier's official campus map](https://map.concept3d.com/?id=638), supplied floorplans, and a fresh public OSM API snapshot (`source-data/campus-2026-10-12.osm`). Permitted-in-OSM service lanes are now rendered and routable. Road-only/private/foot-prohibited segments stay excluded. Original OSM junction IDs are retained, avoiding invented same-level intersections. Building route anchors come from OSM entrance tags or mapped paths at footprint boundaries; nearby snap alternatives are evaluated by total travel time. The Library main entrance → Athletics Complex mapped access path route is 544.3 m / 423.9 estimated seconds (UI rounds up to ~8 min), versus 759.1 m with the old excluded-lane graph. Regression tests verify that every leg follows a supported segment. Outdoor steps no longer refer to “Floor 0.”

Final checks: `npm run check`, `npm test` (52 passed), and `npm run build` passed. Vite retains its existing large chunk warning (395 KB gzip). Browser verification covered both groups, source-aligned Peters individual view, DAWB isolation and label, the shorter Library → Athletics Complex route, and Science → Bricker Floor 3 with elevator preference and route retention while switching individual views. At 390 × 844, mode controls were accessible and document width equalled viewport width (390 px). Temporary viewport override was reset. No browser errors were recorded. Evidence: `preview-shorter-outdoor-route.png` and `preview-refined-connected-map.png`.


## October 12: prominent travel-time feature

Added a dedicated estimated-time card to directions, a persistent time badge on the route map, and a route-ready announcement containing the estimate. Destination names stay in a separate summary. Indoor and outdoor estimates use the existing fastest-route timing model, including walking, stairs and elevator boarding/transit; they are labelled approximate and rounded up to whole minutes. The results panel scrolls to the estimate when a route is calculated, respecting reduced-motion preferences. On narrow map panels, zoom controls move above the larger time badge so they do not overlap.

Verified in the browser: Library → Athletic Complex shows “About 8 min” in both locations (~544 m, walk + stairs); Science atrium → Bricker 316 with elevator preference shows “About 4 min” (~246 m, walk + elevator). At 390 × 844, the estimate remains visible on the map and document width stays 390 px. Desktop zoom controls and the badge have no overlap. Temporary viewport override was reset and no browser errors were recorded. `npm run check`, all 52 tests, and `npm run build` pass; the existing bundle warning remains. Screenshot: `preview-travel-time.png`.

## October 12: room/campus sections and Your location endpoints

Added persistent **Find a room** / **Around campus** controls. The room section has a chooser for all eight indoor maps, retaining connected-group routing. Switching from an indoor map to campus directions preselects that building as From. Both endpoint lists include **Your location**. Outdoors this requests a browser location snapshot with accuracy and a refresh/retry action; stale pending callbacks are discarded when the user changes scope. Indoors it resolves to a room explicitly marked **Set as your location**, within that room's connected group. Swapping endpoints retains the location. Existing estimates and fastest-path costs are preserved. Mobile direction controls now precede the map, with calculated results brought into view.

Browser checks covered the indoor building chooser; Library indoor → campus transition with Library preselected; Library → Athletics (~544 m, about 8 minutes); manual BA101 location → BA201 and its reverse with Your location as destination; outdoor location in both endpoint lists, acquisition feedback, failed acquisition/retry feedback, and endpoint swapping. An actual outdoor fix could not be obtained from this browser. Unit tests supply a known campus point to verify location routing in both directions, equal reverse travel times, missing-fix handling, main-entrance optimization and avoidance of stairs. No real device GPS accuracy was established.

At 390 × 844, the direction form appeared before the map, document width remained 390 px, and calculated travel time was visible. The temporary viewport override was reset. Final `npm run check`, all 56 tests, and `npm run build` passed; the existing Vite chunk-size warning remains (~396 KB gzip). The refreshed preview recorded no browser errors. Screenshot: `preview-directions-sections.png`.

## October 12: indoor-preferred campus routes and Conrad

Added **Stay indoors as much as possible** alongside **Fastest outdoor route** in campus directions. The new router combines supported indoor building links and existing OSM outdoor route legs. It minimizes outdoor distance before estimated total time, keeps walking estimates separate from that optimization score, supports both GPS endpoint directions and reversed routes, and rejects unsupported connection records. Outdoor legs preserve the existing pedestrian graph and stair preference. Indoor overview edges are dashed blue above the campus roofs, with building-sequence instructions; they are not corridor traces. Existing indoor room graphs and DAWB isolation remain unchanged.

The user's bridgeway clarification supplies Schlegel → Peters → Arts → Concourse → Music → outside toward the parking lots/Athletics. Laurier's building-hours page associates the Concourse with Arts E; its historical John Aird notice describes the west underpass entrance. The exit is approximately matched to existing OSM entrance node 5035209106, without claiming surveyed door placement or current access. Approximate Music corridor geometry and an indoor Dining Hall connection have not been invented. The Music/Concourse campus names are now explicit in the planner and map labels. The example route is roughly 607 m total, 301 m outdoors and 495 estimated seconds, displayed as about 9 minutes. Reverse instructions enter at the bridgeway and end in Schlegel. Indoor time is explicitly labelled rough, using footprint-centre distances and existing Arts level-change assumptions.

Conrad Hall Residence now imports OSM multipolygon relation 1584007 with its 30-node outer footprint and courtyard, two mapped access points, residence listing/search, visible campus label and From/To options. Laurier's residence directory identifies Clara Conrad Hall. No indoor residence floor plans were added.

Browser verification covered the preference switch clearing an old result; Schlegel → Athletics using the full indoor sequence and bridgeway exit; its reverse; the ~9-minute estimate; outdoor-only recalculation; Conrad as destination; and visible Concourse, Arts, Music, Athletics and Conrad labels. At 390 × 844 the preference control was 350 px wide and the document remained 390 px wide. The viewport override was reset. Final checks, all 62 tests and production build passed, retaining the existing large-chunk warning (~399 KB gzip). Final preview recorded no browser errors. Screenshot: `preview-indoor-preferred-route.png`.

## October 12: fastest mixed routes and optional filters

Replaced the required campus preference selector with a default fastest search across eligible outdoor paths, all mapped entrances, and supported indoor connections. Optional Filters contain Prefer indoor paths and Avoid stairs; indoor room directions expose Prefer elevators there too. Applying or clearing filters immediately recalculates an existing route. The planner evaluates main and other mapped entrances, includes approximate indoor approaches when choosing intermediate transfer entrances, and retains a direct outdoor candidate. Music underpass instructions are used only when that mapped exit is selected; indoor preference retains the user's confirmed underpass passage. Pairwise leg caching now reuses unaffected calculations across endpoints and reversed trips.

Browser checks: Schlegel → Athletics defaults to approximately 473 m / 391 seconds / About 7 min through Arts C and Concourse, improving the old outdoor-only 441-second estimate. Prefer indoor paths recalculates to the full Schlegel → Peters → Arts → Concourse → Music → bridgeway route, About 9 min. Avoid stairs removes outdoor-step instructions and substitutes the Arts elevator; Clear filters immediately restores About 7 min. Library → Athletics stays direct at approximately 544 m / About 8 min. No current access, precise indoor placement or accessibility certification is inferred from these overview paths.

At 390 × 844 the optional filter panel is 350 px wide, the document remains 390 px wide, and the controls and time card are readable. The viewport override was reset. Type checking, lint, all 65 tests and production build passed; the existing Vite bundle warning remains (~399 KB gzip). Tests cover faster indoor shortcuts, rejecting slower indoor routes by default, entrance approach costs, main-versus-other entrance selection, reverse consistency, estimate/edge-cost agreement, preserving the Library route, unsupported links and existing GPS/stair handling. Browser console has no errors. Screenshot: `preview-fastest-filters.png`.

## October 13: live GPS, physical heading and tracking controls

Replaced the outdoor snapshot request with one live geolocation watch and lifecycle-managed compass listeners. Center performs a single recenter; Follow keeps the camera on the location with north up; Heading follows the device compass and rotates the map. Panning switches to browsing while the GPS feed stays live. Stop removes the marker and sensor subscriptions. Hidden pages pause tracking and resume an existing session on return; indoor maps stop outdoor tracking and retain their explicit manual positioning. Expired GPS fixes (30 seconds) and headings (5 seconds) are hidden rather than presented as current. Missing compass falls back to north-up GPS follow. Relative rotation and GPS travel course are not used as physical compass headings. Screen rotation/tilt are accounted for in absolute-orientation readings.

The renderer updates a separate blue-dot/accuracy-circle/cone overlay for sensor updates instead of rebuilding campus meshes. Camera animation preserves its target zoom when the first compass reading arrives during GPS recentering. Location-based directions recalculate after meaningful movement while retaining filters; pairwise outdoor caching invalidates only legs that depend on the moving GPS endpoint. A route retained while GPS is off or stale is explicitly marked as using the last location. Coordinates and compass readings stay in memory.

Browser integration uses the clearly labelled `tests/fixtures/live-gps.html` with injected simulated sensors, not altered browser APIs or real permission grants. Verified: blue dot/accuracy halo, north/east cone changes, 90-degree heading-follow map rotation (north needle −90°), center/follow/browse transitions, GPS continuing after a pan, stop removing the marker, and indoor maps hiding outdoor controls. Simulated Library → Athletics directions begin at approximately 544 m / About 8 min and automatically drop to approximately 0 m / About 1 min when the fixture moves to the destination, without another Show route click. Losing compass removes the cone after its freshness limit and returns the heading-follow camera to north up. At 390 × 844, controls are about 206 px wide and document width is 390 px; viewport override was reset. Actual desktop startup shows acquisition/compass-availability feedback; no physical GPS fix or real compass accuracy is claimed. Screenshots: `preview-live-gps-controls.png` and `preview-live-gps-simulated.png` (explicitly simulated).

Prepared `ios/LiveGPSMapView.swift` for iOS 17+ with a SwiftUI wrapper around MKMapView, native showsUserLocation blue dot and followWithHeading compass indicator, tracking controls, When In Use authorization, gesture mode synchronization, and inactive/dismantled cleanup. This file and its Info.plist setup instructions remain in this standalone project; no separate iOS app target has been modified. Apple's current SDK headers confirm there is no public MKUserLocationView.showsHeading switch; the component uses public tracking APIs and the default native annotation. Swift 6 type checking against the installed iOS SDK succeeds. An outdoor compass-equipped phone test and integration into the chosen app target remain unverified.

Final TypeScript checking, lint, all 72 tests and production build pass. New tests cover shared-watch lifecycle, moving fixes, late callback cleanup, delayed compass-permission races, denied/unavailable sensors, rejection of old/malformed fixes, physical-versus-relative heading, north wrap, screen rotation and landscape tilt. The existing Vite large-chunk warning remains (~402 KB gzip). Browser error logs are empty.


## October 13 · Lazaridis and food-location refinements

Applied the user's Byte 75 Floor 1 correction, west-to-east lecture numbering 2066/2068/2070 on Floor 2, and open west hallway on Floor 3. Removed the west lounge benches/tables. Updated source generators and kept existing stable room IDs where possible. Food and hallway types replace misleading study-space categories.

Starbucks uses the existing traced ARTS1-starbucks location on Arts/Concourse Floor 1. Byte 75 uses the user-identified Floor 1 south space. Tim Hortons locates/highlights Science Building without fabricating a counter position. Fixed pending room selection across Arts campus-wing aliases so opening Starbucks retains the correct highlighted room. Campus food directions now use the host building's mapped access paths, with endpoint labels explicitly indicating building access. Same-building food journeys explain that the indoor map is needed.

Added user-confirmed Dining Hall–Concourse and Dining Hall–Music indoor topology via the Solarium, plus named passage instructions. Dining Hall now receives a campus-map label. Existing Music/Concourse link also names the passage. All links are a building-level overview; no Music/Dining Hall floor or precise corridor trace has been invented. DAWB stays outside indoor links.

Regression checks cover corrected destinations remaining reachable, food locators resolving to supplied plan rooms, food directions matching host-building access routes, Dining Hall indoor links in both directions and continued DAWB isolation. Browser checks cover food list clicks and search, selected labels staying visible, all three Floor 2 lecture numbers in order, and Floor 3's cleared hallway. Saved preview-byte75-location.png and preview-starbucks-location.png.

Final validation: `npm run check`, all 75 tests, and `npm run build` passed. Browser console contained no errors. Confirmed live UI directions Library → Tim Hortons end at Science Building access, and Dining Hall → Music uses the named Solarium passage (0 m outdoors, rough estimate about 1 min). The existing production bundle size warning remains.


## October 13 · Street readability and Canadian spelling

Street labels use 12 px bold type (previously 8 px), dark text, opaque pale backgrounds and normal title case. Each named street uses candidates from all its mapped OSM road segments, so an off-screen first segment no longer loses the street name. Labels select a visible segment and avoid controls/building names; small leader lines keep displaced labels anchored to the road. Increased street-label priority. All five named streets were visible in the campus overview in both 3D and 2D.

Visible GPS control wording and accessibility labels use Centre, including the prepared native SwiftUI component. Public framework APIs, CSS keywords and internal coordinate properties retain their required spelling. Updated README wording. `npm run check`, all 75 tests and `npm run build` passed; existing bundle-size warning remains. Browser console had no errors. Screenshot: preview-readable-streets.png.


## October 13 · Street names directly on roads

Replaced street bubbles and label leaders with plain, transparent street text and a white text halo. Labels rotate with the projected direction of mapped road segments, remain upright as the camera turns, and avoid overlapping controls and higher-priority labels. Names stay on the road rather than being moved to off-road callouts.

All named streets in the existing OSM road data are eligible, including Ezra Avenue, Bricker Avenue, Seagram Drive, Regina Street North and nearby streets. Intersection/bus-link names containing slash separators are excluded. Main campus streets receive priority and a consistent placement order. Removed the decorative purple dot before indoor building labels; their names remain unchanged.

Browser checks confirmed Ezra and Bricker on their actual roads with transparent backgrounds, street text following map rotation, plain names in 2D/3D, and no building-name pseudo-element dots. `npm run check`, all 75 tests and production build passed; the existing bundle-size warning remains. No browser console errors. Screenshot: preview-streets-along-roads.png.
