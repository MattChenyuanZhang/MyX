# MyX 0.7.1 verification

Local verification completed on 2026-11-26. Final live verification awaits the installed-extension reload. The public latest download remains 0.6.0 until that check passes.

## Final behavior

- One account visibility slider, from 0% to 100%, applies the same inclusion probability to all posts, reposts and replies by that followed account. Reposts use the followed actor's setting. Seeded activity ranks make samples stable across reloads and nested when the percentage decreases. Small batches need not contain exactly the requested fraction.
- Saved 0.7.0 development settings migrate from three per-type rates to their arithmetic mean, including default-100 values for unset types, without changing the seed. Setting the new slider replaces the old fields. Existing mute, discovery and global activity filters remain active.
- Clicking a post's text/background or pressing Enter on its focused card opens X's full conversation and replies inside MyX. Profile links, actions, video controls and selected text are excluded from the card-navigation handler.
- Clicking the gear pins the settings popup, preventing hover timers or other account hovers from interrupting adjustment. Done, Escape or outside interaction closes it.
- The 0.7.0 Following refresh and inline-video changes remain included; their initial live verification is recorded in QA-0.7.md.

## Automated checks

`npm test`: 47 passing tests. `npm run check`: syntax, assets and unchanged storage-only permissions passed. New tests verify one percentage across all activity types, migration, stable random ranks, endpoint behavior, repost ownership and account-isolated persistence. Existing refresh, timeout, concurrency, video, discovery, mute, navigation and profile tests remain green.

## Browser preview checks

- The account popup contains exactly one range input. Set it to 40%, applied, reloaded, and observed the same included activity IDs across posts, replies and reposts.
- 0% hid every activity from the test account. Feed settings exposed the saved 0% rule and Reset restored the account to 100%.
- Whole-post mouse click and Enter both opened a native-shaped conversation with its test replies visible. Playback controls still started the local test video without opening a conversation.
- Popup remained open and usable across separate tool calls after it was clicked, fixing the live-discovered disappearing-popup problem.
- The preview MP4 is generated test content and is excluded from the installable ZIP. Screenshots are stored outside the repository.

## Remaining live check

Reload 0.7.1, confirm fresh native Following activity, play a real MP4, test the single bar and persisted 0%/restore behavior, and click a post's body to verify real native comments. Do not claim the newly changed UI passed live until these checks finish.
