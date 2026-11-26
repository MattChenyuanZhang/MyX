# MyX 0.7.0 verification

Local checks completed on 2026-11-25. The initial 0.7.0 runtime passed live refresh and video checks. Follow-up post-card navigation and popup-retention changes are verified locally and need a final extension reload. The requested single-bar account control is awaiting clarification. Keep the preceding public download latest until the final live check finishes.

## Debug report

- **Symptom:** the reader stopped showing newer Following activity; videos had no playback control.
- **Root cause:** collection was a bounded snapshot, and the passive observer only captured responses X independently requested. No refresh mechanism initiated another native Following load while the reader stayed open. Video extraction discarded variants and retained only a boolean; the renderer produced a navigation link.
- **Fix:** an account-checked inactive native X tab supplies fresh Following records on open, on demand, and once per minute while Home is visible. Existing activity is merged and failures leave the cache intact. Account switches and reader closure cancel owned work. Videos retain validated native MP4 variants and posters, with an inline player and native-player fallback.
- **Evidence:** automated worker/native-helper regression tests plus the production scripts running against the Chrome fixture, including an actual local MP4 playback test.
- **Status:** live refresh and video checks passed for the initial 0.7.0 runtime; follow-up navigation/popup fixes and the revised single-bar control are not yet finally verified on X.

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

## Live X checks and follow-up changes

- Fresh native Following refreshes added 4, then 25 newer activities to the original reader. A separate reader also loaded current activity automatically.
- Played a real X video inside a feed card: readyState 4, currentTime advanced to 11.62 seconds in a 144.04-second video. Paused after checking.
- Opened a real conversation inside MyX. The native center pane showed 11 post cards, multiple actual replies and X's reply composer, with MyX navigation and the search-only right sidebar retained. No social interactions were submitted.
- Found the hover timer could dismiss a clicked popup while keyboard users tried to adjust a slider. Clicking now pins it; hovering another account does not replace a pinned popup; Done, Escape and outside clicks close it. In the local browser, the popup stayed visible across independent work and its slider remained usable afterward.
- Added whole-card post navigation after the user's follow-up request. Local mouse-click and Enter tests both opened a full native-shaped thread with its two test replies. Video/action/profile controls and selected text are excluded from card navigation.
- Chrome retained the earlier installed content script even after refreshing the X tab, so these follow-up changes require an extension reload before final live verification.
- The user then requested a single account bar. Clarification is pending: either one three-part post/repost/reply mix totaling 100%, or one shared 0–100% visibility percentage for all activity. No interpretation has been implemented without their answer.

## Limits

X must return timeline data in the signed-in session, and English native tab labels are currently required. Background tab loading may be delayed by browser throttling or X; failures are explicit, not a claim of success. This is not a complete historical archive or a guarantee of every followed reply. MP4 playback uses X's supplied URL; stream-only or failed sources use the original player inside MyX. The initial runtime has live refresh and MP4 playback evidence. The revised UI still needs its own final live check; earlier evidence is not a substitute for testing changed behavior.
