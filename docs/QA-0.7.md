# MyX 0.7.0 verification

Local checks completed on 2026-11-25. Live X checks are pending an installed-extension reload. Keep the preceding public download latest until that verification finishes.

## Debug report

- **Symptom:** the reader stopped showing newer Following activity; videos had no playback control.
- **Root cause:** collection was a bounded snapshot, and the passive observer only captured responses X independently requested. No refresh mechanism initiated another native Following load while the reader stayed open. Video extraction discarded variants and retained only a boolean; the renderer produced a navigation link.
- **Fix:** an account-checked inactive native X tab supplies fresh Following records on open, on demand, and once per minute while Home is visible. Existing activity is merged and failures leave the cache intact. Account switches and reader closure cancel owned work. Videos retain validated native MP4 variants and posters, with an inline player and native-player fallback.
- **Evidence:** automated worker/native-helper regression tests plus the production scripts running against the Chrome fixture, including an actual local MP4 playback test.
- **Status:** local verification passed; live verification pending.

## New account controls

Following activity has a final settings gear, opened by pointer hover, keyboard focus or click. The popup offers independent Posts, Replies and Reposts sliders. Reposts use the followed actor's settings. Chances apply before discovery spacing; stable seeded ranks avoid reshuffling when data refreshes. Per-account preferences and their random seed persist locally and are isolated by signed-in X account. Feed settings lists modified accounts, including those with all rates at zero.

## Automated checks

- `npm test`: 45 passing tests.
- `npm run check`: syntax, manifest assets and unchanged `storage`-only permissions.
- New coverage: stable sampling, nested percentage subsets, 0%/100%, independent activity types, correct repost actor, native MP4 extraction, media-origin rejection, helper account checks, early responses, React tab replacement, timeout/error outcomes, cancellation, concurrent refresh bounds, concurrent preference writes and special handle keys.
- Existing discovery, activity chronology, mute, native interaction, account search, preview and startup tests remain green.

## Chrome fixture checks

- Opening MyX loaded new activities automatically. Repeated refreshes added fresh IDs and retained older activity without duplicates.
- Played a real 20-second generated MP4 using the production video element. During playback, refresh displayed Show latest posts and playback continued (readyState 4, currentTime advancing).
- After scrolling settled at 1041 pixels, clicking the actual refresh icon kept exactly 1041 pixels. Show latest posts then returned to the top with the new activity first.
- Dragging the pointer onto a gear opened the popup without clicking. Mouse/keyboard range controls worked; 0% Posts removed posts while replies and reposts remained.
- Setting all three rates to 0% hid that account entirely; Feed settings restored it to 100%.
- A 50% post sample produced exactly the same activity IDs after a page reload.
- The synthetic provider redirects only its fictional video URL to a locally generated fixture clip; no private or third-party media is committed.

## Limits

X must return timeline data in the signed-in session, and English native tab labels are currently required. Background tab loading may be delayed by browser throttling or X; failures are explicit, not a claim of success. This is not a complete historical archive or a guarantee of every followed reply. MP4 playback uses X's supplied URL; stream-only or failed sources use the original player inside MyX. Local fixture results do not establish real X video playback or live refresh success until the pending reload check is completed.
