# MyX 2.0 release verification

2026-11-27. The public release name is MyX 2.0; the Chrome manifest and package versions are 2.0.0.

This is a version-number and release-presentation update to the verified 0.7.2 build. No JavaScript, CSS, permissions, or feed behavior changes. The release description leads with the per-account 0–100% activity visibility slider and includes the preview, return-navigation and native action-row improvements.

Validation: extension checks passed; all packaged extension files except manifest.json match the verified v0.7.2 source byte for byte. Manifest changes are limited to version. The ZIP is checked against the current runtime files and retains only the storage permission. Live behavior evidence and the 54-test result are recorded in [QA-0.7.2.md](QA-0.7.2.md); GitHub CI runs those same tests for this release commit.

The stable latest-download URL continues to use myx-extension.zip. Existing 0.7.2 installations already have the same functionality. Installing this ZIP updates their displayed extension version to 2.0.0; no new permissions or account authorization is needed.
