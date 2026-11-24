# MyX

A Chrome Manifest V3 extension that reads your signed-in X timeline, keeps native interactions and History inside the MyX shell, and offers account mute filtering. No X developer account, API key, OpenAI login, or paid backend is required.

## Install in Chrome

1. Download and extract `myx-extension.zip` from the release or repository.
2. Open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**.
3. Select the folder containing `manifest.json` (the repository's `extension/` folder).
4. Sign in directly at https://x.com and refresh that tab. Click the **MyX** button in the lower right.
5. Open **Feed sources**, collect **Following**, collect **For You**, then **Verify up to 5 discovery authors**. Verification visits candidate profiles without following anyone. Repeat to verify more candidates.
6. Open **Home**. Eligible discoveries appear after every ten visible following posts. Collection is incremental; rerun it to gather more rendered posts.

Every user installs the extension and signs into their own X browser session. This is not a hosted multi-user proxy, and the earlier MyX demo website is not the extension.

## Interaction behavior

- Like/unlike and bookmark/unbookmark keep MyX visible, activate the exact post's native control and wait for X's changed button state. A timeout is reported without claiming success.
- Reply opens X's real composer above the MyX reader. You write and submit in that composer without leaving the MyX layout.
- Repost opens X's native repost/undo menu; quote opens the quote composer.
- Share copies the canonical post URL. Conversation opens the real thread in the center of the MyX shell. History and Bookmarks use the same native center pane, preserving X's own tabs and pagination.
- New posts and media uploads use X's native composer above MyX. Author names, avatars, handles, reposter names, reply recipients, and @mentions open the native profile in the MyX center pane with real account details and follow/unfollow controls.
- The sidebar searches real X accounts. Type a name or handle to see matching accounts already encountered; press Enter or choose **Search accounts on X** for X's People results, including accounts outside the collected feed. No follow-recommendation panel is added.
- If the post is no longer in the rendered timeline, MyX navigates to the canonical post, checks the current account and exact post ID, then activates only the requested control. It never acts on a guessed post.

## Coverage limits: not full X parity

X virtualizes and selectively loads its feeds. This extension cannot guarantee all followed-account replies, a complete historical archive, or an uninterrupted supply of recommendations. It captures up to 12 screens per collection and retains collected activity in per-tab session storage (an 8 MB save limit applies). Discovery preserves its collected For You order. The default activity view sorts by exact activity timestamps when all items have response metadata; otherwise it preserves X's observed Following order. Unknown dates are never invented.

A read-only page-world observer extracts post/reply/repost records from copies of the timeline responses X already requested. For a repost, its wrapper ID and creation date identify the repost event separately from the original post. The reader displays confirmed activity-time coverage. Different reposters remain separate events. DOM-only fallback rows have no exact repost timestamp and remain in X's observed order. This is not a guarantee of a complete historical timeline: replies/posts X never returns remain unavailable.

## Muting

MyX imports the native X muted-account list before collection (refreshed when more than five minutes old), and offers a separate persistent MyX mute list. Both hide original authors and repost actors before discovery spacing is calculated. The settings page can import X mutes again manually. Imports are bounded snapshots of rows X exposes; they do not unmute, unfollow, or change X settings. MyX mute preferences are stored locally per account and synchronized between this extension's tabs. Collected post data remains session-local.

Discovery is taken only from the actual For You tab. Unknown relationship status is excluded until verified. Authors of captured following posts or reposts and posts already present in Following are excluded. Verification is a snapshot: following someone later in another tab may make the relationship stale; recollect/clear to refresh. X can change its UI, language, policies, or session behavior. English X UI is currently required.

Read-only collection and simulated-provider tests do not prove that every native action succeeds on X. See `docs/QA-0.3.md` for the current verified and unverified boundaries (`docs/QA.md` records the earlier build). No claim of full end-to-end parity should be made while live checks remain incomplete.

## Privacy

Only `storage` permission and a content script on `https://x.com/*` are declared. No cookie access, extra/private API requests, password collection, access-token collection, telemetry, or external servers. The page-world observer wraps fetch/XHR only to parse copies of existing X timeline responses; it does not read request headers or bodies and returns X's original requests/responses unchanged. Collected data is in Chrome session storage, isolated by tab and observed X account. Closing a tab removes its stored data. Account changes clear its collection. Mute preferences persist in Chrome local storage under separate account keys; feed preferences remain session-local. Reading X's DOM is necessary for this functionality; protected posts may be present locally, so post content and screenshots must never be committed to Git.

The popup creates a new X tab. Browser/account switching and X drafts remain under your control. As you use X, the passive observer may populate the local cache from timeline responses X already requested. Collection, profile verification, and post actions run only when you request them.

## Development

Requires Node.js 20+; no dependency install.

```
npm test
npm run check
node scripts/preview.mjs
```

The preview at http://127.0.0.1:4174/home#myx simulates X with fictional posts and native control state transitions. It loads the same production content script. The simulator is not included in the installable extension ZIP.

## License

MIT. Independent project; not affiliated with X or OpenAI.
