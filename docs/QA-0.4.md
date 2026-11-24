# MyX 0.4.0 UI verification

This pass addresses startup consistency, X-style hover states and sidebar sizing. Private browser screenshots are stored outside the public repository.

## Fixes

- A single shared shell is mounted at document start and hydrated in place. The previous separate centered loading screen was removed. First `#myx` visits, refreshes and native profile routes use the same layout before account loading finishes.
- The sidebar now uses 20px labels, 26.25px SVG icons, 58.25px navigation rows, 50.25px hover pills and a 52px Post button. The 275px sidebar and 600px feed align with the measured native X columns at the tested desktop width. MyX retains its own name and navigation destinations.
- Hover states use neutral navigation pills, subtle post backgrounds, underlined profile links, and separate action-icon circles: pink for likes, green for reposts, blue for reply/bookmark/share controls.
- Active navigation and the page title track native profiles, search and History. Visiting a profile and returning to the feed restores the reading position.
- Back to X now persists the closed-reader state through refresh. Floating native Chat/Grok drawers are hidden while MyX is open.
- A repost-feedback defect was reproduced: the native control changed while MyX remained unselected. MyX now waits for the native state change and synchronizes every matching collected row; undo follows the same path.

## Automated checks

23 tests pass, including first-visit/refresh boot coverage and native route classification. Syntax checks now include every declared content script. Existing timeline, account-isolation, mutes, recommendation-spacing and passive-observer checks continue to pass. The extension still requests only `storage` permission.

## Browser checks against the local provider fixture

- Paused account loading on both a first feed visit and a profile refresh. The sidebar's position and size were identical before and after hydration: navigation x=239.5px, y=58px, width=259px, height=58.25px at the tested 1728px viewport.
- Search field measured 350×44px; Post button measured approximately 233.09×52px, matching the measured native X geometry.
- Navigation hover computed `rgba(15,20,25,0.1)`; post hover computed `rgba(0,0,0,0.03)`; like hover used the pink icon circle and label.
- Repost and undo both synchronized the reader's selected state after the native control changed.
- Profile return restored the exact prior scroll position (1013px). History received `aria-current=page` and Home no longer remained selected.
- Search result → native profile changed MyX's title to Profile. Native profile startup retained the same sidebar position as the feed.
- Back to X → refresh kept MyX closed; the launcher reopened it correctly.
- Signed-out startup displayed the X sign-in action after loading, without leaving the reader stuck on the loading state.
- No browser console errors were observed during these fixture checks.

## Final installed-extension checks

Passed against installed 0.4.0 in the signed-in desktop Chrome session:

- Opened a fresh X tab at the MyX launch URL and captured the loading state. The shared shell was already present, the old centered loader was absent, and sidebar bounds remained exactly x=239.5px, y=58px, width=259px, height=58.25px after account hydration.
- Confirmed native X-aligned 20px labels, 26.25px icons and a 600px center column. The sidebar remained in the same position when moving from the reader to a real profile.
- Navigation hover computed `rgba(15,20,25,0.1)` and post hover computed `rgba(0,0,0,0.03)` on live MyX cards.
- A native profile showed the Profile title and removed the stale Home selection. History received the correct active selection; refreshing it preserved both the History title and sidebar bounds through loading and hydration.
- Opened a native reply composer for the selected real post. Visual review and a hit test at Close confirmed the composer was above MyX. Closed it empty; no reply was published.
- Both native floating drawers computed `display:none` while MyX was open. No browser console errors were observed during the final live checks.

Repost/undo synchronization was exercised against the owned local provider fixture, not by publishing reposts on the live account. This pass did not publish posts or change follow relationships. Screenshots of the live session remain outside this public repository.

The timeline remains limited to activities X returns to the browser; see [the activity/data verification report](QA-0.3.md) for coverage and recommendation-source limits.
