// Provider simulator for browser tests only. Never included in the installable extension ZIP.
let releaseLoading;
const loadingGate = new URLSearchParams(location.search).has("hold")
  ? new Promise((resolve) => {
      releaseLoading = resolve;
    })
  : Promise.resolve();
if (releaseLoading) {
  const release = document.createElement("button");
  release.id = "release-loading";
  release.textContent = "Finish loading test account";
  release.style.cssText =
    "position:fixed;bottom:10px;right:10px;z-index:2147483640";
  release.onclick = () => {
    releaseLoading();
    release.remove();
  };
  document.documentElement.append(release);
}
window.chrome = {
  runtime: {
    sendMessage: async (m) => {
      if (m.type === "RULES_GET" || m.type === "RULE_SET") {
        const key = "fixture-rules-" + m.account;
        const value = JSON.parse(
          localStorage.getItem(key) || '{"seed":"fixture-seed","accounts":{}}',
        );
        if (m.type === "RULE_SET") {
          value.accounts[m.handle] = {
            ...value.accounts[m.handle],
            [m.kind]: m.percent,
          };
          localStorage.setItem(key, JSON.stringify(value));
        }
        return value;
      }
      if (m.type === "FEED_REFRESH") {
        if (new URLSearchParams(location.search).has("refresh-error"))
          return { error: "Simulated X refresh unavailable. Try again." };
        const count =
          Number(sessionStorage.getItem("fixture-refresh") || 0) + 1;
        sessionStorage.setItem("fixture-refresh", String(count));
        const now = Date.now();
        const baseTime =
          Number(sessionStorage.getItem("fixture-base-time")) || now;
        sessionStorage.setItem("fixture-base-time", String(baseTime));
        const base = Array.from({ length: 18 }, (_, i) => ({
          id: String(300 + i),
          eventId: String(300 + i),
          eventTime: baseTime - 60000 - i * 1000,
          time: baseTime - 60000 - i * 1000,
          handle: "friend",
          kind: i < 6 ? "post" : i < 12 ? "reply" : "repost",
          actor: i >= 12 ? "friend" : null,
          followedActor: true,
          text: "Fixture account sampling activity " + i,
          name: "Friend",
          video: i === 0,
          videos:
            i === 0
              ? [
                  {
                    src: "https://video.twimg.com/test-fixture.mp4",
                    poster: "",
                  },
                ]
              : [],
        }));
        return {
          account: m.account,
          items: [
            {
              id: String(800 + count),
              eventId: String(800 + count),
              eventTime: now,
              time: now,
              handle: "latestwriter",
              name: "Latest Writer",
              kind: "post",
              followedActor: true,
              text: "Newly refreshed activity " + count,
            },
            ...base,
          ],
        };
      }
      if (m.type === "MIX_GET")
        return JSON.parse(
          sessionStorage.getItem("fixture-mix-" + m.account) || "null",
        );
      if (m.type === "MIX_SET") {
        sessionStorage.setItem(
          "fixture-mix-" + m.account,
          JSON.stringify({ percent: m.percent, enabled: m.enabled }),
        );
        return { ok: true };
      }
      if (m.type === "PROFILE_GET")
        return {
          profile: {
            handle: m.handle,
            name: "Profile " + m.handle,
            avatar: "",
            bio: "A real-shaped test biography with @friend.",
            followingCount: "126",
            followersCount: "4,217",
            following: true,
            capturedAt: Date.now(),
          },
        };
      if (m.type === "MUTES_GET")
        return JSON.parse(
          sessionStorage.getItem("fixture-prefs-" + m.account) ||
            '{"muted":[],"xMuted":[]}',
        );
      if (m.type === "MUTES_SET") {
        sessionStorage.setItem(
          "fixture-prefs-" + m.account,
          JSON.stringify({ muted: m.muted, xMuted: m.xMuted }),
        );
        return { ok: true };
      }
      if (m.type === "GET") {
        await loadingGate;
        return JSON.parse(sessionStorage.getItem("fixture-myx") || "null");
      }
      if (m.type === "SET")
        sessionStorage.setItem("fixture-myx", JSON.stringify(m.data));
      if (m.type === "CLEAR") sessionStorage.removeItem("fixture-myx");
      return { ok: true };
    },
  },
};
const composer = document.querySelector("#composer");
composer.showModal = function () {
  this.hidden = false;
  this.open = true;
};
composer.close = function () {
  this.hidden = true;
  this.open = false;
};
let account = sessionStorage.getItem("fixture-account") || "alice";
document.querySelector(
  '[data-testid="SideNav_AccountSwitcher_Button"]',
).textContent = new URLSearchParams(location.search).has("signedout")
  ? "Sign in"
  : "Test " + account + " @" + account;
document.querySelector("#switch").onclick = () => {
  account = account === "alice" ? "bob" : "alice";
  sessionStorage.setItem("fixture-account", account);
  document.querySelector(
    '[data-testid="SideNav_AccountSwitcher_Button"]',
  ).textContent = "Test " + account + " @" + account;
};
if (new URLSearchParams(location.search).has("signedout"))
  document.querySelector('[data-testid="AppTabBar_Profile_Link"]').remove();
const native = document.querySelector("#timeline");
let src = "Following";
const notice = (s) => (document.querySelector("#notice").textContent = s);
function card(i, who = "writer" + i) {
  const id = String(i);
  let type = i === 3 ? "reply" : i === 4 ? "repost" : "post";
  return `<article data-testid="tweet">${type === "repost" ? '<a href="/friend"><span data-testid="socialContext">Friend reposted</span></a>' : ""}<div data-testid="User-Name"><a href="/${who}">Writer ${i}</a><a href="/${who}">@${who}</a><a href="https://x.com/${who}/status/${id}"><time datetime="2026-11-23T${String(20 - Math.floor(i / 60)).padStart(2, "0")}:${String(59 - (i % 60)).padStart(2, "0")}:00Z">now</time></a></div>${type === "reply" ? "<div>Replying to @friend</div>" : ""}<div data-testid="tweetText">${i === 5 ? "&lt;img src=x onerror=alert(1)&gt; This must stay plain text." : "Collected post " + i + " — a thought from the people you follow."}</div><div role="group"><button data-testid="reply" aria-label="Reply">2</button><button data-testid="retweet" aria-label="Repost">3</button><button data-testid="like" aria-label="Like">4</button><button data-testid="bookmark" aria-label="Bookmark"></button></div></article>`;
}
function show() {
  if (location.pathname === "/settings/muted/all") {
    native.innerHTML =
      '<h2>Muted accounts</h2><div data-testid="UserCell"><a href="/mutedwriter">@mutedwriter</a><button aria-label="Unmute">Unmute</button></div><div data-testid="UserCell"><a href="/suggested">@suggested</a><button>Follow</button></div>';
    return;
  }
  if (
    location.pathname === "/i/history" ||
    location.pathname === "/i/bookmarks"
  ) {
    native.innerHTML =
      "<h2>History</h2><button>Bookmarks</button><button>Likes</button>" +
      card(1);
    return;
  }
  if (location.pathname === "/compose/post") {
    document.querySelector("#composer").showModal();
    return;
  }
  const match = location.pathname.match(/^\/([^/]+)\/status\/(\d+)$/);
  if (match) {
    native.innerHTML = card(Number(match[2]), match[1]);
    return;
  }
  if (location.pathname === "/i/lists") {
    native.innerHTML =
      '<h2>Lists</h2><button id="fixture-new-list">Create a new List</button><p>Your Lists</p>';
    native.querySelector("button").onclick = () => {
      native.innerHTML =
        '<h2>Create a new List</h2><input aria-label="List name"><button id="fixture-create-list">Create</button>';
      native.querySelector("button").onclick = () => {
        notice("Test list created");
        show();
      };
    };
    return;
  }
  if (location.pathname.startsWith("/i/chat")) {
    document.querySelector(
      '[data-testid="SideNav_AccountSwitcher_Button"]',
    ).textContent = "Test " + account;
    document
      .querySelector('[data-testid="AppTabBar_Profile_Link"]')
      .setAttribute("href", "/" + account);
    native.innerHTML =
      '<h2>Messages</h2><p>Test conversation</p><textarea aria-label="Message text"></textarea><button id="fixture-send-message">Send</button>';
    native.querySelector("button").onclick = () => {
      notice("Test message sent");
      native.querySelector("textarea").value = "";
    };
    return;
  }
  if (location.pathname === "/search") {
    native.innerHTML =
      '<h2>Search accounts</h2><a href="/friend">Friend @friend</a>';
    return;
  }
  const profile =
    location.pathname !== "/home" &&
    location.pathname.match(/^\/([A-Za-z0-9_]{1,15})$/);
  if (profile) {
    let h = profile[1];
    native.innerHTML = `<div data-testid="UserName">${h} @${h}</div><p>Test profile biography</p><button data-testid="123-${h === "followed" ? "unfollow" : "follow"}">${h === "followed" ? "Following" : "Follow"}</button>`;
    return;
  }
  native.innerHTML = (
    src === "Following"
      ? Array.from({ length: 23 }, (_, i) => card(i + 1)).reverse()
      : [
          card(201, "discovery1"),
          card(202, "followed"),
          card(203, "discovery2"),
          card(204, "discovery3"),
          card(1),
        ]
  ).join("");
}
for (let b of document.querySelectorAll("[role=tab]"))
  b.onclick = () => {
    src = b.textContent;
    for (let t of document.querySelectorAll("[role=tab]"))
      t.setAttribute("aria-selected", t === b);
    native.innerHTML = "";
    setTimeout(show, 100);
  };
document.addEventListener("click", (e) => {
  let b = e.target.closest("button[data-testid]");
  if (!b) return;
  let type = b.dataset.testid;
  let id = b
    .closest("article")
    ?.querySelector("time")
    ?.closest("a")
    .getAttribute("href");
  if (type === "like" || type === "unlike") {
    b.dataset.testid = type === "like" ? "unlike" : "like";
    notice(b.dataset.testid + " confirmed on " + id);
  }
  if (type === "bookmark" || type === "removeBookmark") {
    b.dataset.testid = type === "bookmark" ? "removeBookmark" : "bookmark";
    notice(b.dataset.testid + " confirmed on " + id);
  }
  if (type === "reply") {
    document.querySelector("#composer").showModal();
    notice("Reply target " + id);
  }
  if (type === "retweet" || type === "unretweet") {
    let menu = document.createElement("div");
    menu.setAttribute("role", "menu");
    for (let label of ["Repost", "Quote"]) {
      let item = document.createElement("button");
      item.setAttribute("role", "menuitem");
      item.textContent = label;
      item.onclick = () => {
        if (label === "Repost") {
          b.dataset.testid = type === "retweet" ? "unretweet" : "retweet";
          notice("Repost confirmed on " + id);
        } else {
          document.querySelector("#composer").showModal();
          notice("Quote target " + id);
        }
        menu.remove();
      };
      menu.append(item);
    }
    document.querySelector("#layers").append(menu);
  }
});
document.querySelector("#submit").onclick = () => {
  notice("Test post submitted: " + document.querySelector("textarea").value);
  document.querySelector("#composer").close();
};
document.querySelector("#close").onclick = () =>
  document.querySelector("#composer").close();
show();

// Fixture-only media provider: replace the fictional X MP4 with a local test clip.
const wireFixtureVideo = () => {
  const root = document.getElementById("myx-root")?.shadowRoot;
  if (!root) return;
  const mapVideo = () =>
    root
      .querySelectorAll('video[src="https://video.twimg.com/test-fixture.mp4"]')
      .forEach((v) => (v.src = "/tests/fixture-video.mp4"));
  new MutationObserver(mapVideo).observe(root, {
    childList: true,
    subtree: true,
  });
  mapVideo();
};
wireFixtureVideo();
