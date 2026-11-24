# MyX verification — November 23, 2026

Status: installed Chrome extension verified against live X. Full user acceptance remains incomplete because complete reply coverage and exact repost activity timestamps are unavailable from the collected DOM.

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

## Installed-extension verification on live X

The user installed the unpacked extension and signed directly into X. Live Chrome checks on November 23, 2026 verified:

- Installation/content-script activation and account detection without an OpenAI login or developer keys.
- Collection of 27 Following posts and 12 actual For You posts through native X timeline tabs.
- Native profile relationship verification; two eligible discovery authors were available.
- Original post timestamps were nonincreasing across the rendered following feed; discovery appeared at positions 11 and 22.
- Session state and the collection survived full-page navigation and reload.
- Exact-post Like activated X's Unlike state; Unlike restored the original state.
- Exact-post Bookmark activated X's Remove Bookmark state; removing it restored the original state.
- A subsequent fresh load found the exact post and confirmed unliked, unbookmarked, and not reposted. All test reaction changes were restored.
- Reply opened X's composer addressed to the correct post/account; it was closed empty.
- Repost opened the exact post's native Repost/Quote menu. No repost was submitted.
- Quote opened the native composer with the correct quoted post; it was closed without publishing.
- New-post navigation opened the native X composer. A generated 64-by-64 PNG uploaded successfully and produced native Edit media / Remove media controls. The attachment was removed and the empty composer closed; no post was published.
- Search narrowed the reader to the expected matching post.
- Share successfully wrote the canonical post link to the clipboard.
- Open conversation loaded X's real Conversation timeline for the selected post.
- The repost filter displayed eight collected reposts, each carrying the original-timestamp limitation label.
- A live reader screenshot was reviewed. Private screenshot evidence is outside the public repository.

No user's feed content, account identifier, post identifiers, or private screenshots are included in this report or the public repository.

The earlier browser-security installation blocker was resolved by the user installing the extension manually. No prohibited browser workaround was used. Current live checks also exercised the trusted-event handlers, desired-state comparison, profile relationship checks, and refreshed For You behavior after the local repairs.

## Incomplete or untested targets

- Full recovery of every followed-account reply: X's home timeline may omit replies. Thread context can also render original posts by accounts the user does not follow. The current reader collects rendered articles and cannot promise a strictly exhaustive followed-author-only set.
- Exact repost activity chronology: X's rendered timestamp is the original post time. The reader labels and sorts by that time; this does not meet activity-time chronology.
- Reply/quote/new-post publishing, actual repost/undo, and follow/unfollow were not exercised against real accounts. Native composers/menus opened, but that is not proof of publication or relationship mutation success.
- Two independent live account sessions, toolbar popup launch, dark/mobile layouts, server-rejected actions, and delayed action reversions remain untested. Synthetic account-isolation checks passed.
- Unlimited discovery and complete history remain outside the bounded, virtualized collection. Relationship verification is a snapshot and can become stale after actions elsewhere.

## Resume checklist

1. Keep the installed `extension/` build current; reload it in Chrome after runtime file changes.
2. Recheck source membership and reply coverage on additional user-controlled timelines without exporting private content.
3. Use a user-approved disposable post and explicit test content for any publishing/reposting checks; confirm server failures and delayed reversions.
4. Test new post/media drafts, quote/repost menus, native conversation and follow controls without publishing unwanted content.
5. Confirm independent sessions using two user-controlled accounts; check local storage cleanup on tab close.
6. Recheck final UI, accessibility, search, filters, no-discovery and no-post states.
7. Report the coverage limitations rather than declaring full parity.
