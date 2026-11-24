# MyX 0.5.1 verification

This update adds profile preview cards, native Lists and Messages destinations, and public ZIP distribution. No new Chrome permissions are requested.

## Automated verification

31 tests pass. New coverage checks profile field bounds, safe image origins, exact profile-handle parsing, cross-account rejection, inactive lookup-tab creation, owned-tab cleanup, timeouts, and public timeline profile extraction without authentication fields. Existing native-route tests include Lists, Messages and X messaging security routes. Runtime syntax and manifest checks pass.

## Local browser verification

- Focusing an author's profile link opened a preview with a biography and follower/following counts. Escape dismissed it. Preview content is escaped and @mentions link to native profiles.
- Search matches support the same preview entry point. Preview caching avoids repeated lookup work for recent records.
- Lists opened the native-style list pane inside MyX; the local fixture's create-list controls remained operable. Messages opened the native-style message pane; the local fixture's composer remained operable. Only fictional fixture data was submitted.
- The browser-readable installation guide rendered all three steps. Its copy button copied the extensions-page address and displayed the confirmation.
- No browser console errors were observed in the checked fixture flows.

## Public download

Public ZIP releases use the stable `releases/latest/download/myx-extension.zip` URL. An unauthenticated download-link check followed redirects and returned HTTP 200 with an attachment named `myx-extension.zip`. The ZIP contains runtime files, `START-HERE.html`, text instructions, and the MIT license; no session data is packaged. No Git commands or GitHub account are required.

The ZIP requires Chrome's unpacked-extension installation steps. It is not a Chrome Web Store listing.

## Final installed 0.5.1 checks

The initial installed 0.5.0 check successfully loaded a real profile biography and follower/following counts inside a preview, closed its inactive lookup tab, opened the full profile, and opened Lists with the correct active selection. It exposed two issues repaired in 0.5.1:

- Native profile text can hydrate before its avatar. Lookup now briefly waits for the image and preserves a known avatar as a fallback.
- X's compact messaging account switcher omits the handle. Account detection now reads X's real Profile navigation link when the switcher text lacks it, preserving correct account identity and isolation. The target surface is persisted before navigation so the loading shell shows Messages immediately.

Both repairs have automated regression tests. The browser fixture now reproduces the compact switcher with no handle; Messages retains the signed-in account, survives refresh and keeps its native controls operable.

Final installed 0.5.1 checks passed in the signed-in desktop Chrome session:

- A real profile preview showed its avatar, biography, and following/follower counts. The temporary inactive lookup tab had closed after the result. Reopening the same preview displayed its cached complete details.
- Messages opened with the correct signed-in account, the active sidebar selection and compact layout. The feed-specific right sidebar was hidden. Refresh kept the Messages title and signed-in account instead of falling back to a signed-out reader.
- Lists opened its real native page inside MyX and received the correct active selection.
- Returning from the new destinations preserved all 48 collected timeline records with 48 confirmed activity timestamps.
- The checked live flows produced no browser console errors. No messages or lists were created on the live account.

X's existing messaging route was observed to lead to its native security setup for this account. MyX retains X's own setup; the test does not change security credentials, publish messages or create lists on the live account. Full inbox access depends on completing X's account-specific security flow.

No private profile cache, message contents, security-setup values or live screenshots are committed to the public repository.
