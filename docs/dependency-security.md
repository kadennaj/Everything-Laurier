# Dependency security review — October 17, 2026

Initial npm production-dependency audit: {'info': 0, 'low': 0, 'moderate': 11, 'high': 18, 'critical': 0, 'total': 29}

Direct advisory roots: braces (Metro build glob parsing, no patched registry release available); node-forge (Expo signing/build tooling, no patched registry release available); decode-uri-component (URL decoder used by Expo Router); uuid (xcode uses v4, advisory concerns buffer-based v3/v5/v6). Do not use npm audit --force: suggested Expo 44/React Native 0.72 downgrades are incompatible with SDK 57.

The URI decoder uses the patched upstream 0.5.0 implementation with documented CommonJS export and literal fallback-replacement adaptations so query-string 7 remains compatible. The vendor directory contains provenance and the original MIT licence. xcode’s UUID is pinned to compatible CommonJS v11.1.1; its v4 call and native-config/export paths are checked. Reassess both pins when upstream SDK packages resolve them. The malformed-input regression test exposed oversized regex compilation in the upstream fallback; literal split/join handles that path without compiling a user-sized pattern. Remaining upstream toolchain advisories require tracking and a fixed compatible SDK/toolchain before treating release risk as closed. Keep development servers private; never expose Metro or process untrusted project/build inputs.

Final production-dependency audit: 18 high-severity transitive findings trace to the remaining braces and node-forge advisories; zero critical/moderate findings. These are unresolved and are not a clean audit.

Reproducibility: the patched module is a direct local-file dependency, with an npm override referencing that dependency. The first nested file override produced an unsuitable lock entry; it was replaced and a clean isolated npm ci plus URI/room parsing checks now pass. No framework major downgrade was applied.
