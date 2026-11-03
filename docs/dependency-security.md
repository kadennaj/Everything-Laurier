# Dependency security review — October 21, 2026

The October 17 audit reported 18 high-severity transitive findings, all originating in two build-tool advisories. Both affected implementations now have targeted, locally maintained patches. The audit on October 21 reported zero findings, and an isolated clean install resolved the patched copies. See the November 3 follow-up below for the latest audit.

## What changed

- `braces` 3.0.3: local copy in `vendor/braces`, with parser nesting bounded at 128 (including parentheses and malformed/unclosed patterns), plus iterative validation before compile/expand/stringify walkers. Caller-supplied, cyclic and deeply nested ASTs are rejected before recursion. Original ordinary glob/range behavior remains tested. Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm.
- `node-forge` 1.4.0: local copy in `vendor/node-forge`, incorporating the nested DigestAlgorithm element-count fix proposed in upstream PR https://github.com/digitalbazaar/forge/pull/1152. It rejects extra ASN.1 children while preserving permitted optional NULL parameters and normal signing/verification. Advisory: https://github.com/advisories/GHSA-86w9-cpqp-85rv.
- Root local-file dependencies and npm overrides direct Expo, its signing tools and micromatch to these copies. Patches do not depend on install scripts. Original upstream package names, versions and licences are retained; `everythingLaurierSecurityPatch: 2026-10-21.1` identifies the local modifications. Provenance, patch explanations and SHA-256 file manifests live in each vendor directory.
- The earlier patched URI decoder and compatible xcode UUID override remain in place. No framework major downgrade or blanket audit suppression was used.

## Evidence and limits

`tests/build-tool-security.test.mjs` verifies transitive resolution, rejection of nested/cyclic brace inputs and rejection of RSA DigestAlgorithm garbage using a low-exponent RSA key. Valid signatures, absent/present NULL parameters, altered messages, ordinary brace expansion and AST stringification are covered. Restoring the unpatched implementations makes both attack regression tests fail; the patched implementations pass. Typecheck, lint, app tests, the actual signed iPhone Release build and web production export also pass.

**A zero npm audit is not an independent audit of these local sources.** npm does not independently assess vendored code. These patches fix the two specific reported mechanisms; they are not upstream fixed releases or a guarantee against other flaws. Keep the regression tests, inspect changes to the vendor copies and overrides, and replace them with reviewed compatible upstream fixes when available. The original advisories remain visible in `docs/dependency-audit-summary.json` alongside the current scan and this limitation.

Do not use `npm audit --force` to downgrade Expo/React Native to incompatible versions. Keep Metro and other development servers private and avoid processing untrusted build/project inputs.

## November 3, 2026 — Zod memory exhaustion

A refreshed audit identified Zod 3.25.76 and its dependent Expo CLI as two high-severity entries for one underlying issue, GHSA-mrhx-c7xc-m3w5. Zod is now pinned to the published fixed release 4.6.7, with an npm override directing all installed consumers to that release. This is a deliberate compatibility override of Expo CLI 57.0.32’s declared Zod 3 range; linting dependencies already accept Zod 4. No vendored Zod copy, audit exception or version relabelling is used. Re-run the compatibility tests when upgrading Expo.

The actual Expo CLI plugin-descriptor, command-argument and developer-output schemas pass valid/invalid input checks against Zod 4. The React Hooks linter also passes. Oversized bounded arrays, sets and maps now fail before visiting their elements. A bounded comparison against the original registry release demonstrated 10,000 element visits and 10,001 validation issues before the fix, versus zero element visits and one issue afterward. Upstream fix: https://github.com/colinhacks/zod/commit/a0ebf970f2d752e5f58527cd2942ff48be4f46bd.

Verification: 83 tests pass; typecheck/lint pass; Expo Doctor passes 21/21 checks; public-config evaluation and iOS/web exports pass. An isolated npm 10 clean-install dry run passes. Existing braces/node-forge/decoder security regressions still pass. Runtime app/backend code contains no direct Zod imports, and no native module or server changes were needed for this fix.

The latest audit reports 0 critical, 0 high, 24 moderate and 2 low findings. The remaining glob/minimatch/deepmerge build-tool advisories are separate from this fix and remain visible. No new native archive or phone reinstall was performed for this build-tool-only change.
