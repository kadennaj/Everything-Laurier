# Release verification — November 3, 2026

App Store Connect ID6830356811; bundle ca.everythinglaurier.preview; version1.0.0. The signed store build2 completed and uploaded to App Store Connect through EAS Submit. This is not App Review submission or approval.

Build: d0feb403-ae8d-4788-b70f-56c0df0558e5. Upload: a33a7a62-bf14-484b-9853-6887a1b5173c. Both FINISHED. AppManager submission credential is held on EAS; no private key is in source.

## Archive inspection

Downloaded the exact signed IPA from that completed build. codesign --verify --deep --strict passes. Info.plist identifies version1.0.0 build2, minimum iOS16.4 and both iPhone/iPad device families. App transport security denies arbitrary insecure loads; local development networking is permitted. Location, motion and selected transcript photo purposes are present. No camera, microphone or tracking permission purpose is present. Scene support is configured.

Parsed13 packaged PrivacyInfo.xcprivacy manifests. No tracking declaration is true. The union of collected types matches the configured App Store labels: Name, Email, User ID, Device ID, Photos/Videos, Other User Content, Search History, Product Interaction, Other Diagnostic Data and Other Data. Purpose is app functionality; account-related data is linked. This is manifest inspection, not verification of every vendor's internal practices or a substitute for native runtime testing.

## Reviewer access and policy

Reviewer reset template was corrected and verified after reload, replacing the localhost destination with the HTTPS recovery page for the exact test account. A fresh authorized email was sent; the user confirmed password reset completed. The reviewer has no owner grant. Do not record the password in this document. Ordinary users retain email-code login and CAPTCHA; the exact Apple test email reveals the review-only password field.

The public policy is published through Sites version18 and additionally discloses the dedicated recovery form. The user entered and saved the review password directly in Apple’s private form. Actual final app review-login testing remains pending.

## Remaining work

Final native screenshots, iPad interactions/rotation/large text, reviewer login, account/report/block/deletion runtime checks where not already evidenced, processed build selection and final store fields. App Accessibility declarations must reflect verified support. The user restored the Apple session and Device Hub controls. Native13-inch iPad guest navigation and the clubs directory work. Rotation while the map was open exposed a stale content frame; Shell now uses the safe-area provider’s live window frame and explicitly sizes the root. Repacked the existing simulator Release artifact for JS-only testing; portrait-to-landscape and landscape-to-portrait both fill the window without changing routes. A full new store build is required for this fix. Repacked simulator binaries are for testing, not store submission.

Privacy labels were published with the user's explicit approval. Canada-only availability and free price were saved. Content rights were confirmed by the user; confirm persisted app-info setting before submission. The app remains not submitted for review and not live.

Latest source checks:90 automated tests pass; lint and typecheck pass. No native dependency or SDK version changed for the rotation fix.
