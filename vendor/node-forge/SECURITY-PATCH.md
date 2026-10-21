# Everything Laurier security patch

Based on the npm node-forge@1.4.0 package. Upstream name/version and licence are preserved; `everythingLaurierSecurityPatch: 2026-10-21.1` identifies these local modifications. This is not an upstream fixed release.

Advisory: https://github.com/advisories/GHSA-86w9-cpqp-85rv

Apply nested DigestAlgorithm element-count validation from upstream proposed PR #1152 (https://github.com/digitalbazaar/forge/pull/1152), preserving valid optional NULL handling and algorithms.

The root package uses a direct local-file dependency and npm overrides, so clean installs and builds resolve this patched copy without relying on postinstall scripts. Tests are in tests/build-tool-security.test.mjs. npm audit does not independently assess vendored source; a zero scan is not proof of these patches. Keep these tests and revisit upstream releases.
