# MyX 0.6.0 feed-mix verification

Verified locally and against the signed-in X interface on 2026-11-24 after reloading the installed 0.6.0 extension.

## Implemented behavior

Feed settings has a native draggable Discovery share range from 0% to 100%, with a live percentage, visual mix preview, and reset to the original 10-following-plus-1-discovery mix (100/11%, displayed as 9.1%). Preferences persist in Chrome local storage separately for each X account. Existing preferences migrate without changing the original spacing. Moving the slider enables discovery; the existing Include discovery checkbox can pause it. Replies/Reposts tabs retain their focused activity filters.

The blender retains following order and the eligible For You candidate order. It inserts floor(following_count × discovery_share / following_share) candidates as following posts are emitted. At 100%, only eligible discovery candidates appear. It never fabricates/repeats posts to fill a shortage; remaining following posts still appear and the status line explains how to replenish discovery. Existing mute, known-followed-author, promoted-post, relationship-verification and duplicate filters remain active.

## Automated verification

- `npm test`: 35 passing tests, including new ratio/shortage/deduplication tests and persistent per-account background-storage validation.
- `npm run check`: extension syntax, manifest assets and unchanged storage-only permissions.
- Test ratios: 0%, 10%, 25%, 50%, 75%, 90%, 100%, default 100/11%, explicit discovery off, and focused tabs.
- Invalid persistent percentages (negative, over 100, NaN and string) are rejected. Clearing session data and using a second tab retain the correct account's mix.

## Chrome browser verification with synthetic provider

Used the production shell/content scripts via the local preview, with fictional accounts and posts.

- Dragged the slider from 100% to about 49.5%; the thumb and live percentage followed the mouse and the value survived refresh.
- Home/End reached 0%/100%. Twenty-five ArrowRight presses from Home reached 25% without losing focus. Reset restored 9.1% and original spacing.
- Collected 23 following activities and 5 For You posts, then verified 3 eligible discovery authors using the native-shaped profile flow.
- Default produced 23 following + 2 discovery at positions 11 and 22. At 25%, the three available discoveries appeared after following activities 3, 6 and 9. Following IDs retained exactly the same order; a shortage message appeared.
- 100% produced 0 following + 3 discovery; 0% produced 23 following + 0 discovery.
- Switched between two test accounts. The second account started at the default, retained its independently chosen 100%, and the first restored its own default.
- Fixed stale feed status on settings/source views so account switching does not show the previous account's old feed counts there.
- No browser console errors observed during these checks.

## Live X verification

- The account loaded the original 9.1% default. Set 25% through keyboard input and refreshed: 25% restored correctly.
- Collected 41 native For You posts; 28 authors had verified not-following metadata. Existing mute, duplicate and followed-actor filters left 22 eligible discovery posts alongside 115 visible following activities.
- At 25%, the first discovery appeared at position 4 (after three following activities). The feed showed 115 following + 22 discovery and explained the recommendation shortage.
- At 0%, 115 following + 0 discovery appeared, with exactly the same following ID order as the blended view.
- At 100%, 0 following + 22 discovery appeared.
- A fresh X tab restored 25%, proving local preference persistence independently of the original tab's session cache.
- Reset restored 9.1% and survived refresh. Left the user's account at the original default.
- No console errors observed during the final checks. The private live screenshot is outside the repository and is excluded from the ZIP.

## Scope

Synthetic tests prove the blending and controls, not an uninterrupted supply of X recommendations or full X parity. No real posts, replies, likes, reposts, follows or DMs were sent during this verification.
