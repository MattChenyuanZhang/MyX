# MyX 0.3.2 verification

The build changes four areas: activity records, mute filtering, native controls within the MyX shell, and a minimal right sidebar. This report distinguishes observed results from complete-history claims.

## Automated checks

20 tests passed with `npm test`; `npm run check` passed runtime syntax, MV3, packaged asset existence, and least-privilege permissions. Tests cover:

- Real-shaped repost wrappers: activity ID/date separate from original post ID/date.
- Reply classification from `in_reply_to_status_id_str`.
- Ads, tombstones, and quoted items excluded as independent activities.
- Separate reposters retained; overlapping rendered windows merged without inventing dates.
- Chronological ordering when every item has confirmed activity metadata; native sequence fallback otherwise.
- Exclusion of known non-followed context rows.
- Shared like/bookmark state across multiple activity rows for the same post.
- Author/actor mutes for posts, replies, reposts, and discovery; spacing recomputed after exclusions.
- Per-account persistent mutes, per-tab post caches, foreign-origin message rejection, and tab cleanup.
- Passive fetch observer: original response returned unchanged, no additional requests, and no authentication header copied into the bridge.

## Browser verification

### Synthetic-provider checks

- Automatic X-mute import reads only rows with an actual Unmute control; suggested-user Follow rows are not imported as mutes.
- A muted original author disappeared immediately; muting the reposter hid that actor's repost.
- Mutes survived reload; account reset retained separate account identity.
- Native History appeared within MyX's center pane, preserving the left navigation and search/checkbox-only right sidebar.
- A composer initially opened behind the reader because X-style nested z-index contexts trapped its layer. The repaired fixture includes those contexts; after repair, `elementFromPoint` at the composer Cancel button returned that button, and MyX remained visible behind it.

### Live X observations on 0.3.0

- 85 timeline records had 85 confirmed activity timestamps. After excluding known non-followed context rows, 65 followed-account activities were displayed.
- A real repost's activity time was 5:15 PM, while the original post's date was 4:44 PM. The activity header used the repost wrapper timestamp rather than the original post's date.
- Replies tab displayed 23 activities classified using response metadata, including replies without an explicit native feed label.
- Imported the account's existing X mute list without changing X mutes or follows.
- The right sidebar contained only search and the three feed checkboxes.
- Native reply composer opened for the exact selected post with MyX's reader still mounted. Screenshot review found it visually hidden behind X's ancestor stacking context. This was a real failure, repaired in 0.3.1; the initial DOM-only observation did not constitute a visual pass.

### Final installed 0.3.1 checks

- Reply composer was visibly above the MyX reader for the exact selected live post. Both native stacking ancestors were marked; a hit test at Close returned the real Close button. Closed without publishing.
- History opened X's actual Bookmarks and Likes tabs inside the MyX center pane; Likes became selected, and Back to feed restored the collected timeline.
- Muting a followed author immediately reduced the eligible timeline from 31 to 29 activities and removed both visible posts. The test mute was then removed. Existing X mutes were left unchanged.
- After collecting the user's own For You feed: 85/85 activity times confirmed, 65 eligible following activities, 39 For You records, 20 verified discovery authors, and six discoveries at positions 11, 22, 33, 44, 55, 66.
- Like and bookmark changes reached the live native controls and were reversed. Repost menu and quote composer opened; no repost, quote, reply, or new post was published.

### Account search and profile links in 0.3.2

- The previous sidebar input only filtered collected posts. It now submits X People search, including accounts absent from the collected window, inside the MyX center pane.
- Matched accounts from collected authors, reposters, mentions, and reply recipients appear only in response to a typed query. These are search matches, not follow recommendations.
- Author names, handles, avatars, reposter names, reply recipients, and @mentions link to native X profiles inside MyX. Native profile information and follow controls remain X's own UI.
- Local browser checks opened matched reposter and reply-recipient profiles and a native-style People search result page while retaining the MyX shell. A DOM text-joining bug initially produced the wrong reply-recipient handle; parsing visible text fixed it, and the browser then opened the exact expected profile. Unit checks cover matching, duplicates, query encoding, mention boundaries, and preservation of unsafe markup as plain text.
- Final installed-X verification of the new 0.3.2 search UI requires reloading the unpacked extension. The 0.3.1 live passes above do not by themselves verify the new search UI.

## Scope and limits

This is a timeline of activities X has returned to the browser, not a certified complete archive of every followed user's historical posts/replies/reposts. Unknown activity dates retain X's observed order; completeness and metadata coverage are shown in the reader. The extension cannot recover records X never supplies, hidden/deleted posts, or inaccessible history.

Discovery comes exclusively from the signed-in user's X For You source, never an invented MyX recommendation. It is inserted after each ten eligible following activities when verified non-followed candidates are available. That is ten following plus one discovery (one in eleven total), matching the original requested spacing.

History uses X's actual History page, including its native tabs and pagination, inside MyX's layout; it is not a separate local reconstruction of all browsing history. Native provider limits still apply.

X mute imports are bounded snapshots; refresh after changing mutes elsewhere. MyX's own mutes update immediately across the extension's tabs and persist per account locally. Mutes hide both original authors and activity actors.

Real reply/quote/post publishing and follow/unfollow changes require user-chosen test targets/content and remain outside these non-publishing checks. Existing 0.1 live like/bookmark tests were restored and verified after reload. No test posts or relationship changes were published in this run.

No private feed records, account identifiers, source-response dumps, or screenshots are committed to the public repository. Evidence images are local outside the repository.
