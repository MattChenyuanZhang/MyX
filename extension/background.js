// Per-tab session storage. No post data goes to a server or sync storage.
const key = (id) => "myx:" + id;
chrome.runtime.onMessage.addListener((m, sender, reply) => {
  if (!sender.tab || !/^https:\/\/x\.com\//.test(sender.url || "")) return;
  const k = key(sender.tab.id);
  (async () => {
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
chrome.tabs.onRemoved.addListener((id) =>
  chrome.storage.session.remove(key(id)),
);
