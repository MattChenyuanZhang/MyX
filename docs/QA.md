# MyX verification — November 23, 2026

Status: preview build; full user acceptance is NOT complete.

## Acceptance targets

- Each Chrome user signs directly into X; no OpenAI login or API keys.
- Following posts, replies, and reposts presented chronologically.
- One post from the user's real For You feed after each ten following posts, excluding known following activity and authors verified as followed.
- Working reply, repost/undo, like/unlike, bookmarks, quote, sharing, conversations, new posts, uploads, and native follow/unfollow.
- Public source repository and installable package without private user data.

## Automated checks

`npm test`: seven tests passed. They cover chronological ordering, discovery positions and order, relationship and duplicate exclusions, filters before spacing, state-preserving merge, canonical status URL restrictions, account reset, tab-isolated session storage, off-site message rejection, and cleanup on tab close.

`npm run check`: passed JavaScript syntax, manifest file existence, MV3, and least-privilege permission checks. Re-run after packaging changes.

These tests do not simulate X's servers or certify provider acceptance.

## Browser evidence (synthetic provider)

Chrome ran `tests/fixture.html`, using the production content scripts and a fictional X DOM plus a session-storage runtime simulator. No real account data was used in this fixture.

Observed outcomes:

- Collected 23 Following posts; rendered newest first despite reversed source order.
- Collected five For You entries. Profile verification distinguished three non-followed authors from a followed author and excluded a duplicate following post.
- Verified discoveries appeared in positions 11 and 22, with 23 following posts total.
- Like changed the exact target post's native button to Unlike; unlike restored it.
- Bookmark changed the native control and MyX displayed Remove bookmark.
- Reply opened the native simulated composer and a fictional reply submitted successfully.
- Replies filter selected the one reply entry after repair.
- Post text resembling an HTML event handler stayed plain text, with no injected executable image.
- Reload preserved the collection and verified relationships.
- Switching synthetic accounts reset the displayed collection to zero immediately.

Defects found and repaired:

1. Reply detection relied on newlines in textContent. It now checks the actual reply-context elements.
2. Underlying X controls could receive keyboard focus through the reader. The body is inert while MyX is open, restored when native X is shown.
3. Suggested-user follow buttons could be mistaken for the profile's relationship. UserCell controls are excluded.
4. Cached state could invert the wrong Like/Bookmark action after navigation. The requested desired state is carried and compared before acting.
5. Programmatic page-generated clicks could reach extension handlers through the shared DOM. Sensitive UI handlers now require trusted user events.
6. A refreshed For You collection could retain its previous ordering and relationship snapshots. Refresh now replaces those source snapshots before collection.

The final two small repairs received syntax/model checks; the subsequent full browser rerun was blocked by the browser security gate. Do not represent that rerun as passed.

## Live X inspection

The user signed in directly on X. Read-only inspection confirmed the current English-language account menu, Following / For You tabs, canonical timestamp links, and native reply, retweet, like, bookmark selectors. A real profile displayed a distinct relationship control separate from suggested-user buttons.

The extension itself was NOT confirmed installed on live X. Opening Chrome's extension manager was rejected by the browser safety policy, which forbids alternate installation workarounds. A later local browser rerun was also rejected by that gate. The user must complete Load unpacked before live validation can resume.

No real tweets, replies, reposts, follows, or uploads were created for testing. A live like/bookmark test, if requested, should target a user-selected post and restore its starting state. Follow/unfollow and public publishing need an explicit test target and content.

## Unverified or incomplete targets

- Extension installation and live storage/message wiring in Chrome.
- Live post actions, account switching, native drafts, uploads, conversation pagination, repost/undo, quote submission, share clipboard, follow/unfollow, and popup launch.
- Complete recovery of every followed-account reply: X's home timeline may omit replies, and MyX cannot recover posts never loaded by X.
- Repost activity timestamp chronology: the DOM exposes the original post time. MyX labels and sorts by that timestamp, which does not meet exact activity-time chronology.
- Unlimited discovery and complete history: collections are bounded and X virtualizes its feeds.
- Responsive/dark-mode screenshot verification and real-network failure/reversion handling.

## Resume checklist

1. Load `extension/` unpacked in Chrome, refresh signed-in X, and open MyX.
2. Collect both sources; verify discovery profiles. Compare post IDs and source membership without exporting private content.
3. Verify native action forwarding against a user-approved disposable post and confirm final state on X, including reload and server failures.
4. Test new post/media drafts, quote/repost menus, native conversation and follow controls without publishing unwanted content.
5. Confirm independent sessions using two user-controlled accounts; check local storage cleanup on tab close.
6. Recheck final UI, accessibility, search, filters, no-discovery and no-post states.
7. Report the coverage limitations rather than declaring full parity.
