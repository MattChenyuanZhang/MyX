# MyX 0.7.1 verification

Local and final signed-in X verification completed on 2026-11-26 after reloading the installed 0.7.1 extension.

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

## Final live X verification

- The installed build rendered clickable post cards and exactly one range input per account popup. The popup stayed open and usable across separate interactions.
- Native Following refreshes merged 47, then 29 additional activities into the reader. Success status and account checks remained active.
- Setting a test account to 0% removed its visible activities. Feed settings retained its 0% rule after a page reload; Reset restored its activity.
- Setting that account to 40% survived reload and retained the same selected activity IDs. That account had only one collected activity and the stable random sample excluded it, consistent with a probability rather than an exact small-batch quota. Automated tests cover approximately equal sampling rates across thousands of posts/replies/reposts.
- Restored the test account's original 100% setting after verification. No real posts, replies, likes, reposts, follows or DMs were submitted.
- Clicking a post's text opened its actual X status URL under the MyX Conversation heading. The native center pane displayed 18 post cards, replies, and X's reply composer, with MyX navigation retained.
- Played a real X MP4 inside a feed card. It reached readyState 4 and played to its 10.98-second duration. Video controls did not trigger post-card navigation.
- Screenshots remain outside the repository and installable ZIP. The ZIP is checked against all final runtime files and retains only the storage permission.

## Scope

The reader can show only the Following activity X returns. Existing collection/cache bounds remain; this is not a complete archive of every followed reply. X stream-only or expired video sources use the original player inside MyX. Per-account percentages are inclusion probabilities, not exact quotas for small batches. See QA-0.7.md for the refresh/video implementation and initial investigation.
