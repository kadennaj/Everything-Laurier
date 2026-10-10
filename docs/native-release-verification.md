# Native Release verification — October 9, 2026

Result: arm64 iOS Simulator Release build succeeded with Xcode 27.0 / iOS Simulator SDK 27.0, code signing disabled. The bundled JavaScript/assets are present. This is a simulator build, not a signed distribution archive, App Store validation or runtime test.

The first dual-architecture build exhausted disk space. Only this task’s temporary derived-data directory was removed before retrying arm64; no user documents were deleted. After the successful build, the compiled app was preserved at `/tmp/everything-laurier-simulator-release.app` and this task’s reproducible intermediate build cache was removed to recover space. Build log: `/tmp/laurier-native-build-arm64.log`.

Native bundle identifier: ca.everythinglaurier.preview. Minimum iOS: 16.4. No device-permission purpose strings are included because no camera/photo/location/microphone/contacts/Bluetooth/Face ID features are requested. Transport settings prohibit arbitrary insecure loads and permit local development networking.

All 9 packaged privacy manifests were parsed successfully. They declare no tracking. Required-reason categories present across the packaged app/SDKs are UserDefaults, FileTimestamp and SystemBootTime. The app manifest declares Name, EmailAddress, UserID, OtherUserContent, ProductInteraction, OtherDataTypes, SearchHistory and OtherDiagnosticData for app functionality, linked where relevant, without tracking. Reconcile the final signed archive’s Xcode privacy report with provider practices and App Store privacy labels before submission.

## Runtime limitation

The Simulator GUI app is absent from the installed Xcode Developer Applications directory and cannot be opened through the available computer controls. Native launch/OTP/report/block/deletion/accessibility/device flows were not executed. The current web export’s guest navigation, support/community controls and nightlife acknowledgement/reset were exercised; those checks do not replace native runtime evidence.

Complete signed-device/TestFlight tests, iPad behavior, IPv6-only access, accessibility, final screenshots and reviewer access after the owner enrolls and configures signing. Keep the full audit status as not ready to submit.
