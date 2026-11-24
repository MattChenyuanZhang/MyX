/* Shared pure model. No X requests and no credentials. */
(function (root) {
  const handle = (s) =>
    String(s || "")
      .replace(/^@/, "")
      .toLowerCase();
  const validHandle = (s) => /^[a-zA-Z0-9_]{1,15}$/.test(s || "");
  // Tokenize mentions before HTML escaping; emails and overlong names stay text.
  function mentionParts(text) {
    const parts = [],
      re = /(^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{1,15})(?![A-Za-z0-9_])/g;
    text = String(text || "");
    let end = 0;
    for (const m of text.matchAll(re)) {
      const start = m.index + m[1].length;
      parts.push({ text: text.slice(end, start) });
      parts.push({ text: "@" + m[2], handle: handle(m[2]) });
      end = start + m[2].length + 1;
    }
    parts.push({ text: text.slice(end) });
    return parts;
  }
  function searchAccounts(data, query) {
    const q = handle(String(query || "").trim());
    if (!q) return [];
    const accounts = new Map();
    function add(h, name) {
      h = handle(h);
      if (!validHandle(h)) return;
      const prior = accounts.get(h);
      if (!prior || (!prior.name && name))
        accounts.set(h, { handle: h, name: name || "" });
    }
    for (const p of [...(data.following || []), ...(data.forYou || [])]) {
      add(p.handle, p.name);
      add(p.actor, p.context?.replace(/\s+(?:reposted|retweeted).*$/i, ""));
      add(p.replyTo);
      for (const part of mentionParts(p.text))
        if (part.handle) add(part.handle);
    }
    return [...accounts.values()]
      .filter((a) => (a.handle + " " + a.name).toLowerCase().includes(q))
      .slice(0, 6);
  }
  function accountSearchUrl(query) {
    const q = String(query || "")
      .trim()
      .slice(0, 500);
    return q
      ? "https://x.com/search?q=" +
          encodeURIComponent(q) +
          "&src=typed_query&f=user"
      : null;
  }
  function surfaceForPath(path) {
    if (/^\/i\/history(?:\/|$)/.test(path)) return "history";
    if (/^\/i\/bookmarks(?:\/|$)/.test(path)) return "bookmarks";
    if (/^\/search(?:\/|$)/.test(path)) return "search";
    if (/^\/[A-Za-z0-9_]{1,15}\/status\/\d+(?:\/|$)/.test(path))
      return "thread";
    if (
      /^\/[A-Za-z0-9_]{1,15}\/?$/.test(path) &&
      !["/home", "/explore", "/notifications", "/settings"].includes(path)
    )
      return "profile";
    return null;
  }
  function statusLink(raw) {
    try {
      let u = new URL(raw, "https://x.com");
      let m = u.pathname.match(/^\/([a-zA-Z0-9_]{1,15})\/status\/(\d+)\/?$/);
      return u.origin === "https://x.com" && m
        ? {
            handle: handle(m[1]),
            id: m[2],
            url: "https://x.com/" + m[1] + "/status/" + m[2],
          }
        : null;
    } catch {
      return null;
    }
  }
  // An original post and each identifiable reposter are distinct activities.
  function eventKey(p) {
    if (p.eventId && /^\d+$/.test(p.eventId)) return "event:" + p.eventId;
    return p.kind === "repost"
      ? "repost:" + handle(p.actor || p.context || "unknown") + ":" + p.id
      : "post:" + p.id;
  }
  function merge(old, incoming) {
    const map = new Map(old.map((p) => [eventKey(p), p]));
    for (const p of incoming) {
      if (
        !/^\d+$/.test(p.id) ||
        !validHandle(p.handle) ||
        !Number.isFinite(p.time)
      )
        continue;
      const prior = map.get(eventKey(p));
      map.set(eventKey(p), {
        ...prior,
        ...p,
        seenAt: prior?.seenAt || p.seenAt,
      });
    }
    return [...map.values()];
  }
  // Merge overlapping rendered windows without treating observation time as repost time.
  function mergeActivity(old, incoming, prependUnknown = false) {
    const valid = merge([], incoming);
    const values = new Map(merge(old, valid).map((p) => [eventKey(p), p]));
    const keys = [...new Set(old.map(eventKey))];
    for (let i = 0; i < valid.length; i++) {
      const key = eventKey(valid[i]);
      if (keys.includes(key)) continue;
      const next = valid
        .slice(i + 1)
        .map(eventKey)
        .find((k) => keys.includes(k));
      const prior = valid
        .slice(0, i)
        .map(eventKey)
        .reverse()
        .find((k) => keys.includes(k));
      if (next) keys.splice(keys.indexOf(next), 0, key);
      else if (prior) keys.splice(keys.indexOf(prior) + 1, 0, key);
      else if (prependUnknown) keys.unshift(key);
      else keys.push(key);
    }
    return keys.map((k) => values.get(k)).filter(Boolean);
  }
  function updatePostState(items, id, p) {
    return items.map((item) =>
      item.id === id
        ? {
            ...item,
            liked: p.liked,
            bookmarked: p.bookmarked,
            reposted: p.reposted,
            counts: p.counts,
          }
        : item,
    );
  }
  function isMuted(p, data) {
    const muted = new Set(
      [...(data.muted || []), ...(data.xMuted || [])].map(handle),
    );
    return muted.has(handle(p.handle)) || muted.has(handle(p.actor));
  }
  function feed(data, prefs = {}) {
    const following = new Set((data.following || []).map((p) => p.id));
    const known = new Set(
      (data.following || [])
        .flatMap((p) => [handle(p.handle), handle(p.actor)])
        .filter(Boolean),
    );
    let ps = (data.following || []).filter(
      (p) =>
        p.followedActor !== false &&
        !isMuted(p, data) &&
        (prefs.replies !== false || p.kind !== "reply") &&
        (prefs.reposts !== false || p.kind !== "repost"),
    );
    if (prefs.tab && prefs.tab !== "all")
      ps = ps.filter((p) => p.kind === prefs.tab);
    if (prefs.search)
      ps = ps.filter((p) =>
        (p.text + " " + p.name + " " + p.handle)
          .toLowerCase()
          .includes(prefs.search.toLowerCase()),
      );
    if (
      prefs.order === "activity" &&
      ps.length &&
      ps.every((p) => Number.isFinite(p.eventTime))
    ) {
      ps = [...ps].sort(
        (a, b) =>
          b.eventTime - a.eventTime || b.eventId.localeCompare(a.eventId),
      );
    }
    if (prefs.order !== "activity") {
      ps = [...ps].sort((a, b) => b.time - a.time || b.id.localeCompare(a.id));
    }
    if (
      prefs.discovery === false ||
      (prefs.tab && prefs.tab !== "all") ||
      prefs.search
    )
      return ps.map((p) => ({ ...p, discovery: false }));
    let used = new Set();
    let candidates = (data.forYou || []).filter(
      (p) =>
        !isMuted(p, data) &&
        !following.has(p.id) &&
        !known.has(handle(p.handle)) &&
        data.relationships?.[handle(p.handle)] === "not-following" &&
        p.kind !== "repost" &&
        !p.promoted,
    );
    let i = 0,
      out = [];
    for (let n = 0; n < ps.length; n++) {
      out.push({ ...ps[n], discovery: false });
      if ((n + 1) % 10 === 0) {
        while (i < candidates.length && used.has(candidates[i].id)) i++;
        if (i < candidates.length) {
          let p = candidates[i++];
          used.add(p.id);
          out.push({ ...p, discovery: true });
        }
      }
    }
    return out;
  }
  function empty(account) {
    return {
      account: handle(account),
      following: [],
      forYou: [],
      relationships: {},
      muted: [],
      xMuted: [],
      updated: null,
    };
  }
  root.MyXModel = {
    surfaceForPath,
    mentionParts,
    searchAccounts,
    accountSearchUrl,
    updatePostState,
    eventKey,
    mergeActivity,
    isMuted,
    handle,
    validHandle,
    statusLink,
    merge,
    feed,
    empty,
  };
})(globalThis);
