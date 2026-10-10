# Everything Laurier — full App Store submission audit

Audit date: October 10, 2026. Status: **not ready to submit**. This is an evidence-based source/configuration audit; it does not certify legal compliance or predict Apple's review decision. Backend moderation safeguards and the public Sites website are deployed; both custom domains have active HTTPS, app release checks verify all public links, and an arm64 native Simulator Release build succeeded. Native runtime and signed distribution verification remain incomplete. Recheck the final signed archive and App Store Connect record after implementation.

## Scope and evidence

Reviewed `app.json`, `app.config.js`, package dependencies, iOS target configuration, route/component/library source, Supabase schema/functions, and the existing Section 5 audit. No private user data or secrets were inspected. No account, DNS, deployment, or database mutation was performed by this audit.

App inventory: native React Native campus directory/search, an illustrated building guide, local bookmarks, venue/nightlife information, imported Instagram posts, email-code authentication, optional public student profiles, anonymous venue line aggregates, account deletion, and privacy controls. No payments, ads, tracking, social-provider login, health measurement, gambling, messaging backend, camera, microphone, device location, contacts, or Bluetooth feature was found. Email contact opens the user's external email app.

Owner confirms there is no Apple Developer membership or App Store Connect account yet and commits to monitoring public Gmail/moderation reports. Owner asserts that the school approved the app. Approval documentation, its scope, brand conditions, seller identity, and venue/Instagram permissions were not examined. Public support/privacy contact authorized by the owner: `everythinglaurier@gmail.com`. School approval does not establish permission for every venue's images or third-party service.

Evidence shorthand used below:

- **A**: Expo configuration, `ios/EverythingLaurier`, native project, dependencies.
- **B**: campus directory, content, map and support routes/components.
- **C**: student profile editor/directory, schema and auth.
- **D**: Instagram feed UI/sync/schema and nightlife content.
- **E**: deletion UI/backend/schema, privacy screen and prior Section 5 verification.
- **F**: App Store Connect, developer membership, signing, rights and operator processes; not inspected.

Status meanings: **Pass (source)** = relevant current implementation appears consistent within inspected scope; **Gap** = concrete missing implementation/content; **Unverified** = evidence or external action is missing; **N/A** = triggering feature absent; **Omitted** = Apple intentionally leaves that number unused. Parent rows aggregate their children. Shared rows enumerate every covered child; unnumbered bullets are named explicitly.

## Release blockers and actions

1. UGC operations: private reports, bilateral student blocks, personal post/venue hiding, public contact and operator removal controls are deployed. Student profiles retain pending review. At the owner’s request on October 10, selected venue posts publish automatically with source/URL validation, without human approval or AI screening. Source validation does not detect objectionable captions/images: guideline 1.2 content filtering is an unresolved release gap. Verification badges do not prove content safety or redistribution rights. Confirm native flows, inspect media/rights and demonstrate timely responses/removals.
2. Final content: fictional events/profiles removed; legacy person links redirect to the real directory. Campus events currently have a real empty state and official calendar link rather than invented listings. Preview marketing removed; illustrated map still correctly disclaims scale/room precision. Tutoring support now opens a real official academic-support destination (HTTP 200 verified); verify remaining external URLs before release.
3. Privacy/support/community pages are publicly deployed on Sites and independently returned HTTP 200. Both everythinglaurier.ca and www.everythinglaurier.ca have active DNS/HTTPS. The production release check verified privacy, support and community pages and their public contact. App Store Connect does not exist yet, so its privacy/support fields remain incomplete. Verify operator/provider practices and preserve domain email records.
4. Obtain and retain venue/media/service authorization. Preserve licensed campus-photo attribution and comply with the photo's license. Owner-reported school approval remains an assertion until relevant scope/evidence is available.
5. Prepare authenticated App Review access without weakening public authentication. Email-code features require a reviewer-accessible test inbox/account or another fully reviewable arrangement documented in review notes. A hidden universal code is unacceptable.
6. Obtain a signed distribution archive built with Xcode 26+ and iOS/iPadOS 26 SDK+, validate the archive, and inspect the combined privacy report. Existing native deployment target 16.4 meets the currently published 13+ minimum. `ca.everythinglaurier.preview` can technically be a bundle identifier; confirm its registered production identity rather than silently changing it after registration. Distribution signing, membership and actual archive are unverified.
7. Native device/TestFlight evidence: iPhone and supported iPad, cold launch, network loss, IPv6-only network, OTP delivery, profile permissions, report/block behavior, deletion, large text/VoiceOver, privacy links, and correct behavior after deleted sessions. Browser checks do not replace native verification.
8. Complete real App Store metadata, age-rating questionnaire, privacy labels, copyright/support/review contact, territories/pricing, export compliance, and agreements. Nightlife/alcohol references and UGC/social capabilities need honest disclosure. Account age restrictions and regional age-assurance obligations need an owner-approved distribution plan.

## Clause matrix

The identifiers link conceptually to the live [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/); rows state original app observations instead of reproducing Apple's text. Review all unnumbered text within each cited clause as well as its children. Source page last-updated label observed: June 8, 2026.

### 1

| Clause / children | Status | App evidence / remaining action |
| --- | --- | --- |
| 1 (parent), 1.1 (parent) | Pass (technical) / Unverified | C/D new/edited content is backend-held for review; initial content and operator behavior still require review. |
| 1.1.1 | Pass (technical) / Unverified | Arbitrary C/D content cannot publish until trusted human approval; all fields/media need real review. |
| 1.1.2 | Unverified | No such authored material found; inspect every approved external image/caption. |
| 1.1.3 | Pass (source) / Unverified | No weapon-purchase feature; external-content review remains. |
| 1.1.4 | Pass (technical) / Unverified | No hookup/prostitution feature; C/D now require pre-publication human approval. Operator review remains necessary. |
| 1.1.5 | Unverified | B contains no such authored statements; C/D need review. |
| 1.1.6 | Pass (source) | B illustrated map says not to scale; room positions not claimed verified. Line estimates identify community reports. Fictional events/profiles removed. |
| 1.1.7 | Pass (source) / Unverified | No event-exploitation feature; external-content review remains. |
| 1.2 (all four unnumbered requirements: filtering; reporting/response; blocking; contact) | Gap (venue content filtering) / Unverified (operations/native) | C shared profiles retain review; D selected venue imports publish automatically after source/URL checks at owner request, with no caption/image screening. Personal post/venue hiding, private report queue, bilateral profile blocks and public contact are implemented. SQL checks verify rejected posts stay removed during sync, permissions, deletion and blocks. Source validation is not objectionable-content detection. Owner committed to monitoring; timely responses and native operation remain unverified. |
| 1.2 additional behavior paragraph | Pass (source) / Unverified | No anonymous chat, voting on appearance or harassment feature. Ongoing user-content behavior cannot be proven from code. |
| 1.2.1 (parent), 1.2.1(a) | N/A / Unverified | No creator commerce or executable creator experiences. Ordinary profiles/feed remain covered by 1.2; apply age handling to any age-sensitive imported content. |
| 1.3 (all paragraphs) | N/A / Unverified | University audience; no Kids Category plan. Minors may still sign in; distribution/children's-data obligations need owner decision. |
| 1.4 (parent), 1.4.1 (measurement, medical warning, clearance bullets) | N/A | B links official academic/accessibility resources; no medical diagnosis, measurement or treatment product. |
| 1.4.2 | N/A | No dosage calculator. |
| 1.4.3 | Pass (limited technical) / Unverified | D has no substance checkout/excessive-drinking challenge. Local 19+ declaration gates feed mounting/fetch, home feed, nightlife/detail routes, search/suggestions and saved cards. This is self-declaration, not proof of age or worldwide legal assurance; review all imported promotions and actual rating. |
| 1.4.4 | N/A | No checkpoint data. |
| 1.4.5 | Pass (source) / Unverified | D advises planning a way home; no dangerous challenge. External promotions need review. |
| 1.5 (app/support contact; Wallet paragraph) | Pass (app/public domain); Wallet N/A | Public contact visible in Community/Your space/report modal and published support page. Apex and www domain certificates are active; public app destinations passed the production check. No Wallet passes. |
| 1.6 | Pass (source/backend tests) / Unverified | E live-session guards, RLS, HTTPS and secure native credentials. New moderation permissions/stale-session/cascade tests passed in task verification. Final archive/provider operations unverified. |
| 1.7 | N/A | No criminal-activity-reporting service; ordinary content complaints are different. |

### 2

| Clause / children | Status | App evidence / remaining action |
| --- | --- | --- |
| 2 (parent), 2.1 (parent), 2.1(a) | Gap / Unverified | Fictional data/preview marketing removed; Sites pages public. Domain/app links passed the release check and Tutoring support opens the official academic-support page. Signed native evidence and reviewer access remain unresolved. |
| 2.1(b) | N/A | No IAP. |
| 2.2 (both paragraphs) | Pass (source) / Unverified | B sample data removed, old fictional routes redirect/empty. Signed final build and TestFlight process not yet inspected. |
| 2.3 (parent) | Unverified | F store listing absent from inspected evidence. |
| 2.3.1(a) | Unverified | No secret feature found in C/D/E; disclose all actual capabilities in review notes. |
| 2.3.1(b) | Unverified | Developer submission history not inspected. |
| 2.3.2 | N/A | No purchase content or promoted IAP. |
| 2.3.3 | Gap / Unverified | Final native screenshots not supplied; browser captures are QA evidence only. |
| 2.3.4 | N/A / Unverified | No preview video planned; if added capture actual final app. |
| 2.3.5 | Unverified | Select suitable primary/secondary store category in F. |
| 2.3.6 | Gap / Unverified | F age questionnaire not completed; D alcohol references and C/D UGC/social capabilities matter. |
| 2.3.7 | Pass (source) / Unverified | 'Everything Laurier' is 18 characters. Keywords/subtitle, rights and name availability not checked. |
| 2.3.8 (both paragraphs) | Unverified | Original EL icon observed in E prior audit; final screenshot media and matching native icons require archive/listing inspection. No children's positioning in authored UI. |
| 2.3.9 | Unverified | Existing campus-photo credit/license supplied; other media permissions remain unverified. Store captures must use synthetic accounts. |
| 2.3.10 | Pass (source) / Unverified | No alternative mobile-platform marketing in app; F final description/screenshots not inspected. |
| 2.3.11 | N/A | No pre-order plan known. |
| 2.3.12 | Unverified | Version release notes must match final capabilities. |
| 2.3.13 (including deep-link paragraph) | N/A | Internal venue/event listings are not configured App Store promoted in-app events; reassess if promotion is added. |
| 2.4 (parent), 2.4.1 | Pass (config) / Unverified | A supportsTablet=true; native iPad behavior not tested. |
| 2.4.2 (including background-resource paragraph) | Pass (source) / Unverified | D cloud scraper shared; app feed refresh every five minutes. No mining; device energy behavior unmeasured. |
| 2.4.3 | N/A | No tvOS target. |
| 2.4.4 | Pass (source) | No request to disable security, change unrelated settings or restart device. |
| 2.4.5(i), (ii), (iii), (iv), (v), (vi), (vii), (viii), (ix) | N/A | No Mac App Store target, installer or macOS startup/privilege feature. |
| 2.5 (parent), 2.5.1 | Pass (source) / Unverified | A standard Expo/RN APIs; final native binary and current-OS runtime must be checked. |
| 2.5.2 (both paragraphs) | Pass (source) | Data in app container; backend supplies data, not executable app features. Native Expo updates disabled in inspected supporting plist. No education-code runtime. |
| 2.5.3 | Pass (source) / Unverified | No malware logic found; final archive/dependency scan remains. |
| 2.5.4 | N/A | No declared unrelated native background modes. |
| 2.5.5 | Unverified | Hostnames/HTTPS used; IPv6-only native test not performed. |
| 2.5.6 | Pass (source) / N/A | External URLs use system Linking; no embedded/custom browser engine. |
| 2.5.7 | Omitted | No implementation obligation at this identifier. |
| 2.5.8 | N/A | No alternate home screen. |
| 2.5.9 | Pass (source) / Unverified | No hardware switch interception or link blocking; native runtime still untested. |
| 2.5.10 | Omitted | No implementation obligation at this identifier. |
| 2.5.11(i), (ii), (iii) | N/A | No SiriKit/Shortcuts intents. |
| 2.5.12 (including sharing paragraph) | N/A | No CallKit or SMS fraud extension. Student blocking is account/content blocking, not phone blocking. |
| 2.5.13 | N/A | Unused Face ID key removed in E; no biometric authentication. |
| 2.5.14 | Pass (source) / Unverified | C explicit submit and discovery toggle; line reports explicit submit. No device recording. Recheck clear notice/consent for new moderation data. |
| 2.5.15 | N/A | No file picker. |
| 2.5.16 (parent), 2.5.16(a) | N/A | No widgets, notifications, extensions or App Clip. |
| 2.5.17 | N/A | No Matter integration. |
| 2.5.18 (all targeting/interstitial/report bullets and paragraphs) | N/A | No advertising SDK, paid placements or ad UI found. Venue editorial listings are not represented as paid ads. Reassess any sponsorship. |

### 3

| Clause / children | Status | App evidence / remaining action |
| --- | --- | --- |
| 3 (all introduction paragraphs), 3.1 (parent) | Pass (source) / Unverified | No checkout/monetization logic. F final free-price choice and developer behavior not inspected. |
| 3.1.1 (all unnumbered bullets: unlocks; tips; currency expiry/restore; gifts; Mac plugins; loot-box odds; gift cards; trial; NFTs) | N/A | No digital commerce, currency, trial entitlement, NFT or plugin sale. |
| 3.1.1(a) (StoreKit links; music-streaming links; regional text; fraud paragraph) | N/A | No alternative digital purchase link, entitlement or music streaming service. Venue websites are informational. |
| 3.1.2 (parent), 3.1.2(a) (all ongoing-value/device-access/trials/credits/carrier/scam bullets), 3.1.2(b), 3.1.2(c) | N/A | No paid subscription or carrier bundle. |
| 3.1.3 (parent and regional paragraph), 3.1.3(a), (b), (c), (d), (e), (f), (g) | N/A | No reader/enterprise/person-to-person service charge, physical checkout, paid web companion or ad-management commerce. |
| 3.1.4 (including unrelated-product paragraph) | N/A | No paid hardware unlock. |
| 3.1.5(i), (ii), (iii), (iv), (v) | N/A | No crypto wallet, mining, exchange, ICO or crypto reward. |
| 3.2 (parent), 3.2.1(i), (ii), (iii), (iv), (v), (vi), (vii), (viii) | N/A | No app catalog, media rental, Wallet payment, insurance, fundraising, monetary gifting or financial-service feature. |
| 3.2.2(i) | Pass (source) | B lists clubs/resources; not an app/plugin storefront. |
| 3.2.2(ii) | Omitted | No implementation obligation at this identifier. |
| 3.2.2(iii) | N/A | No ad impressions/click purchasing. |
| 3.2.2(iv) | N/A | No fundraiser collection. |
| 3.2.2(v) | Pass (source) | B/C accept guests/any verified email; Waterloo editorial scope does not geofence ordinary users. |
| 3.2.2(vi) | Omitted | No implementation obligation at this identifier. |
| 3.2.2(vii) | Pass (source) | No manipulation of third-party profile ranking; scraping itself requires separate service authorization. |
| 3.2.2(viii), (ix) | N/A | No financial trading or lending. |
| 3.2.2(x) | Pass (source) | No rating/download reward gate. |

### 4

| Clause / children | Status | App evidence / remaining action |
| --- | --- | --- |
| 4 (parent), 4.1(a) | Pass (source) / Unverified | Custom campus visual system and original geometric icon; ownership of all inputs needs evidence. |
| 4.1(b), 4.1(c) | Unverified | School approval asserted; final naming/seller/authorization scope need confirmation. No Apple-service impersonation found. |
| 4.2 (parent), 4.2.2 | Pass (source) / Unverified | App combines search/map, local saved state, actual accounts/profiles and community estimates. Fake events/profiles removed. Useful differentiation remains a reviewer judgment. |
| 4.2.1 | N/A | No ARKit. |
| 4.2.3(i) | Pass (source) | Core directory/map/bookmarks use app code/data; external email/maps enhance contacts/navigation. App is usable without installing social apps. |
| 4.2.3(ii) | N/A / Unverified | No mandatory initial resource pack found. Final build must bundle fonts and support graceful remote-feed failure. |
| 4.2.4, 4.2.5 | Omitted | No implementation obligation at these identifiers. |
| 4.2.6 (including aggregate-client alternative paragraph) | Pass (source) / Unverified | Custom independent app, not mass commercial template variants; submit as actual rights holder/licensee. |
| 4.2.7(a), (b), (c), (d), (e) | N/A | No remote desktop/cloud-app thin client. |
| 4.3(a), 4.3(b) (all category/example paragraphs) | Pass (source) / Unverified | Single campus app inspected, no duplicate variant generation. Seller's other submissions/market differentiation not audited. |
| 4.4 (parent), 4.4.1 (all positive and negative keyboard bullets), 4.4.2 | N/A | No app/keyboard/Safari extensions. |
| 4.4.3 | Omitted | No implementation obligation at this identifier. |
| 4.5 (parent), 4.5.1 | Pass (source) | Scraper targets venue Instagram only; no Apple data scraper in product. Reading developer documentation for audit is not product scraping. |
| 4.5.2(i), (ii), (iii) | N/A | No MusicKit/local-music-library access. |
| 4.5.3 | Pass (source) | No Apple messaging/Game Center/push abuse. Sign-in email is user-requested. |
| 4.5.4 | N/A | No push notifications/Live Activities. |
| 4.5.5 | N/A | No Game Center IDs. |
| 4.5.6 | Pass (source) | Original vectors/Feather icons; no embedded Apple emoji artwork found in prior Section 5 asset check. |
| 4.6 | Omitted | No implementation obligation at this identifier. |
| 4.7 (parent), 4.7.1 (privacy; moderation; payment bullets), 4.7.2, 4.7.3, 4.7.4, 4.7.5 | N/A | No downloaded mini-app/game/chatbot/plugin/emulator experience. External posts are data within fixed UI; 1.2 still applies. |
| 4.8 (all equivalent-login bullets and exception bullets) | N/A / Pass (source) | App's own email-code accounts hosted by Supabase; no Google/Facebook/other social login. Hosting provider is not a third-party social identity button. |
| 4.9 (including four recurring-payment bullets) | N/A | No Apple Pay. |
| 4.10 | Pass (source) | No charge for hardware/OS capabilities. |

### 5

| Clause / children | Status | App evidence / remaining action |
| --- | --- | --- |
| 5 (all introduction paragraphs), 5.1 (parent) | Unverified | Legal/provider/territory facts exceed source audit. |
| 5.1.1 (parent), 5.1.1(i) (data inventory; partner protection; retention/deletion bullets) | Pass (published Sites policy) / Gap / Unverified | E native screen/gate and public readable Sites policy implemented. App defaults to the verified HTTPS custom-domain URL; App Store field, exact provider/partner practice verification remain incomplete. |
| 5.1.1(ii) (including legal-basis paragraph) | Pass (source) / Unverified | Explicit profile editor and optional discovery; device permissions absent. User notice/terms and provider collection require final review. |
| 5.1.1(iii) | Pass (source) | No extra device permissions; only email/account/profile/report data needed by existing flows. Avoid collecting unnecessary age documents. |
| 5.1.1(iv) | Pass (source) | Guest use, optional discovery and no forced unrelated device access. |
| 5.1.1(v) (all login/social-token paragraphs) | Pass (source) / Unverified | E native confirmed hard deletion, session revocation/RLS guards, cascade/recalculation and local cleanup. No user social token. Final disposable-account native test required. |
| 5.1.1(vi) | Pass (source) | No secret/password discovery logic; server admin credentials never bundled. |
| 5.1.1(vii) | N/A | No concealed Safari controller. |
| 5.1.1(viii) | Unverified | User student profiles are self-submitted. D venue images/captions may contain third-party people; do not create personal directories from them. Content/consent scope requires review. |
| 5.1.1(ix) | N/A / Unverified | No financial/health/cannabis/gambling service. Actual rights-holder/seller account must match deployment ownership. |
| 5.1.1(x) | Pass (source) | Guests browse; optional account enables profile/line functions relevant to identity. No marketing-contact gate. |
| 5.1.2 (parent), 5.1.2(i) (all consent, AI, ATT, reward and removal paragraphs) | Pass (source) / Unverified | No ad ID/tracking/AI client. Discovery opt-in explicitly reveals verified email. Provider data-sharing facts need confirmation. |
| 5.1.2(ii) | Pass (source) / Unverified | No secondary-use code found; operator must maintain declared use. |
| 5.1.2(iii) | Pass (source) | C self-entered profiles; private reports produce public aggregates without user IDs. No reidentification feature. |
| 5.1.2(iv), (v) | N/A / Pass (source) | No Photos/Contacts APIs, installed-app scan or bulk invitation. Email contact is individually chosen by viewer. |
| 5.1.2(vi), (vii) | N/A | No protected health/home/education/depth/face APIs or Apple Pay data. |
| 5.1.3(i), (ii), (iii)(a), (iii)(b), (iii)(c), (iii)(d), (iii)(e), (iv) | N/A | No clinical/fitness/human-subject research or health-data cloud feature. |
| 5.1.4(a), 5.1.4(b) (all children's-data, analytics, parental-gate and metadata paragraphs) | Unverified; ad/kids-marketing parts N/A | C allows account creation without current age assurance. University audience alone does not prove no minors; target territories and age plan need verification. No children's branding or ad SDK. |
| 5.1.5 (all paragraphs) | N/A | No device location collection; building search uses manually entered campus code. External Maps may ask its own permissions. |
| 5.2 (parent), 5.2.1 | Unverified | Owner asserts school approval; archive licensed inputs and correct seller identity. Original art/photo license noted, venue permissions outstanding. |
| 5.2.2 | Unverified | D Apify accesses Instagram and displays media; platform terms and source rights cannot be inferred from public posts. |
| 5.2.3 | Pass (source) / Unverified | No media download/save/conversion feature. Remote image display and scraping still require authorization review. |
| 5.2.4(a), 5.2.4(b) | Pass (source) | No Apple endorsement or editorial badge claim. |
| 5.2.5 (all Apple product/emoji/music/rings/weather paragraphs) | Pass (source); music/rings/weather N/A | Custom UI/icon; no Apple-derived branded asset or false system UI. Apple Maps link names actual service. |
| 5.3 (parent), 5.3.1, 5.3.2, 5.3.3, 5.3.4 | N/A | No app-hosted contest/raffle/real-money game/bet/currency. Venue trivia listing is informational; reassess prizes/contest hosting if introduced. |
| 5.4 (all paragraphs) | N/A | No VPN. |
| 5.5 (all paragraphs, including configuration profiles) | N/A | No MDM/configuration-profile distribution. Student profiles are ordinary database records. |
| 5.6 (all parent paragraphs) | Unverified | Operator/customer-support and developer-account conduct cannot be established by code. |
| 5.6.1 (both paragraphs) | Pass (source) / Unverified | No custom store-review prompt; public support responses remain operator responsibility. |
| 5.6.2 | Unverified | Owner/contact authorized, store seller identity/account/agreements not inspected. |
| 5.6.3 | Pass (source) / Unverified | No referral/review/ranking manipulation code found; external marketing practices unverified. |
| 5.6.4 | Unverified | Real crash/customer-response/service-quality history unavailable; maintain backend and moderation after launch. |

## Submission operations outside numbered clauses

| Item | Evidence / next action | Status |
| --- | --- | --- |
| SDK and target | Apple's [current upload requirements](https://developer.apple.com/news/upcoming-requirements/) specify Xcode 26+/iOS 26 SDK+, effective April 28, 2026, and target iOS 13+, effective September 9, 2026. Existing target is 16.4; installed Xcode 27.0/iOS 27 simulator toolchain is reported by the implementing agent. Actual archive SDK/distribution validation still needed. | Target pass; archive unverified |
| Developer membership and seller | Owner confirms no Apple Developer membership/App Store Connect account. Enrollment, legal owner, agreements, tax/banking if relevant, developer contact and actual App Store Connect permissions still need completion. [Apple's enrollment page](https://developer.apple.com/programs/enroll/) lists USD 99/year, with regional pricing and qualifying institutional fee waivers. Do not purchase again if membership already exists; native team configuration alone does not prove active membership. No purchase performed by this audit. | Missing membership / Unverified seller |
| App record/build | Confirm registered bundle ID, version/build numbers, capabilities, distribution provisioning, valid signature, clean upload validation, selected processed build and all warnings resolved. Native target includes development signing configuration; it is not evidence of distribution eligibility. | Unverified |
| Screenshot set | [Current specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) list a required medium Dynamic Island iPhone screenshot and 13-inch iPad screenshot for iPad support. Examples accepted: 1179×2556 or 1206×2622 iPhone; 2048×2732 or 2064×2752 iPad, PNG/JPEG without transparency. Check the live upload form for accepted final slots. Capture actual native app with synthetic identity. | Missing |
| Privacy labels | [Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/) require actual app/partner collection inventory. Initial candidate types: name, email, user ID, other user content, product interaction and retained connection data, linked for app functionality; no tracking found. Verify vendor logs, retained search query URLs, support/moderation data, and final SDK report before answering. Local-only bookmarks are not off-device collection. | Unverified |
| Privacy manifest/SDK signatures | Inspect archive's combined report and each included required SDK; source manifest alone is insufficient. Match required-reason API entries to actual bundled implementation. See [privacy manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests). | Unverified |
| Export encryption | App uses platform HTTPS and native secure storage, no custom cryptographic product found. Complete [export review](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/) for the final dependency/binary set. Set [ITSAppUsesNonExemptEncryption](https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption) to false only after confirming exemption; absence prompts questionnaire and is not automatically a violation. | Unverified |
| Age ratings | Complete the current [age questionnaire](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions) for UGC, social media and actual alcohol frequency. iOS 26+ ratings include 4/9/13/16/18+; frequent alcohol references map to 18+. Do not assert a rating before content review. | Missing |
| Age assurance/territories | Review [current age-assurance Q&A](https://developer.apple.com/support/age-assurance/) against selected territories and social-media capabilities. A local 19+ acknowledgement is not proof that every regional verification rule is met. Restrict distribution appropriately pending evidence. | Unverified |
| EU distribution | If offered in EU, verify DSA trader/non-trader declaration and any required public contact verification. See current requirements link above. Do not invent trader status. | Unverified |
| Other regional panels | Review China mainland, Korea, Vietnam and any storefront-specific licensing or identification prompts for the actual chosen territories. Developer domicile and commerce can also affect tax-reporting panels; no facts were assumed. Current [required-property reference](https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties/) lists these conditional fields. | Conditional / Unverified |
| Digital goods/services form | Complete the [questionnaire](https://developer.apple.com/help/app-store-connect/manage-app-information/complete-the-digital-goods-and-services-questionnaire) if it appears for this app; Apple says no action is needed if absent. No payments found; answer from actual free-content/access model rather than inventing purchases. EU answers can lock for 12 months, so review before saving. | Conditional / Unverified |
| Accessibility labels | [Apple's current page](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels) describes labels as initially voluntary. Declare support only after completing common flows on each device with the relevant assistance. Current light-only theme does not support a Dark Interface claim. VoiceOver/Larger Text claims await native tests. | Optional / Unverified |
| Medical-device declaration | No clinical product found; answer any applicable App Store Connect medical-device-status prompt truthfully. Academic/accessibility support links do not establish a medical-device product. | Conditional / N/A to current function |
| Listing fields | Name/subtitle/description/keywords/copyright/category, support/privacy URLs, screenshots, age answers, prices/availability, review contact and review notes must correspond to final app. Proposed support/privacy contact is owner-authorized, not evidence of inbox operation. | Missing / Unverified |
| Reviewer access | Dedicated disposable review account, functioning inbox/code delivery, documented steps and backend uptime. Explain optional discovery, line-report hours, asynchronous moderation and deletion. If an approved demo arrangement is required, obtain it before submission; no hidden auth bypass. | Missing |
| Native verification | Device/IPv6/accessibility/network-failure/testing plan above. Inspect Release behavior rather than only development browser. Validate deleted-session guards and full report/block enforcement with synthetic accounts. | Missing |
| Operational moderation | Owner committed to monitoring Gmail/reviewing content. Private queue, restricted operator decision functions and docs/moderation-operations.md now exist. Verify inbox/queue operation, native flows and real response/removal handling; no staff history invented. | Implemented process / Unverified operation |
| Licensed content | Keep school approval evidence/scope and third-party licenses/terms, photo license/attribution, original asset provenance. No outward permission requests/messages sent by this audit. | Unverified |
| Submission/release | [Submit an app](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/) only after all blocking evidence is complete. Submission, review and actual release are distinct; no submission occurred in this audit. | Not performed |

## Evidence updates

This document starts with the observed implementation before the current website/moderation work. Replace gaps only after inspecting the completed code/deployment/tests. Owner assertions should retain their attribution. No clause may be marked passed merely because a task is planned or because unrelated automated checks pass.

Current-task reassessment: `content_moderation.sql` is deployed according to task verification. This audit inspected its final local source plus ReportContent, BlockedProfiles, student controls, local source preferences, Community and operator procedure. Pending/approved profile/feed states, re-review after edits, private complaint storage, bilateral blocks, authenticated wrappers, restricted operator decisions and deletion cascades are implemented. The implementing agent reports rolled-back synthetic SQL passes for pending visibility, denied approval privilege, operator approval, unchanged upserts preserving approval, edits resetting review, report deduplication/private queue access, bilateral block/unblock, suspended edit denial, revoked-session rejection and deletion of all associated new data. No real account was deleted by these tests. Lint/TypeScript checks passed in task verification. Sites website publication and custom-domain/app-link verification are complete. Native flow checks and human review of actual content remain pending. Installed Xcode 27.0 and iOS 27 simulators are reported; the Simulator Release compilation passed, but no signed distribution archive or native runtime test completion has been established.

Additional source reassessment: fictional events removed (`events=[]`); /person legacy routes redirect real UUIDs to /student and other IDs to /people. Preview marketing removed. Local 19+ choice gates feed mounting/fetching on home and nightlife, direct nightlife/venue/night routes, restricted search/suggestions and saved cards; reset and account deletion clear that local choice. No DOB collected, and no legal proof of age is claimed. Public Sites privacy/support/community endpoints independently returned HTTP 200, with readable rendered policy content and no draft banner, at https://everything-laurier.sharpthyme4.chatgpt.site/. Both custom domains have active HTTPS and the production release check verified public privacy/support/community destinations. All 26 existing tests/lint/TypeScript checks reported passed after current edits. The first native Release simulator build exhausted available disk space. Only this task’s temporary derived build files were removed, recovering 4.6 GB; the arm64-only Release build succeeded. Packaged plist/privacy manifests parsed successfully, with no tracking or unused device permissions. Simulator GUI is absent from this Xcode installation, so native launch/flow tests remain unverified. See native-release-verification.md.

Browser verification: guest More → Community exposes public support and rules. Under-19 choice preserves campus access and blocks nightlife; adult choice opens reviewed nightlife detail; resetting the local choice restores the gate. These checks used the current production web export, not an iOS binary. Native Chrome independently rendered the HTTPS custom-domain privacy and support pages, including account-deletion help.

## October 10 automatic venue feed update

The owner chose source-based automatic publication without AI screening or per-post approval. Both backend migrations are deployed: `automatically_publish_selected_venue_posts` and `preserve_venue_post_removals_on_unchanged_import`. There are 32 published imports, including 27 within the reader’s 14-day window. The real anonymous client API returned those 27 posts from the four selected venues. Two rolled-back SQL suites verified automatic publication, invalid-link holds, persistent operator removals, reports, blocks, permissions and account deletion. Personal post/venue filtering, relaunch persistence and cleanup with outstanding storage writes passed tests; lint and typecheck passed. Native hide controls were not exercised on a device. The updated public pages describe this behavior. Content filtering is marked as a gap rather than a passed check.
