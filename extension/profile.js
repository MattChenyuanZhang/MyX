/* Public profile fields only. Shared by the content script and worker. */
(function (scope) {
  const valid = (h) => typeof h === "string" && /^[a-z0-9_]{1,15}$/.test(h);
  function clean(p) {
    if (!p || !valid(p.handle)) return null;
    const text = (s, n) => (typeof s === "string" ? s.slice(0, n) : "");
    const count = (s) => {
      const value = text(s, 80).trim();
      if (!/^\d+$/.test(value)) return value;
      const n = Number(value);
      return new Intl.NumberFormat(
        "en-US",
        n < 10000 ? {} : { notation: "compact", maximumFractionDigits: 1 },
      ).format(n);
    };
    return {
      handle: p.handle,
      name: text(p.name, 200) || p.handle,
      avatar:
        typeof p.avatar === "string" &&
        /^https:\/\/(?:pbs|abs)\.twimg\.com\//.test(p.avatar)
          ? p.avatar.slice(0, 2000)
          : "",
      bio: text(p.bio, 2000),
      followingCount: count(p.followingCount),
      followersCount: count(p.followersCount),
      following: typeof p.following === "boolean" ? p.following : null,
      verified: p.verified === true,
      capturedAt: Number.isFinite(p.capturedAt) ? p.capturedAt : Date.now(),
    };
  }
  function currentAccount(doc) {
    const text =
      doc.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')
        ?.textContent || "";
    const fromText = text.match(/@([A-Za-z0-9_]{1,15})\b/)?.[1]?.toLowerCase();
    if (valid(fromText)) return fromText;
    const link = doc.querySelector('[data-testid="AppTabBar_Profile_Link"]');
    try {
      const u = new URL(link?.getAttribute("href") || "", "https://x.com");
      const h = u.pathname
        .match(/^\/([A-Za-z0-9_]{1,15})\/?$/)?.[1]
        ?.toLowerCase();
      return u.origin === "https://x.com" && valid(h) ? h : "";
    } catch {
      return "";
    }
  }
  function hasDetails(p) {
    return !!(p && (p.bio || p.followersCount || p.followingCount));
  }
  function combine(old, next, partial = false) {
    const p = clean(next);
    if (!p) return old || null;
    if (!old) return p;
    return {
      ...p,
      avatar: p.avatar || old.avatar,
      ...(partial
        ? {
            bio: p.bio || old.bio,
            followersCount: p.followersCount || old.followersCount,
            followingCount: p.followingCount || old.followingCount,
            following: p.following ?? old.following,
            capturedAt: hasDetails(p) ? p.capturedAt : old.capturedAt,
          }
        : {}),
    };
  }
  function read(doc, handle) {
    if (!valid(handle)) return null;
    const main = doc.querySelector('[data-testid="primaryColumn"]');
    const name = main?.querySelector('[data-testid="UserName"]');
    if (
      !name ||
      !name.innerText
        .toLowerCase()
        .split(/\s+/)
        .includes("@" + handle)
    )
      return null;
    const links = [...main.querySelectorAll("a[href]")];
    const path = (a) => {
      try {
        return new URL(
          a.getAttribute("href"),
          "https://x.com",
        ).pathname.toLowerCase();
      } catch {
        return "";
      }
    };
    const count = (suffix) =>
      links
        .find((a) => path(a) === "/" + handle + suffix)
        ?.textContent.trim() || "";
    const avatar =
      links
        .find((a) => path(a) === "/" + handle + "/photo")
        ?.querySelector("img")?.src || "";
    const controls = [...main.querySelectorAll("button[data-testid]")].filter(
      (b) => !b.closest('article,[data-testid="UserCell"]'),
    );
    const followed = controls.some((b) => /-unfollow$/.test(b.dataset.testid));
    return clean({
      handle,
      name: name.innerText
        .split("\n")
        .find((t) => t.trim() && !t.trim().startsWith("@"))
        ?.trim(),
      avatar,
      bio:
        main.querySelector('[data-testid="UserDescription"]')?.textContent ||
        "",
      followingCount: count("/following").replace(/\s*Following$/i, ""),
      followersCount: (
        count("/verified_followers") || count("/followers")
      ).replace(/\s*Followers$/i, ""),
      following: followed
        ? true
        : controls.some((b) => /-follow$/.test(b.dataset.testid))
          ? false
          : null,
      verified: !!name.querySelector('[aria-label="Verified account"]'),
      capturedAt: Date.now(),
    });
  }
  async function lookup() {
    const context = await chrome.runtime.sendMessage({
      type: "PROFILE_CONTEXT",
    });
    if (!context?.handle || !context?.account) return;
    let profileReadyAt = 0;
    for (let n = 0; n < 60; n++) {
      const account = currentAccount(document);
      if (account && account !== context.account) break;
      const profile = read(document, context.handle);
      if (account === context.account && profile && !profileReadyAt)
        profileReadyAt = Date.now();
      if (
        account === context.account &&
        profile &&
        (hasDetails(profile) || Date.now() - profileReadyAt >= 1200) &&
        (profile.avatar ||
          context.avatar ||
          Date.now() - profileReadyAt >= 1200)
      ) {
        await chrome.runtime.sendMessage({
          type: "PROFILE_RESULT",
          account,
          profile: {
            ...profile,
            avatar: profile.avatar || context.avatar || "",
          },
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    await chrome.runtime.sendMessage({
      type: "PROFILE_RESULT",
      account: context.account,
      error: "X did not return this profile.",
    });
  }
  scope.MyXProfile = {
    clean,
    currentAccount,
    read,
    lookup,
    hasDetails,
    combine,
  };
})(globalThis);
