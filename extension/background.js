importScripts("profile.js");
// Lookup tabs are created only for an explicit profile preview, and always closed.
const profileLookups = new Map();
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
  for (const [id, job] of profileLookups) {
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
    if (m.type === "PROFILE_CONTEXT") {
      const job = profileLookups.get(sender.tab.id);
      return job ? { handle: job.handle, account: job.account } : null;
    }
    if (m.type === "PROFILE_RESULT") {
      const job = profileLookups.get(sender.tab.id);
      if (!job || job.account !== m.account) return null;
      const profile = globalThis.MyXProfile.clean(m.profile);
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
