importScripts("profile.js");
// Lookup tabs are created only for an explicit profile preview, and always closed.
const profileLookups = new Map();
const feedLookups = new Map();
const feedParents = new Set();
const ruleWrites = new Map();
const profileWrites = new Map();
async function cacheProfiles(account, profiles, partial = false) {
  const k = "myx:profile-cache:" + account;
  const previous = profileWrites.get(k) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(async () => {
      const records = (await chrome.storage.session.get(k))[k] || {};
      for (const raw of profiles.slice(0, 100)) {
        const p = globalThis.MyXProfile.clean(raw);
        if (!p) continue;
        const prior = Object.hasOwn(records, p.handle)
          ? records[p.handle]
          : null;
        const value = globalThis.MyXProfile.combine(prior, p, partial);
        delete records[p.handle];
        Object.defineProperty(records, p.handle, {
          value,
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }
      Object.keys(records)
        .slice(0, Math.max(0, Object.keys(records).length - 200))
        .forEach((h) => delete records[h]);
      await chrome.storage.session.set({ [k]: records });
      return records;
    });
  profileWrites.set(k, next);
  try {
    return await next;
  } finally {
    if (profileWrites.get(k) === next) profileWrites.delete(k);
  }
}
async function finishFeed(id, result) {
  const job = feedLookups.get(id);
  if (!job) return;
  feedLookups.delete(id);
  clearTimeout(job.timer);
  job.resolve(result);
  try {
    const tab = await chrome.tabs.get(id);
    if (!tab.active) await chrome.tabs.remove(id);
  } catch {}
}
async function requestFeed(m, sender) {
  if (typeof m.account !== "string" || !/^[a-z0-9_]{1,15}$/.test(m.account))
    return null;
  if (feedParents.has(sender.tab.id))
    return { error: "Refresh already running." };
  if (feedParents.size >= 2)
    return { error: "Another feed is refreshing. Try again shortly." };
  feedParents.add(sender.tab.id);
  try {
    const cached = (await chrome.storage.session.get(key(sender.tab.id)))[
      key(sender.tab.id)
    ];
    if (cached?.data?.account && cached.data.account !== m.account)
      return { error: "Account changed." };
    if ([...feedLookups.values()].some((j) => j.parent === sender.tab.id))
      return { error: "Refresh already running." };
    if (feedLookups.size >= 2)
      return { error: "Another feed is refreshing. Try again shortly." };
    let resolve;
    const result = new Promise((r) => (resolve = r));
    const tab = await chrome.tabs.create({
      url: "https://x.com/home#myx-feed-sync",
      active: false,
    });
    const timer = setTimeout(
      () =>
        finishFeed(tab.id, {
          error: "X did not finish refreshing. Try Refresh latest again.",
        }),
      25000,
    );
    feedLookups.set(tab.id, {
      parent: sender.tab.id,
      account: m.account,
      resolve,
      timer,
    });
    return await result;
  } finally {
    feedParents.delete(sender.tab.id);
  }
}
async function rulesFor(account, change) {
  const k = "myx:rules:" + account;
  const previous = ruleWrites.get(k) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(async () => {
      const value = (await chrome.storage.local.get(k))[k] || {
        seed: crypto.randomUUID(),
        accounts: {},
      };
      for (const [h, old] of Object.entries(value.accounts)) {
        const percent = (n) =>
          typeof n === "number" && Number.isFinite(n)
            ? Math.max(0, Math.min(100, n))
            : 100;
        const all =
          typeof old?.all === "number" && Number.isFinite(old.all)
            ? percent(old.all)
            : Math.round(
                (["post", "reply", "repost"].reduce(
                  (sum, kind) => sum + percent(old?.[kind]),
                  0,
                ) /
                  3) *
                  10,
              ) / 10;
        if (all === 100) delete value.accounts[h];
        else
          Object.defineProperty(value.accounts, h, {
            value: { all },
            enumerable: true,
            configurable: true,
            writable: true,
          });
      }
      if (change) {
        Object.defineProperty(value.accounts, change.handle, {
          value: { all: change.percent },
          enumerable: true,
          configurable: true,
          writable: true,
        });
        if (change.percent === 100) delete value.accounts[change.handle];
      }
      await chrome.storage.local.set({ [k]: value });
      return value;
    });
  ruleWrites.set(k, next);
  try {
    return await next;
  } finally {
    if (ruleWrites.get(k) === next) ruleWrites.delete(k);
  }
}
async function finishProfile(tabId, result) {
  const job = profileLookups.get(tabId);
  if (!job) return;
  profileLookups.delete(tabId);
  clearTimeout(job.timer);
  job.resolve(result);
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active) await chrome.tabs.remove(tabId);
  } catch {}
}
async function requestProfile(m, sender) {
  if (
    typeof m.handle !== "string" ||
    typeof m.account !== "string" ||
    !/^[a-z0-9_]{1,15}$/.test(m.handle) ||
    !/^[a-z0-9_]{1,15}$/.test(m.account)
  )
    return null;
  const cached = (await chrome.storage.session.get(key(sender.tab.id)))[
    key(sender.tab.id)
  ];
  if (cached?.data?.account && cached.data.account !== m.account)
    return { error: "Account changed." };
  const shared = (
    await chrome.storage.session.get("myx:profile-cache:" + m.account)
  )["myx:profile-cache:" + m.account];
  const profile = globalThis.MyXProfile.clean(
    shared?.[m.handle] || cached?.data?.profiles?.[m.handle],
  );
  if (
    globalThis.MyXProfile.hasDetails(profile) &&
    Date.now() - profile.capturedAt < 1800000
  )
    return { profile };
  for (const [id, job] of profileLookups) {
    if (job.parent === sender.tab.id && job.handle === m.handle)
      return job.result;
    if (job.parent === sender.tab.id)
      await finishProfile(id, { error: "Preview changed." });
  }
  if (profileLookups.size >= 3)
    return { error: "Another profile is loading. Try again." };
  let resolve;
  const result = new Promise((r) => {
    resolve = r;
  });
  const tab = await chrome.tabs.create({
    url: "https://x.com/" + m.handle + "#myx-profile-lookup",
    active: false,
  });
  const timer = setTimeout(
    () => finishProfile(tab.id, { error: "X did not return this profile." }),
    16000,
  );
  profileLookups.set(tab.id, {
    parent: sender.tab.id,
    account: m.account,
    handle: m.handle,
    avatar:
      globalThis.MyXProfile.clean({ handle: m.handle, avatar: m.avatar })
        ?.avatar ||
      profile?.avatar ||
      "",
    result,
    resolve,
    timer,
  });
  return result;
}
// Per-tab session storage. No post data goes to a server or sync storage.
const key = (id) => "myx:" + id;
chrome.runtime.onMessage.addListener((m, sender, reply) => {
  if (!sender.tab || !/^https:\/\/x\.com\//.test(sender.url || "")) return;
  const k = key(sender.tab.id);
  (async () => {
    if (m.type === "FEED_CONTEXT") {
      const job = feedLookups.get(sender.tab.id);
      return job ? { account: job.account } : null;
    }
    if (m.type === "FEED_RESULT") {
      const job = feedLookups.get(sender.tab.id);
      if (!job || job.account !== m.account) return null;
      const items =
        Array.isArray(m.items) && JSON.stringify(m.items).length < 3000000
          ? m.items.slice(0, 500)
          : [];
      await finishFeed(
        sender.tab.id,
        m.error
          ? { error: String(m.error).slice(0, 300) }
          : { account: job.account, items },
      );
      return { ok: true };
    }
    if (m.type === "FEED_REFRESH") return requestFeed(m, sender);
    if (m.type === "FEED_CANCEL") {
      for (const [id, job] of feedLookups)
        if (job.parent === sender.tab.id)
          await finishFeed(id, { error: "Account changed; refresh canceled." });
      return { ok: true };
    }
    if (m.type === "PROFILE_CONTEXT") {
      const job = profileLookups.get(sender.tab.id);
      return job
        ? { handle: job.handle, account: job.account, avatar: job.avatar }
        : null;
    }
    if (m.type === "PROFILE_RESULT") {
      const job = profileLookups.get(sender.tab.id);
      if (!job || job.account !== m.account) return null;
      const profile = globalThis.MyXProfile.clean(m.profile);
      if (profile?.handle === job.handle)
        await cacheProfiles(job.account, [profile]);
      await finishProfile(
        sender.tab.id,
        profile?.handle === job.handle
          ? { profile }
          : { error: m.error || "Profile unavailable." },
      );
      return { ok: true };
    }
    if (m.type === "PROFILE_GET") return requestProfile(m, sender);
    const account =
      typeof m.account === "string" && /^[a-z0-9_]{1,15}$/.test(m.account)
        ? m.account
        : null;
    if (m.type === "PROFILE_SEED" && account && Array.isArray(m.profiles)) {
      const current = (await chrome.storage.session.get(k))[k]?.data?.account;
      if (current && current !== account) return null;
      await cacheProfiles(account, m.profiles, true);
      return { ok: true };
    }
    const mixKey = account && "myx:mix:" + account;
    if (m.type === "RULES_GET" && account) return rulesFor(account);
    if (
      m.type === "RULE_SET" &&
      account &&
      typeof m.handle === "string" &&
      /^[a-z0-9_]{1,15}$/.test(m.handle) &&
      m.kind === "all" &&
      typeof m.percent === "number" &&
      Number.isFinite(m.percent) &&
      m.percent >= 0 &&
      m.percent <= 100
    )
      return rulesFor(account, m);
    if (m.type === "MIX_GET" && mixKey)
      return (await chrome.storage.local.get(mixKey))[mixKey] || null;
    if (
      m.type === "MIX_SET" &&
      mixKey &&
      typeof m.percent === "number" &&
      Number.isFinite(m.percent) &&
      m.percent >= 0 &&
      m.percent <= 100
    ) {
      await chrome.storage.local.set({
        [mixKey]: { percent: m.percent, enabled: m.enabled !== false },
      });
      return { ok: true };
    }
    const prefKey = account && "myx:mutes:" + account;
    if (m.type === "MUTES_GET" && prefKey)
      return (
        (await chrome.storage.local.get(prefKey))[prefKey] || {
          muted: [],
          xMuted: [],
        }
      );
    if (m.type === "MUTES_SET" && prefKey) {
      const clean = (a) =>
        [
          ...new Set(
            (Array.isArray(a) ? a : []).filter(
              (v) => typeof v === "string" && /^[a-z0-9_]{1,15}$/.test(v),
            ),
          ),
        ].slice(0, 10000);
      await chrome.storage.local.set({
        [prefKey]: { muted: clean(m.muted), xMuted: clean(m.xMuted) },
      });
      return { ok: true };
    }
    if (m.type === "GET")
      return (await chrome.storage.session.get(k))[k] || null;
    if (m.type === "SET" && m.data && JSON.stringify(m.data).length < 8000000) {
      await chrome.storage.session.set({ [k]: m.data });
      return { ok: true };
    }
    if (m.type === "CLEAR") {
      await chrome.storage.session.remove(k);
      return { ok: true };
    }
    return null;
  })().then(reply, () =>
    reply({ error: "Session storage unavailable. Reload MyX." }),
  );
  return true;
});
chrome.tabs.onRemoved.addListener((id) => {
  chrome.storage.session.remove(key(id));
  const ownFeed = feedLookups.get(id);
  if (ownFeed) {
    clearTimeout(ownFeed.timer);
    feedLookups.delete(id);
    ownFeed.resolve({ error: "Refresh tab closed." });
  }
  for (const [lookupId, job] of feedLookups) {
    if (job.parent === id)
      finishFeed(lookupId, { error: "Reader tab closed." });
  }
  const own = profileLookups.get(id);
  if (own) {
    clearTimeout(own.timer);
    profileLookups.delete(id);
    own.resolve({ error: "Profile tab closed." });
  }
  for (const [lookupId, job] of profileLookups) {
    if (job.parent === id)
      finishProfile(lookupId, { error: "Reader tab closed." });
  }
});
