# MyX 0.7.2 verification

Local Chrome and final signed-in X verification completed on 2026-11-27 after the user reloaded the installed 0.7.2 extension.

## Debug report

- **Symptom:** profile details appeared slowly, returning from native surfaces exposed the underlying X timeline or lost the reader position, and the action icons differed from X with the gear on another row.
- **Root cause:** every descendant pointer transition reset a 350 ms preview timer; cached biographies were not accepted without fresh counts; partial timeline profiles could replace rich cached details; cold lookup could wait solely for an already-known avatar. Reader navigation stored only a surface and pixel offset, so browser Back could restore a conversation surface on the home route. Chrome's back-forward cache also retained an older in-memory collection which could overwrite newer updates. The action row used approximate stroked paths, extra quote/thread buttons, and a separate block gear.
- **Fix:** short preview dwell, immediate cached details with separate revalidation, bounded account-scoped public profile reuse, preservation of partial details and known avatars. Save the originating reader view/tab/row identities and reading anchor in the browser history entry and session preferences. Reconcile restored cached pages with the current tab collection before saving. Restore the original row sequence while queueing new arrivals. Use native X action glyph geometry and 18.75 px dimensions, compact counts and native order, with the gear trailing inline.
- **Evidence:** local provider browser checks and native X DOM comparison described below. Screenshots stay outside the public repository. No real social interactions were submitted.
- **Regression tests:** reader membership/order/account isolation, compact action counts, startup shell history restoration, shared public profile cache reuse, partial-profile preservation, duplicate lookup joins, known-avatar delay removal and original-post view counts on reposts.
- **Status:** local and final installed signed-in X checks passed. First-time profile details still depend on X network and rendering speed.

## Automated checks

`npm test`: 54 passing tests. `npm run check`: JavaScript syntax, manifest assets and unchanged storage-only permissions. The install ZIP includes the native glyph module and excludes fixtures, screenshots and account data.

## Local browser checks

- Native X's six post action SVG paths and their 18.75 px width were read from a real signed-in timeline and compared with the implemented controls. No real action buttons were activated for that comparison.
- All seven feed controls (reply, repost, like, views, bookmark, share, account settings) shared one vertical position. Counts rendered as 46, 102, 1.8K and 89K. Quote remains available through the native repost menu; opening a conversation remains available through the post card.
- Opening a visible post showed the selected conversation and its two test replies. Browser Back restored identical displayed event IDs, order, scroll position and post coordinates.
- The Replies tab returned unchanged after opening an author's full profile and using Back to feed. Browser Back from a Reposts conversation restored that tab and all six test reposts. Feed settings returned unchanged from History.
- Injecting a test Following arrival while viewing a native conversation reproduced a lost-update defect when Chrome restored the old page. After the cache reconciliation repair, the same replay retained the original row sequence, showed Show latest posts, and displayed the previously queued provider arrival when clicked.
- A provider delayed by 1.8 seconds displayed an initial profile/loading card after about 220 ms. Once loaded, a repeated hover showed the full bio/counts in about 150 ms including browser input/observation overhead. These are local measurements, not guarantees of X's response time.
- Escape dismissed a keyboard-focused preview. Reopening it preserved complete details without another provider wait.

## Final signed-in X checks

- The installed extension rendered the new six native action glyphs plus the inline account settings gear. All seven controls shared the same vertical position and measured 18.75 px. Real reply, repost, like and view counts rendered in compact form.
- Automatic Following refresh reported 45 additional activities during the first check. Later checks reached 143 collected activities, including new activity above the previous first row; existing visibility filters remained active. No discovery or account visibility settings were changed during this QA.
- A real uncached profile preview appeared after about 250 ms, then displayed the actual avatar and follower/following counts. Reopening those cached details took about 100 ms including browser input/observation overhead. A second real account preview displayed its bio, avatar, verification badge and both counts.
- Opening a real post loaded its canonical X status URL, Conversation heading, two native post cards and X's reply composer within MyX. No reply was submitted.
- A normal coordinate mouse click followed by browser Back restored identical displayed activity IDs/order and the same visible anchor at exactly the same screen coordinate. Absolute scrollTop differed by one pixel in that run as layout height changed. Coordinate input avoided locator automation's automatic pre-click scrolling.
- MyX's Back to feed restored the same row sequence and selected post coordinate with zero visible shift. Reloading this restored view retained Home, the same rows/order and zero anchor shift.
- Opening a real author profile from the Replies tab and using Back to feed restored that tab and its exact reply membership/order.
- Clicking the inline gear opened a stable popup with exactly one 0–100% slider. It was closed without changing the account setting.
- No MyX-related console errors were reported during the final check. No real likes, posts, replies, reposts, follows or DMs were sent. Screenshots remain outside the public repository and release ZIP.

## Limits

First-time profile detail loading still depends on X. The reader can restore only activities retained in its bounded cache, and current mute/relationship filters continue to apply. Existing X collection, recommendation and video availability limits remain unchanged. This update does not claim full X feature parity or exhaustive historical feed coverage.
