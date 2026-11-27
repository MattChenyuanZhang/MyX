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
    if (/^\/(?:i\/chat|messages)(?:\/|$)/.test(path)) return "messages";
    if (/^\/(?:i|[A-Za-z0-9_]{1,15})\/lists(?:\/|$)/.test(path)) return "lists";
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
  function discoveryPercent(prefs = {}) {
    const p = prefs.discoveryPercent;
    return typeof p === "number" && Number.isFinite(p)
      ? Math.max(0, Math.min(100, p))
      : 100 / 11;
  }
  function formatCount(value) {
    if (value === null || value === undefined || value === "") return "";
    const number = Number(String(value).replace(/,/g, ""));
    if (!Number.isFinite(number)) return String(value).slice(0, 30);
    if (number === 0) return "";
    return new Intl.NumberFormat(
      "en-US",
      number >= 1000 ? { notation: "compact", maximumFractionDigits: 1 } : {},
    ).format(number);
  }
  function restoreRows(current, rows) {
    const byKey = new Map(
      current.map((p) => [(p.discovery ? "discovery:" : "") + eventKey(p), p]),
    );
    return rows
      .map((row) => byKey.get((row.discovery ? "discovery:" : "") + row.key))
      .filter(Boolean);
  }
  function readerCheckpoint(raw, account) {
    if (
      !raw ||
      raw.account !== account ||
      !["home", "sources", "settings"].includes(raw.view) ||
      !Array.isArray(raw.rows)
    )
      return null;
    return {
      ...raw,
      rows: raw.rows
        .slice(0, 10000)
        .filter((r) => r && typeof r.key === "string" && r.key.length < 150),
      scroll: Number.isFinite(raw.scroll) ? Math.max(0, raw.scroll) : 0,
      anchorTop: Number.isFinite(raw.anchorTop) ? raw.anchorTop : 0,
    };
  }
  function activityAccount(p) {
    return handle(p.kind === "repost" ? p.actor : p.handle);
  }
  function accountRate(rules, h) {
    const rule = rules?.accounts?.[handle(h)];
    const percent = (value) =>
      typeof value === "number" && Number.isFinite(value)
        ? Math.max(0, Math.min(100, value))
        : 100;
    if (typeof rule?.all === "number" && Number.isFinite(rule.all))
      return percent(rule.all);
    // Consolidate the unreleased three-slider settings into one visibility chance.
    return (
      Math.round(
        (["post", "reply", "repost"].reduce(
          (sum, k) => sum + percent(rule?.[k]),
          0,
        ) /
          3) *
          10,
      ) / 10
    );
  }
  // A seeded random rank per activity keeps samples nested and stable across refreshes.
  function sampleRank(p, seed) {
    let hash = 2166136261;
    for (const c of String(seed) +
      ":" +
      activityAccount(p) +
      ":" +
      p.kind +
      ":" +
      eventKey(p)) {
      hash ^= c.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
    return ((hash >>> 0) / 4294967296) * 100;
  }
  function includeActivity(p, rules) {
    return (
      sampleRank(p, rules?.seed || "myx") <
      accountRate(rules, activityAccount(p))
    );
  }
  function cleanVideos(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .slice(0, 4)
      .map((v) => {
        const src =
          typeof v?.src === "string" &&
          /^https:\/\/video\.twimg\.com\//.test(v.src) &&
          v.src.length < 4096
            ? v.src
            : "";
        const poster =
          typeof v?.poster === "string" &&
          /^https:\/\/pbs\.twimg\.com\//.test(v.poster) &&
          v.poster.length < 4096
            ? v.poster
            : "";
        return { src, poster, gif: v?.gif === true };
      })
      .filter((v) => v.src || v.poster);
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
        includeActivity(p, prefs.accountRules) &&
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
    const share = prefs.discovery === false ? 0 : discoveryPercent(prefs) / 100;
    if (share === 0 || (prefs.tab && prefs.tab !== "all") || prefs.search)
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
    candidates = candidates.filter((p) => {
      if (used.has(p.id)) return false;
      used.add(p.id);
      return true;
    });
    if (share === 1) return candidates.map((p) => ({ ...p, discovery: true }));
    let i = 0,
      out = [];
    for (let n = 0; n < ps.length; n++) {
      out.push({ ...ps[n], discovery: false });
      const due = Math.floor(((n + 1) * share) / (1 - share) + 1e-9);
      while (i < candidates.length && i < due) {
        let p = candidates[i++];
        out.push({ ...p, discovery: true });
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
      profiles: {},
      muted: [],
      xMuted: [],
      updated: null,
    };
  }
  root.MyXModel = {
    formatCount,
    restoreRows,
    readerCheckpoint,
    activityAccount,
    accountRate,
    sampleRank,
    includeActivity,
    cleanVideos,
    discoveryPercent,
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
