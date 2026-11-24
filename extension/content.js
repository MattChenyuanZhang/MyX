(async function () {
  "use strict";
  if (document.readyState === "loading")
    await new Promise((r) =>
      document.addEventListener("DOMContentLoaded", r, { once: true }),
    );
  if (document.getElementById("myx-root")?.dataset.initialized) return;
  const M = globalThis.MyXModel,
    $ = (s, r = document) => r.querySelector(s),
    all = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let account = "",
    data = M.empty(""),
    prefs = {
      replies: true,
      reposts: true,
      discovery: true,
      tab: "all",
      search: "",
      order: "activity",
    },
    surface = "feed",
    pending = null,
    collecting = false,
    visible = false,
    saveQueue = Promise.resolve();
  let modelReady = false;
  const timelineQueue = [];
  async function msg(m) {
    try {
      return await chrome.runtime.sendMessage(m);
    } catch {
      return null;
    }
  }
  function save() {
    const snapshot = structuredClone({
      data,
      prefs,
      pending,
      surface,
      view,
      open: visible,
    });
    saveQueue = saveQueue.then(() => msg({ type: "SET", data: snapshot }));
    return saveQueue;
  }
  function readAccount() {
    let t =
      $('[data-testid="SideNav_AccountSwitcher_Button"]')?.textContent || "";
    return M.handle(t.match(/@([\w]{1,15})\b/)?.[1]);
  }
  function safeURL(u) {
    if (!u) return "";
    try {
      let a = new URL(u, location.href);
      return a.protocol === "https:" ? a.href : "";
    } catch {
      return "";
    }
  }
  function parse(article) {
    let time = $("time[datetime]", article),
      link = time?.closest("a[href]"),
      s = link && M.statusLink(link.href);
    if (!s) return null;
    let date = Date.parse(time.dateTime);
    if (!Number.isFinite(date)) return null;
    let context = $('[data-testid="socialContext"]', article);
    let name = $('[data-testid="User-Name"]', article)?.textContent || s.handle;
    name = name.split("@")[0] || s.handle;
    let text = $('[data-testid="tweetText"]', article)?.textContent || "";
    let repost = /reposted|retweeted/i.test(context?.textContent || "");
    let actor =
      context?.closest("a")?.getAttribute("href")?.split("/")[1] ||
      all("a[href]", context?.parentElement || article)
        .find((a) => /^\/[\w]{1,15}$/.test(a.getAttribute("href") || ""))
        ?.getAttribute("href")
        ?.slice(1);
    let kind = repost
      ? "repost"
      : all("div,span", article).some((e) =>
            /^Replying to\b/.test(e.textContent),
          )
        ? "reply"
        : "post";
    let photo = all('[data-testid="tweetPhoto"] img', article)
      .map((i) => ({ url: safeURL(i.src), alt: i.alt || "Post photo" }))
      .filter((i) => i.url);
    const candidates = (data.timelineMeta || []).filter((p) => p.id === s.id);
    const metadata =
      candidates.find((p) =>
        repost
          ? p.kind === "repost" && (!actor || p.actor === M.handle(actor))
          : p.kind !== "repost",
      ) || (candidates.length === 1 ? candidates[0] : null);
    return {
      ...s,
      ...(metadata
        ? {
            eventId: metadata.eventId,
            eventTime: metadata.eventTime,
            timeSource: metadata.timeSource,
            followedActor: metadata.followedActor,
          }
        : {}),
      name,
      text: metadata?.text || text,
      kind: metadata?.kind || kind,
      actor: metadata?.actor || (repost ? M.handle(actor) : null),
      replyTo:
        metadata?.replyTo ||
        M.handle(
          article.innerText.match(/Replying to\s+@([A-Za-z0-9_]{1,15})/)?.[1],
        ) ||
        null,
      context: context?.textContent || "",
      time: date,
      seenAt: Date.now(),
      avatar: safeURL(
        $('[data-testid^="UserAvatar-Container"] img', article)?.src || "",
      ),
      photos: photo.slice(0, 4),
      video: !!$('video,[data-testid="videoPlayer"]', article),
      liked: !!$('[data-testid="unlike"]', article),
      bookmarked: !!$('[data-testid="removeBookmark"]', article),
      reposted: !!$('[data-testid="unretweet"]', article),
      counts: {
        reply: $('[data-testid="reply"]', article)?.textContent || "",
        repost:
          $('[data-testid="retweet"],[data-testid="unretweet"]', article)
            ?.textContent || "",
        like:
          $('[data-testid="like"],[data-testid="unlike"]', article)
            ?.textContent || "",
      },
      promoted:
        !!$('[data-testid="placementTracking"]', article) ||
        /\bPromoted\b/.test(context?.textContent || ""),
    };
  }
  function source() {
    if (location.pathname !== "/home") return null;
    let t = $('[role="tab"][aria-selected="true"]')
      ?.textContent?.trim()
      .toLowerCase();
    return t === "following" ? "following" : t === "for you" ? "forYou" : null;
  }
  function loaded() {
    return all('article[data-testid="tweet"]')
      .map(parse)
      .filter((p) => p && !p.promoted);
  }
  function capture(which) {
    if (source() !== which || readAccount() !== account) return 0;
    let ps = loaded();
    data[which] =
      which === "following"
        ? M.mergeActivity(data[which], ps, !data[which].length)
        : M.merge(data[which], ps);
    data.updated = Date.now();
    save();
    return ps.length;
  }
  const launcher = document.createElement("button");
  launcher.id = "myx-launcher";
  launcher.textContent = "MyX";
  launcher.setAttribute("aria-label", "Open MyX");
  if (document.getElementById("myx-root")?.style.display === "block")
    launcher.style.display = "none";
  document.documentElement.append(launcher);
  const { host, root } = globalThis.MyXShell.mount();
  host.dataset.initialized = "true";
  if (host.style.display === "block") document.body.inert = true;
  let restoreReaderScroll = false;
  let view = "home";
  const R = (s) => root.querySelector(s);
  let timer;
  function toast(t) {
    R(".toast").textContent = t;
    R(".toast").hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => (R(".toast").hidden = true), 5000);
  }
  function collectionStatus(t) {
    R("#status").innerHTML =
      `<span>${esc(t)}</span> <button class="secondary" id="stop-collection">Stop collection</button>`;
  }
  function status(t) {
    R("#status").textContent = t;
  }
  function settingsMarkup() {
    return ["replies", "reposts", "discovery"]
      .map(
        (k) =>
          `<label class="setting">${{ replies: "Include replies", reposts: "Include reposts", discovery: "1 discovery per 10 posts" }[k]}<input type="checkbox" data-pref="${k}" ${prefs[k] ? "checked" : ""}></label>`,
      )
      .join("");
  }
  const icons = {
    reply: "M21 11a9 9 0 0 1-9 9H4l2-4a9 9 0 1 1 15-5",
    repost: "M4 8h14l-4-4M20 16H6l4 4M18 8v5M6 16v-5",
    like: "M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 5 3 10 8 15 5-5 12-10 8-15",
    bookmark: "M6 3h12v18l-6-4-6 4z",
    share: "M12 16V3m-4 4 4-4 4 4M5 13v8h14v-8",
    thread: "M4 5h16M4 12h12M4 19h8",
    quote: "M4 4h6v8H4zM14 4h6v8h-6zM10 12q0 6-6 7M20 12q0 6-6 7",
  };
  function icon(k) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[k] || icons.reply}"/></svg>`;
  }
  function linkedText(text) {
    return M.mentionParts(text)
      .map((part) =>
        part.handle
          ? `<a href="https://x.com/${part.handle}">${esc(part.text)}</a>`
          : esc(part.text),
      )
      .join("");
  }
  function postMarkup(p) {
    const contextText =
      p.context ||
      (M.validHandle(p.replyTo) ? "Replying to @" + p.replyTo : "");
    let date = new Date(Number.isFinite(p.eventTime) ? p.eventTime : p.time);
    return `<article class="post" data-post="${p.id}">${p.discovery ? '<div class="context discovery">✧ From your For You · not following</div>' : contextText ? `<div class="context">${M.validHandle(p.actor) ? `<a href="https://x.com/${esc(p.actor)}">${esc(contextText)}</a>` : linkedText(contextText)}</div>` : ""}<div class="row"><a class="avatar" href="https://x.com/${esc(p.handle)}">${p.avatar ? `<img src="${esc(p.avatar)}" alt="">` : esc(p.name[0])}</a><div class="body"><div class="by"><a href="https://x.com/${esc(p.handle)}"><strong>${esc(p.name)}</strong></a><a class="meta" href="https://x.com/${esc(p.handle)}">@${esc(p.handle)}</a><button class="mute" data-mute="${esc(p.handle)}" aria-label="Mute @${esc(p.handle)} in MyX">Mute</button><a class="meta" href="${p.url}" title="${esc(date.toLocaleString())}">${esc(date.toLocaleDateString(undefined, { month: "short", day: "numeric" }))} · ${esc(date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }))}</a></div><div class="text">${linkedText(p.text || "Open this post to view its content on X.")}</div>${p.photos?.length ? `<div class="media">${p.photos.map((i) => `<a href="${p.url}"><img src="${esc(i.url)}" alt="${esc(i.alt)}" loading="lazy"></a>`).join("")}</div>` : ""}${p.video ? `<a class="secondary" href="${p.url}">Watch video on X</a>` : ""}${p.kind === "repost" ? `<div class="tiny">${Number.isFinite(p.eventTime) ? "Reposted at the time shown · original post " + esc(new Date(p.time).toLocaleString()) : "Repost activity time unavailable · kept in X’s Following order."}</div>` : ""}<div class="actions">${["reply", "repost", "like", "bookmark", "quote", "share", "thread"].map((k) => `<button data-act="${k}" class="${k === "like" && p.liked ? "liked" : (k === "bookmark" && p.bookmarked) || (k === "repost" && p.reposted) ? "selected" : ""}" aria-label="${esc(k === "like" && p.liked ? "Unlike" : k === "bookmark" && p.bookmarked ? "Remove bookmark" : k === "thread" ? "Open conversation" : k[0].toUpperCase() + k.slice(1))}"><span class="action-icon">${icon(k)}</span><span class="count">${esc(p.counts?.[k] || "")}</span></button>`).join("")}</div></div></div></article>`;
  }
  function render() {
    if (visible) {
      try {
        sessionStorage.setItem(
          "myx-ui",
          JSON.stringify({
            surface,
            view,
            replies: prefs.replies,
            reposts: prefs.reposts,
            discovery: prefs.discovery,
          }),
        );
      } catch {}
    }
    const nativeAccount = $('[data-testid="SideNav_AccountSwitcher_Button"]');
    const displayName =
      nativeAccount?.innerText
        .split("\n")
        .find((t) => t.trim() && !t.trim().startsWith("@"))
        ?.trim() || (account ? "@" + account : "Sign in on X");
    const avatar = safeURL(nativeAccount?.querySelector("img")?.src);
    R("#account").innerHTML =
      `<span class="avatar">${avatar ? `<img src="${esc(avatar)}" alt="">` : esc(displayName[0])}</span><span class="identity"><b>${esc(displayName)}</b><span>${account ? "@" + esc(account) : ""}</span></span><span class="account-more" aria-hidden="true">···</span>`;
    R("#account").setAttribute(
      "aria-label",
      account ? "Open your profile @" + account : "Sign in on X",
    );
    R("#settings").innerHTML = settingsMarkup();
    R("#native").textContent =
      surface === "feed" ? "Back to X" : "Back to feed";
    host.classList.toggle("native-surface", surface !== "feed");
    R("#coverage").innerHTML =
      `<b>${data.following.length} collected activities</b> · ${data.forYou.length} For You · ${new Set(data.forYou.filter((p) => data.relationships[p.handle] === "not-following").map((p) => p.handle)).size} verified discovery authors · ${data.following.filter((p) => Number.isFinite(p.eventTime)).length}/${data.following.length} activity times confirmed`;
    R(".heading h1").textContent =
      surface !== "feed"
        ? {
            history: "History",
            bookmarks: "Bookmarks",
            thread: "Conversation",
            profile: "Profile",
            search: "Account search",
            mutes: "Muted accounts",
          }[surface] || "X"
        : {
            home: "Home",
            sources: "Feed sources",
            settings: "Feed settings",
          }[view];
    root.querySelectorAll(".nav").forEach((b) => {
      const active =
        surface === "feed"
          ? b.dataset.view === view
          : b.dataset.native === surface;
      b.classList.toggle("active", active);
      if (active) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    if (surface !== "feed") {
      R("#feed").innerHTML = "";
      alignNative();
      return;
    }
    root
      .querySelectorAll("[data-tab]")
      .forEach((b) =>
        b.classList.toggle("active", prefs.tab === b.dataset.tab),
      );
    if (!account) {
      R("#feed").innerHTML =
        '<div class="empty"><h2>Sign in directly on X.</h2><p>MyX uses the account in this browser tab. Your password stays with X.</p><button class="primary blue" data-native="login">Sign in on X</button></div>';
      status("No signed-in X account detected.");
      return;
    }
    if (view === "settings") {
      R("#feed").innerHTML =
        `<div class="empty"><h2>Your feed, your rules.</h2>${settingsMarkup()}<p>Discovery preserves the order X presented in For You. Activity order uses confirmed event timestamps when all collected items have them; otherwise it preserves X’s observed Following order. Unknown repost dates are never invented.</p><p>Post data stays in browser session storage and is cleared when the tab closes. It is never pushed to GitHub.</p><label class="setting">Feed order<select id="order"><option value="activity" ${prefs.order === "activity" ? "selected" : ""}>Activity time / X Following order</option><option value="post-time" ${prefs.order === "post-time" ? "selected" : ""}>Original post time</option></select></label><h3>Muted accounts</h3><p>MyX mutes and imported X mutes hide posts by that author and reposts by that actor.</p><form id="mute-form"><input id="mute-handle" placeholder="@username" aria-label="Account to mute" maxlength="16"><button class="secondary" type="submit">Mute in MyX</button></form><div class="muted-list">${[...new Set([...(data.muted || []), ...(data.xMuted || [])])].map((h) => `<div class="setting"><span>@${esc(h)} ${(data.xMuted || []).includes(h) ? "(X mute)" : ""}</span>${(data.muted || []).includes(h) ? `<button class="secondary" data-unmute="${esc(h)}">Unmute in MyX</button>` : ""}</div>`).join("") || "No mutes imported yet."}</div><button class="secondary" id="import-mutes">Import X mutes</button><p class="tiny">X mutes are a snapshot. Import again after changing them on X. MyX never automatically unmutes an account on X.</p><button class="secondary" id="clear">Clear collected posts</button></div>`;
      return;
    }
    if (view === "sources") {
      const unknown = data.forYou.filter(
        (p) =>
          !data.following.some((f) => f.id === p.id) &&
          !data.relationships[p.handle],
      );
      R("#feed").innerHTML =
        `<div class="empty"><div class="eyebrow">REAL POSTS FROM YOUR X</div><h2>Bring your timeline into MyX.</h2><p>Collect Following and For You from X’s own tabs. Each collection scrolls up to 12 screens; continue collecting older posts as needed.</p><div class="tools"><button class="primary blue" data-collect="following">Collect Following</button><button class="secondary" data-collect="forYou">Collect For You</button><button class="secondary" data-collect="older">Collect older Following</button></div><p>Verify candidate authors against their X profiles so discovery never knowingly includes someone you already follow.</p><button class="secondary" id="verify" ${unknown.length ? "" : "disabled"}>Verify up to 5 discovery authors</button><p class="tiny">${unknown.length} unverified candidates. Verification only reads profiles; it does not follow anyone.</p><div class="rule"></div><p>Replies missing from X’s Following tab cannot be recovered by this extension. Activity timestamps are read from timeline responses when supplied by X. Missing times retain X’s observed order. This is a collected view, not a complete archive.</p></div>`;
      return;
    }
    let ps = M.feed(data, prefs);
    R("#feed").innerHTML = ps.length
      ? ps.map(postMarkup).join("")
      : `<div class="empty"><h2>${prefs.search ? "No matching posts." : "Your people, in time order."}</h2><p>${prefs.search ? "Try a different search." : "Start by collecting your Following feed. Then collect For You and verify discovery authors to build your 10-to-1 mix."}</p><button class="primary blue" data-view="sources">Set up your feed</button></div>`;
    if (restoreReaderScroll) {
      R(".app").scrollTop = prefs.readerScroll || 0;
      restoreReaderScroll = false;
    }
    status(
      ps.length
        ? `${ps.filter((p) => !p.discovery).length} following activities · ${ps.filter((p) => p.discovery).length} discovery posts · ${data.updated ? "collected " + new Date(data.updated).toLocaleTimeString() : ""}`
        : "Ready when you are.",
    );
  }
  function show() {
    sessionStorage.setItem("myx-shell-open", "1");
    document.querySelector("#myx-boot")?.remove();
    if (readAccount() !== account) refreshAccount();
    visible = true;
    document.body.inert = surface === "feed";
    document.documentElement.classList.toggle("myx-native", surface !== "feed");
    document.documentElement.classList.add("myx-open");
    for (const p of loaded())
      for (const key of ["following", "forYou"]) {
        data[key] = M.updatePostState(data[key], p.id, p);
      }
    host.style.display = "block";
    launcher.style.display = "none";
    render();
  }
  function hide() {
    sessionStorage.removeItem("myx-shell-open");
    document.documentElement.classList.remove("myx-native", "myx-open");
    visible = false;
    document.body.inert = false;
    host.style.display = "none";
    launcher.style.display = "";
    if (location.hash === "#myx")
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search,
      );
    save();
  }
  launcher.onclick = show;
  R("#native").onclick = () => {
    if (surface !== "feed") {
      leaveNative();
      view = "home";
      show();
    } else hide();
  };
  async function collect(which) {
    if (!data.xMutesSyncedAt || Date.now() - data.xMutesSyncedAt > 300000) {
      await navigate("/settings/muted/all", { type: "mutes", next: which });
      return;
    }
    const older = which === "older";
    if (older) which = "following";
    surface = "feed";
    if (collecting) return;
    collecting = true;
    view = "home";
    show();
    document.body.inert = false;
    collectionStatus("Starting collection…");
    launcher.textContent = "Stop collection";
    launcher.onclick = () => {
      collecting = false;
    };
    try {
      if (location.pathname !== "/home") {
        pending = { type: "collect", which: older ? "older" : which, account };
        await save();
        location.assign("/home");
        return;
      }
      let tab = all('[role="tab"]').find(
        (t) =>
          t.textContent.trim().toLowerCase() ===
          (which === "following" ? "following" : "for you"),
      );
      if (!tab)
        throw Error(
          "X timeline tabs were not found. Use X in English, then try again.",
        );
      if (which === "forYou") data.forYou = [];
      let before = loaded()
        .map((p) => p.id)
        .join(",");
      let switched = source() !== which;
      tab.click();
      if (switched) {
        let changed = false;
        for (let n = 0; n < 30; n++) {
          await wait(250);
          if (
            source() === which &&
            loaded().length &&
            loaded()
              .map((p) => p.id)
              .join(",") !== before
          ) {
            changed = true;
            break;
          }
        }
        if (!changed)
          throw Error(
            "X did not finish switching feeds. Select the correct native tab and retry.",
          );
      }
      if (older && data.followingScroll)
        window.scrollTo(0, data.followingScroll);
      else window.scrollTo(0, 0);
      await wait(1000);
      let stale = 0,
        last = 0;
      for (let n = 0; n < 12 && collecting; n++) {
        if (readAccount() !== account || source() !== which)
          throw Error("Account or timeline changed; collection stopped.");
        capture(which);
        let len = data[which].length;
        stale = len === last ? stale + 1 : 0;
        last = len;
        if (stale >= 3) break;
        launcher.textContent = `Stop · ${len} collected`;
        collectionStatus(
          `${len} ${which === "following" ? "Following activities" : "For You posts"} collected…`,
        );
        window.scrollBy(0, Math.max(550, innerHeight * 0.85));
        await wait(1500);
      }
      capture(which);
      if (which === "following") data.followingScroll = window.scrollY;
      await save();
      view = "home";
      show();
      toast(
        `Collected ${data[which].length} ${which === "following" ? "Following" : "For You"} posts. This is not a complete archive.`,
      );
    } catch (e) {
      show();
      toast(e.message);
    } finally {
      collecting = false;
      launcher.textContent = "MyX";
      launcher.onclick = show;
    }
  }
  async function navigate(target, next) {
    pending = { ...next, account };
    await save();
    visible = true;
    sessionStorage.setItem("myx-shell-open", "1");
    await save();
    const destination = new URL(target, location.origin);
    location.assign(
      destination.origin === "https://x.com"
        ? destination.pathname + destination.search + destination.hash
        : target,
    );
  }
  function nativeArticle(id) {
    return all('article[data-testid="tweet"]').find((a) => parse(a)?.id === id);
  }
  async function act(id, action) {
    if (readAccount() !== account) {
      await refreshAccount();
      toast("Account changed. Choose the post again.");
      return;
    }
    let p = [...data.following, ...data.forYou].find((p) => p.id === id);
    if (!p) return;
    if (action === "share") {
      try {
        await navigator.clipboard.writeText(p.url);
        toast("Post link copied.");
      } catch {
        toast("Could not copy. Open the conversation to copy its URL.");
      }
      return;
    }
    if (action === "thread") return openSurface(p.url, "thread");
    let a = nativeArticle(id);
    if (!a) {
      await navigate(p.url, {
        type: "action",
        id,
        action,
        desired:
          action === "like"
            ? !p.liked
            : action === "bookmark"
              ? !p.bookmarked
              : undefined,
      });
      return;
    }
    await nativeAction(
      a,
      action,
      action === "like"
        ? !p.liked
        : action === "bookmark"
          ? !p.bookmarked
          : undefined,
    );
  }
  async function nativeAction(a, action, desired) {
    let before = parse(a);
    if (!before) return;
    if (
      desired !== undefined &&
      (action === "like" ? before.liked : before.bookmarked) === desired
    ) {
      show();
      toast("X already shows the requested state.");
      return;
    }
    const sel = {
      reply: '[data-testid="reply"]',
      like: '[data-testid="like"],[data-testid="unlike"]',
      repost: '[data-testid="retweet"],[data-testid="unretweet"]',
      bookmark: '[data-testid="bookmark"],[data-testid="removeBookmark"]',
      quote: '[data-testid="retweet"],[data-testid="unretweet"]',
    }[action];
    let b = sel && $(sel, a);
    if (!b) {
      await openSurface(before.url, "thread");
      toast(
        "X changed this control. Use the native button in this conversation.",
      );
      return;
    }
    document.body.inert = false;
    a.scrollIntoView({ block: "center" });
    b.click();
    if (action === "like" || action === "bookmark") {
      let changed = false;
      for (let n = 0; n < 20; n++) {
        await wait(150);
        let after = parse(a);
        if (
          after &&
          (action === "like"
            ? after.liked !== before.liked
            : after.bookmarked !== before.bookmarked)
        ) {
          for (const key of ["following", "forYou"])
            data[key] = M.updatePostState(data[key], after.id, after);
          changed = true;
          await save();
          break;
        }
      }
      show();
      toast(
        changed
          ? "X updated the post."
          : "X has not confirmed the change. Check the native post before retrying.",
      );
    } else if (action === "repost") {
      const owner = account;
      for (let n = 0; n < 600; n++) {
        await wait(200);
        if (readAccount() !== owner) return;
        const current = nativeArticle(before.id);
        const after = current && parse(current);
        if (after && after.reposted !== before.reposted) {
          for (const key of ["following", "forYou"])
            data[key] = M.updatePostState(data[key], after.id, after);
          await save();
          render();
          toast("X updated the repost.");
          return;
        }
        const menuOpen = all('#layers [role="menu"]').some(
          (e) => e.getClientRects().length > 0,
        );
        if (n > 5 && !menuOpen) return;
      }
    } else if (action === "quote") {
      for (let n = 0; n < 15; n++) {
        await wait(100);
        let quote = all('[role="menuitem"]').find((e) =>
          /^Quote\b/i.test(e.textContent),
        );
        if (quote) {
          quote.click();
          return;
        }
      }
      toast("Choose Quote from X’s repost menu.");
    }
  }
  async function refreshAccount() {
    let current = readAccount();
    if (current === account) return;
    account = current;
    data = M.empty(current);
    pending = null;
    surface = "feed";
    await msg({ type: "CLEAR" });
    render();
  }
  async function verify() {
    let known = new Set(data.following.flatMap((p) => [p.handle, p.actor]));
    let handles = [
      ...new Set(
        data.forYou
          .filter(
            (p) =>
              !known.has(p.handle) &&
              !data.relationships[p.handle] &&
              p.kind !== "repost",
          )
          .map((p) => p.handle),
      ),
    ].slice(0, 5);
    if (!handles.length) {
      toast("No new discovery authors to verify.");
      return;
    }
    await navigate("/" + handles[0], { type: "verify", handles, index: 0 });
  }
  async function resume() {
    if (!pending) return;
    let p = pending;
    if (p.account !== account) {
      pending = null;
      await save();
      return;
    }
    if (p.type === "mutes") {
      if (location.pathname !== "/settings/muted/all") {
        pending = null;
        await save();
        return;
      }
      surface = "feed";
      show();
      status("Importing your X muted accounts…");
      const imported = new Set();
      let stale = 0;
      for (let n = 0; n < 30; n++) {
        if (readAccount() !== account) return;
        const before = imported.size;
        for (const cell of all('[data-testid="UserCell"]')) {
          if (
            !all("button", cell).some((b) =>
              /^Unmute$/i.test(b.getAttribute("aria-label") || b.textContent),
            )
          )
            continue;
          const h = M.handle(
            all("a[href]", cell)
              .find((a) =>
                /^\/[A-Za-z0-9_]{1,15}$/.test(a.getAttribute("href") || ""),
              )
              ?.getAttribute("href")
              ?.slice(1),
          );
          if (M.validHandle(h)) imported.add(h);
        }
        stale = imported.size === before ? stale + 1 : 0;
        if (n > 3 && stale >= 3) break;
        window.scrollBy(0, Math.max(600, innerHeight * 0.85));
        await wait(500);
      }
      const pageLoaded = all("h1,h2").some((e) =>
        /Muted accounts/i.test(e.textContent),
      );
      if (pageLoaded) {
        data.xMuted = [...imported];
        data.xMutesSyncedAt = Date.now();
        await msg({
          type: "MUTES_SET",
          account,
          muted: data.muted || [],
          xMuted: data.xMuted,
        });
      }
      pending = null;
      await save();
      await navigate(
        "/home#myx",
        p.next
          ? { type: "collect", which: p.next }
          : { type: "surface", returnFeed: true },
      );
      return;
    }
    if (p.type === "composer") {
      pending = null;
      await save();
      show();
      document.body.inert = false;
      return;
    }
    if (p.type === "surface") {
      pending = null;
      await save();
      show();
      return;
    }
    if (p.type === "collect") {
      pending = null;
      await save();
      return collect(p.which);
    }
    if (p.type === "action") {
      for (let n = 0; n < 40; n++) {
        if (readAccount() !== account) return;
        let a = nativeArticle(p.id);
        if (a) {
          pending = null;
          await save();
          return nativeAction(a, p.action, p.desired);
        }
        await wait(250);
      }
      pending = null;
      await save();
      show();
      toast("The exact post did not load. No action was taken.");
    }
    if (p.type === "verify") {
      let h = p.handles[p.index];
      if (location.pathname.toLowerCase() !== "/" + h) {
        pending = null;
        await save();
        return;
      }
      let relationship = null;
      for (let n = 0; n < 40; n++) {
        if (readAccount() !== account) return;
        const main = $('[data-testid="primaryColumn"]') || $("main");
        const user = $('[data-testid="UserName"]', main || document);
        if (user?.textContent?.toLowerCase().includes("@" + h)) {
          let controls = all("button[data-testid]", main || document).filter(
            (b) => !b.closest('article,[data-testid="UserCell"]'),
          );
          if (controls.some((b) => /-unfollow$/.test(b.dataset.testid)))
            relationship = "following";
          else if (controls.some((b) => /-follow$/.test(b.dataset.testid)))
            relationship = "not-following";
        }
        if (relationship) break;
        await wait(250);
      }
      if (relationship) data.relationships[h] = relationship;
      p.index++;
      if (p.index < p.handles.length) {
        pending = p;
        await save();
        location.assign("/" + p.handles[p.index]);
      } else {
        pending = null;
        await save();
        location.assign("/home#myx");
      }
    }
  }
  root.addEventListener("click", async (e) => {
    if (!e.isTrusted) return;
    let b = e.target.closest("button");
    if (!b) return;
    if (b.id === "stop-collection") {
      collecting = false;
      return;
    }
    if (collecting) return;
    if (b.dataset.view) {
      leaveNative();
      view = b.dataset.view;
      render();
    }
    if (b.dataset.tab) {
      leaveNative();
      prefs.tab = b.dataset.tab;
      view = "home";
      render();
      save();
    }
    if (b.dataset.collect) collect(b.dataset.collect);
    if (b.dataset.mute) await setMuted(b.dataset.mute, true);
    if (b.dataset.unmute) await setMuted(b.dataset.unmute, false);
    if (b.id === "import-mutes")
      await navigate("/settings/muted/all", { type: "mutes" });
    if (b.dataset.act)
      act(b.closest("[data-post]").dataset.post, b.dataset.act);
    if (b.dataset.account && account)
      await openSurface("/" + account, "profile");
    else if (b.dataset.account) {
      hide();
      location.assign("/i/flow/login");
    }
    if (b.id === "verify") verify();
    if (b.id === "clear") {
      const muted = data.muted || [],
        xMuted = data.xMuted || [],
        synced = data.xMutesSyncedAt;
      data = M.empty(account);
      data.muted = muted;
      data.xMuted = xMuted;
      data.xMutesSyncedAt = synced;
      await save();
      render();
      toast("Collected activities cleared; mute preferences kept.");
    }
    if (b.dataset.native) {
      const kind = b.dataset.native;
      if (kind === "post") {
        surface = "feed";
        await navigate("/compose/post", { type: "composer" });
      } else if (kind === "login") {
        hide();
        location.assign("/i/flow/login");
      } else
        await openSurface(
          { history: "/i/history", bookmarks: "/i/bookmarks" }[kind],
          kind,
        );
    }
  });
  root.addEventListener("change", (e) => {
    if (!e.isTrusted) return;
    if (e.target.id === "order") {
      prefs.order = e.target.value;
      save();
      render();
    }
    if (e.target.dataset.pref) {
      prefs[e.target.dataset.pref] = e.target.checked;
      save();
      render();
    }
  });
  const searchInput = R(".search"),
    searchResults = R("#account-results");
  function closeAccountSearch() {
    searchResults.hidden = true;
  }
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    searchResults.hidden = !q;
    searchResults.innerHTML = q
      ? M.searchAccounts(data, q)
          .map(
            (a) =>
              `<a href="https://x.com/${a.handle}"><strong>${esc(a.name || "@" + a.handle)}</strong><span>@${a.handle}</span></a>`,
          )
          .join("") + '<button type="submit">Search accounts on X →</button>'
      : "";
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAccountSearch();
  });
  root.addEventListener("submit", (e) => {
    if (!e.isTrusted || e.target.id !== "account-search") return;
    e.preventDefault();
    const url = M.accountSearchUrl(searchInput.value);
    if (url) {
      closeAccountSearch();
      openSurface(url, "search");
    }
  });
  function alignNative() {
    if (surface === "feed") return;
    const col = $('[data-testid="primaryColumn"]');
    if (!col) return;
    const rect = col.getBoundingClientRect();
    host.style.setProperty("--myx-native-left", Math.max(0, rect.left) + "px");
    host.style.setProperty("--myx-native-width", rect.width + "px");
  }
  function leaveNative() {
    restoreReaderScroll = surface !== "feed";
    surface = "feed";
    document.documentElement.classList.remove("myx-native");
    document.body.inert = true;
    save();
  }
  async function openSurface(url, kind) {
    if (!url) return;
    if (surface === "feed") prefs.readerScroll = R(".app").scrollTop;
    surface = kind;
    await navigate(url, { type: "surface" });
  }
  async function setMuted(h, on) {
    h = M.handle(h);
    if (!M.validHandle(h)) {
      toast("Enter a valid X username.");
      return;
    }
    data.muted = on
      ? [...new Set([...(data.muted || []), h])]
      : (data.muted || []).filter((v) => v !== h);
    await msg({
      type: "MUTES_SET",
      account,
      muted: data.muted,
      xMuted: data.xMuted || [],
    });
    await save();
    render();
    toast(on ? "@" + h + " muted in MyX." : "@" + h + " unmuted in MyX.");
  }
  root.addEventListener("submit", (e) => {
    if (!e.isTrusted || e.target.id !== "mute-form") return;
    e.preventDefault();
    setMuted(R("#mute-handle").value, true);
  });
  // Profile/media/status links stay under the MyX shell.
  root.addEventListener("click", (e) => {
    if (!e.isTrusted || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey)
      return;
    const a = e.target.closest("a[href]");
    if (!a) return;
    const u = new URL(a.href);
    if (u.origin !== "https://x.com") return;
    e.preventDefault();
    closeAccountSearch();
    openSurface(u.href, M.statusLink(u.href) ? "thread" : "profile");
  });
  let nativePath = location.pathname;
  setInterval(() => {
    if (!visible) return;
    if (surface !== "feed" && nativePath !== location.pathname) {
      nativePath = location.pathname;
      surface = M.surfaceForPath(nativePath) || surface;
      render();
    }
    if (surface !== "feed") {
      alignNative();
      for (const a of all('article[data-testid="tweet"]')) {
        const p = parse(a);
        a.toggleAttribute("data-myx-muted", !!p && M.isMuted(p, data));
      }
    }
    // Dialogs are real X controls above the reader, with its layout kept in place.
    const layerRoot = $("#layers");
    for (
      let n = layerRoot?.parentElement;
      n && n !== document.body;
      n = n.parentElement
    ) {
      if (getComputedStyle(n).zIndex !== "auto")
        n.setAttribute("data-myx-layer-parent", "");
    }
    const modal = all('#layers [role="dialog"],#layers [role="menu"]').some(
      (e) =>
        e.getClientRects().length > 0 &&
        getComputedStyle(e).visibility !== "hidden",
    );
    document.body.inert = surface === "feed" && !modal;
  }, 400);
  function acceptTimeline(message) {
    const current = readAccount();
    if (!current || message.account !== current || account !== current) return;
    const safe = [];
    for (const p of message.items.slice(0, 500)) {
      if (
        !p ||
        !/^\d+$/.test(p.id) ||
        !/^\d+$/.test(p.eventId) ||
        !M.validHandle(p.handle) ||
        !Number.isFinite(p.time) ||
        !Number.isFinite(p.eventTime) ||
        !["post", "reply", "repost"].includes(p.kind)
      )
        continue;
      if (p.eventTime > Date.now() + 86400000 || p.eventTime < 1140000000000)
        continue;
      const h = M.handle(p.handle),
        actor =
          p.kind === "repost" && M.validHandle(p.actor)
            ? M.handle(p.actor)
            : null;
      const value = {
        id: p.id,
        eventId: p.eventId,
        eventTime: p.eventTime,
        time: p.time,
        timeSource: "x-timeline-response",
        handle: h,
        actor,
        replyTo: M.validHandle(p.replyTo) ? M.handle(p.replyTo) : null,
        kind: p.kind,
        name: String(p.name || h).slice(0, 200),
        text: String(p.text || "").slice(0, 100000),
        context: actor ? String(p.context || "").slice(0, 300) : "",
        url: "https://x.com/" + h + "/status/" + p.id,
        avatar: safeURL(p.avatar),
        photos: Array.isArray(p.photos)
          ? p.photos
              .slice(0, 4)
              .map((i) => ({
                url: safeURL(i.url),
                alt: String(i.alt || "Post photo").slice(0, 2000),
              }))
              .filter((i) => i.url)
          : [],
        video: p.video === true,
        liked: p.liked === true,
        bookmarked: p.bookmarked === true,
        reposted: p.reposted === true,
        counts: {
          reply: Number(p.counts?.reply) || 0,
          repost: Number(p.counts?.repost) || 0,
          like: Number(p.counts?.like) || 0,
        },
        followedActor:
          typeof p.followedActor === "boolean" ? p.followedActor : null,
        seenAt: Date.now(),
      };
      const activityAuthor = actor || h;
      if (p.followedActor === true)
        data.relationships[activityAuthor] = "following";
      if (p.followedActor === false)
        data.relationships[activityAuthor] = "not-following";
      if (p.mutedActor === true) {
        data.xMuted ||= [];
        if (!data.xMuted.includes(activityAuthor))
          data.xMuted.push(activityAuthor);
      }
      safe.push(value);
    }
    data.timelineMeta = M.merge(data.timelineMeta || [], safe).slice(-3000);
    if (message.source === "following")
      data.following = M.mergeActivity(data.following, safe, true);
    else data.forYou = M.merge(data.forYou, safe);
    data.updated = Date.now();
    save();
    if (visible && !collecting && surface === "feed") render();
  }
  window.addEventListener("message", (e) => {
    if (
      e.source !== window ||
      e.origin !== location.origin ||
      e.data?.type !== "MYX_TIMELINE_ITEMS_V1" ||
      !["following", "forYou"].includes(e.data.source) ||
      !Array.isArray(e.data.items)
    )
      return;
    if (!modelReady) {
      if (timelineQueue.length < 8) timelineQueue.push(e.data);
      return;
    }
    acceptTimeline(e.data);
  });
  for (let n = 0; n < 40 && !readAccount(); n++) await wait(250);
  account = readAccount();
  let saved = await msg({ type: "GET" });
  if (account && saved?.data?.account === account) {
    data = saved.data;
    prefs = { ...prefs, ...saved.prefs, search: "" };
    pending = saved.pending;
    surface = saved.surface || "feed";
    if (surface !== "feed")
      surface = M.surfaceForPath(location.pathname) || surface;
    view = saved.view || "home";
    data.muted ||= [];
    data.xMuted ||= [];
  } else {
    await msg({ type: "CLEAR" });
    data = M.empty(account);
  }
  modelReady = true;
  timelineQueue.splice(0).forEach(acceptTimeline);
  const storedMutes = await msg({ type: "MUTES_GET", account });
  if (storedMutes?.muted) data.muted = storedMutes.muted;
  if (storedMutes?.xMuted) data.xMuted = storedMutes.xMuted;
  chrome.storage?.onChanged?.addListener((changes, area) => {
    const value = changes["myx:mutes:" + account]?.newValue;
    if (area !== "local" || !value) return;
    data.muted = value.muted || [];
    data.xMuted = value.xMuted || [];
    save();
    render();
  });
  render();
  host.classList.remove("booting");
  host.removeAttribute("aria-busy");
  root.querySelectorAll("button:disabled,input:disabled").forEach((e) => {
    if (!e.closest("#feed")) e.disabled = false;
  });
  if (
    location.hash === "#myx" ||
    saved?.open ||
    sessionStorage.getItem("myx-shell-open")
  )
    show();
  await resume();
  setInterval(() => {
    if (!collecting && readAccount() !== account) refreshAccount();
  }, 1000);
})();
