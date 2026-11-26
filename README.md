# MyX

A Chrome Manifest V3 extension that reads your signed-in X timeline, keeps native interactions and History inside the MyX shell, and offers account mute filtering. No X developer account, API key, OpenAI login, or paid backend is required.

## Download and install

### [Download MyX for Chrome (.zip)](https://github.com/MattChenyuanZhang/MyX/releases/latest/download/myx-extension.zip)

No GitHub account, OpenAI login, API key, or command line is required.

1. **Unzip** the download and keep the folder somewhere permanent.
2. In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the extracted folder containing `manifest.json`.
3. Sign in at [x.com](https://x.com/home#myx), refresh the tab, then click **MyX** in the lower right or Chrome’s Extensions menu.

The download includes **START-HERE.html** with a browser-readable guide. [Full installation and update instructions →](docs/INSTALL.md)

This is an unpacked extension, not a Chrome Web Store listing. Normal “Add to Chrome” installation needs a Store release. Every person installs their own copy and uses their own X session; the earlier demo website is not the extension.

MyX refreshes **Following** when you open the reader and once per minute while its Home feed is visible. Use the ↻ button to refresh immediately. In **Feed sources**, collect **For You** for discovery; manual Following and older collections remain available. Verify unknown discovery authors when requested. Open **Feed settings** and drag **Discovery share** from 0% (following only) to 100% (discovery only). The live preview shows your target mix. The default is 10 following activities plus 1 discovery post (about 9.1% discovery); Reset restores it. Your choice is saved locally for each X account. Collect again to load more candidates.

Discovery comes from your own X For You feed. MyX spaces eligible recommendations between following activities while retaining their time order. The selected percentage is a target: when eligible discovery runs out, remaining following activities still appear without repeating recommendations. Replies and Reposts tabs retain their focused filters.

## Account proportions and videos

Hover or click the **⚙ at the end of a following activity** to set separate 0–100% inclusion chances for that account's posts, replies and reposts. A repost uses the followed reposter's settings, not the original author's. Each activity receives a seeded random rank; refreshes keep the same selection, lowering a percentage removes a subset, and 0%/100% mean none/all. Percentages are probabilities, not exact quotas for a small batch. Global mute and activity filters still apply first. Choices persist locally per signed-in X account and synchronize between MyX tabs. **Feed settings → Account proportions** lets you restore accounts even when all their activity is hidden.

Videos with MP4 variants supplied by X play inside feed cards with native controls, sound and fullscreen. No video is automatically downloaded or played by MyX. For stream-only, unavailable or expired sources, **Open original video player** opens X's native post/player inside the MyX shell.

New Following activity merges into the existing cache. While you're scrolled down, watching a video or adjusting an account's settings, **Show latest posts** waits for you to apply the update rather than resetting the feed. Refresh temporarily opens an inactive X tab, reads its native Following timeline, and closes the owned tab unless you activated it. Closing a reader cancels its outstanding refresh. A refresh failure is shown explicitly and leaves the existing feed intact.

## Interaction behavior

- Like/unlike and bookmark/unbookmark keep MyX visible, activate the exact post's native control and wait for X's changed button state. A timeout is reported without claiming success.
- Reply opens X's real composer above the MyX reader. You write and submit in that composer without leaving the MyX layout.
- Repost opens X's native repost/undo menu; quote opens the quote composer.
- Click a post’s text or background (or press Enter on a focused post) to open X’s full conversation, replies and reply composer in the center of MyX. Profile links, action buttons, video controls and text selection keep their own behavior. Share copies the canonical post URL. The Conversation action opens the same real thread. History and Bookmarks use the same native center pane, preserving X's own tabs and pagination.
- New posts and media uploads use X's native composer above MyX. Author names, avatars, handles, reposter names, reply recipients, and @mentions open the native profile in the MyX center pane with real account details and follow/unfollow controls.
- Hover a name, avatar, reposter, reply recipient, or account search match to preview the real profile. Cards show available bio and follower/following counts and link to the full native profile. Keyboard focus also opens previews; Escape closes them.
- **Lists** and **Messages** in the sidebar open X's native interfaces inside MyX. Messages uses X's own messaging/security flow and a wider, compact-sidebar layout; MyX does not copy DM contents into its collected feed.
- The sidebar searches real X accounts. Type a name or handle to see matching accounts already encountered; press Enter or choose **Search accounts on X** for X's People results, including accounts outside the collected feed. No follow-recommendation panel is added.
- If the post is no longer in the rendered timeline, MyX navigates to the canonical post, checks the current account and exact post ID, then activates only the requested control. It never acts on a guessed post.

## Coverage limits: not full X parity

X virtualizes and selectively loads its feeds. This extension cannot guarantee all followed-account replies, a complete historical archive, or an uninterrupted supply of recommendations. It captures up to 12 screens per collection and retains collected activity in per-tab session storage (an 8 MB save limit applies; before reaching it, the reader discards older cached activity to retain newer posts). Discovery preserves its collected For You order. The default activity view sorts by exact activity timestamps when all items have response metadata; otherwise it preserves X's observed Following order. Unknown dates are never invented.

A read-only page-world observer extracts post/reply/repost records from copies of the timeline responses X already requested. For a repost, its wrapper ID and creation date identify the repost event separately from the original post. The reader displays confirmed activity-time coverage. Different reposters remain separate events. DOM-only fallback rows have no exact repost timestamp and remain in X's observed order. This is not a guarantee of a complete historical timeline: replies/posts X never returns remain unavailable.

## Muting

MyX imports the native X muted-account list before collection (refreshed when more than five minutes old), and offers a separate persistent MyX mute list. Both hide original authors and repost actors before discovery spacing is calculated. The settings page can import X mutes again manually. Imports are bounded snapshots of rows X exposes; they do not unmute, unfollow, or change X settings. MyX mute preferences are stored locally per account and synchronized between this extension's tabs. Collected post data remains session-local.

Discovery is taken only from the actual For You tab. Unknown relationship status is excluded until verified. Authors of captured following posts or reposts and posts already present in Following are excluded. Verification is a snapshot: following someone later in another tab may make the relationship stale; recollect/clear to refresh. X can change its UI, language, policies, or session behavior. English X UI is currently required.

Read-only collection and simulated-provider tests do not prove that every native action succeeds on X. See `docs/QA-0.7.md` for refresh, video and account-proportion verification, `docs/QA-0.6.md` for feed-mix checks, `docs/QA-0.5.md` for preview, navigation and download checks and `docs/QA-0.4.md` for startup/UI checks and `docs/QA-0.3.md` for activity/data verification (`docs/QA.md` records the earlier build). No claim of full end-to-end parity should be made while live checks remain incomplete.

## Privacy

Only `storage` permission and a content script on `https://x.com/*` are declared. No cookie access, direct private-API calls, password collection, access-token collection, telemetry, or external servers. The page-world observer wraps fetch/XHR only to parse copies of existing X timeline responses; it does not read request headers or bodies and returns X's original requests/responses unchanged. Collected data is in Chrome session storage, isolated by tab and observed X account. Closing a tab removes its stored data. Account changes clear its collection. Mute preferences, account proportions and their sampling seed, and discovery-ratio choices persist in Chrome local storage under separate account keys; other feed preferences remain session-local. Reading X's DOM is necessary for this functionality; protected posts may be present locally, so post content and screenshots must never be committed to Git.

Profile previews use public profile fields from already-received timelines when available. For a missing profile, a preview can open a temporary inactive X tab, read its native profile, and close the tab; a tab explicitly opened by the user is left open. Profile caches remain account/tab-local and are limited to 100 entries. No messaging content is captured by this lookup.

The popup creates a new X tab. Browser/account switching and X drafts remain under your control. As you use X, the passive observer may populate the local cache from timeline responses X already requested. Following refresh runs when you open the reader and periodically while its Home view is visible. Manual collection, profile verification, and post actions run when requested. Profile details may load after you hover or focus a profile link.

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
