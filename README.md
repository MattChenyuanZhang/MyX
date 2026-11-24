# MyX

A Chrome Manifest V3 extension that reads posts rendered by your signed-in X session, builds a local chronological reader, and delegates interactions to X's native post controls. No X developer account, API key, OpenAI login, or paid backend is required.

## Install in Chrome

1. Download and extract `myx-extension.zip` from the release or repository.
2. Open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**.
3. Select the folder containing `manifest.json` (the repository's `extension/` folder).
4. Sign in directly at https://x.com and refresh that tab. Click the **MyX** button in the lower right.
5. Open **Feed sources**, collect **Following**, collect **For You**, then **Verify up to 5 discovery authors**. Verification visits candidate profiles without following anyone. Repeat to verify more candidates.
6. Open **Home**. Eligible discoveries appear after every ten visible following posts. Collection is incremental; rerun it to gather more rendered posts.

Every user installs the extension and signs into their own X browser session. This is not a hosted multi-user proxy, and the earlier MyX demo website is not the extension.

## Interaction behavior

- Like/unlike and bookmark/unbookmark activate the exact post's native control and wait for X's changed button state. A timeout is reported without claiming success.
- Reply opens X's composer. You write and submit your reply on X.
- Repost opens X's native repost/undo menu; quote opens the quote composer.
- Share copies the canonical post URL. Conversation opens the original post and native thread.
- New posts and media uploads use X's native composer. Profile links open X's native profile with follow/unfollow controls.
- If the post is no longer in the rendered timeline, MyX navigates to the canonical post, checks the current account and exact post ID, then activates only the requested control. It never acts on a guessed post.

## Coverage limits: not full X parity

X virtualizes and selectively loads its feeds. This extension cannot guarantee all followed-account replies, a complete historical archive, or an uninterrupted supply of recommendations. It captures up to 12 screens per collection and retains at most 600 posts per source per tab. Followed-only posts remain in timestamp order; discovery preserves its collected For You rank.

X renders the original post time for reposts, not the repost activity time. MyX therefore sorts reposts by original post time and labels that limitation. Exact chronology of repost activity is not achieved.

Discovery is taken only from the actual For You tab. Unknown relationship status is excluded until verified. Authors of captured following posts or reposts and posts already present in Following are excluded. Verification is a snapshot: following someone later in another tab may make the relationship stale; recollect/clear to refresh. X can change its UI, language, policies, or session behavior. English X UI is currently required.

Read-only collection and simulated-provider tests do not prove that every native action succeeds on X. See `docs/QA.md` for the verified and unverified boundaries. No claim of full end-to-end parity should be made while live checks remain incomplete.

## Privacy

Only `storage` permission and a content script on `https://x.com/*` are declared. No cookie access, network interception, private API calls, passwords, access tokens, telemetry, or external servers. Collected data is in Chrome session storage, isolated by tab and observed X account. Closing a tab removes its stored data. Account changes clear its collection. Preferences are session-local too. Reading X's DOM is necessary for this functionality; protected posts may be present locally, so post content and screenshots must never be committed to Git.

The popup creates a new X tab. Browser/account switching and X drafts remain under your control. No actions run in the background unless you explicitly request collection, profile verification, or a particular post action.

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
