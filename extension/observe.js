// Runs in X's page world solely to read copies of timeline responses X requested.
// It neither issues requests nor reads cookies, headers, tokens, or request bodies.
(function () {
  if (window.__myxTimelineObserver) return;
  window.__myxTimelineObserver = true;
  function source(input) {
    try {
      const url = new URL(
        typeof input === "string" ? input : input?.url,
        location.href,
      );
      if (!["x.com", "api.x.com"].includes(url.hostname)) return null;
      if (
        /\/(HomeLatestTimeline|FollowingTimeline)(?:\?|$)/.test(
          url.pathname + url.search,
        )
      )
        return "following";
      if (/\/HomeTimeline(?:\?|$)/.test(url.pathname + url.search))
        return "forYou";
      return null;
    } catch {
      return null;
    }
  }
  const account = () =>
    document
      .querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')
      ?.textContent?.match(/@([A-Za-z0-9_]{1,15})\b/)?.[1]
      ?.toLowerCase();
  function publish(body, which, atRequest) {
    try {
      const items = window.MyXTimeline.extract(body);
      if (!items.length) return;
      let tries = 0;
      const send = () => {
        const current = account();
        if (atRequest && current && atRequest !== current) return;
        if (!current && tries++ < 20) {
          setTimeout(send, 250);
          return;
        }
        if (current)
          window.postMessage(
            {
              type: "MYX_TIMELINE_ITEMS_V1",
              account: atRequest || current,
              source: which,
              items,
            },
            location.origin,
          );
      };
      send();
    } catch {}
  }
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const which = source(args[0]),
      atRequest = which && account();
    const task = Reflect.apply(originalFetch, this, args);
    if (which)
      task
        .then((response) => {
          if (response.ok)
            response
              .clone()
              .json()
              .then((body) => publish(body, which, atRequest))
              .catch(() => {});
        })
        .catch(() => {});
    return task;
  };
  const open = XMLHttpRequest.prototype.open,
    pending = new WeakMap();
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    const which = source(url);
    if (which) {
      pending.set(this, { which, account: account() });
      this.addEventListener(
        "load",
        () => {
          const info = pending.get(this);
          if (!info || this.status < 200 || this.status >= 300) return;
          try {
            const body =
              this.responseType === "json"
                ? this.response
                : JSON.parse(this.responseText);
            publish(body, info.which, info.account);
          } catch {}
        },
        { once: true },
      );
    }
    return Reflect.apply(open, this, [method, url, ...rest]);
  };
})();
