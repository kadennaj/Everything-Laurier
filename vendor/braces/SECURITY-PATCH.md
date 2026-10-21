# Everything Laurier security patch

Based on the npm braces@3.0.3 package. Upstream name/version and licence are preserved; `everythingLaurierSecurityPatch: 2026-10-21.1` identifies these local modifications. This is not an upstream fixed release.

Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm

Reject nesting >=128 and more than 65,536 AST nodes before recursive parsing cleanup or walking. Covers parentheses, malformed/unclosed patterns, direct lib consumers and custom/cyclic ASTs.

The root package uses a direct local-file dependency and npm overrides, so clean installs and builds resolve this patched copy without relying on postinstall scripts. Tests are in tests/build-tool-security.test.mjs. npm audit does not independently assess vendored source; a zero scan is not proof of these patches. Keep these tests and revisit upstream releases.
