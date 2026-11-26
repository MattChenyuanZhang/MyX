// Read the freshly loaded native Following tab. Never issues an API request itself.
(function (root) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function run() {
    let context,
      items = [],
      receivedAt = 0;
    const receive = (e) => {
      if (
        e.source !== window ||
        e.origin !== location.origin ||
        e.data?.type !== "MYX_TIMELINE_ITEMS_V1" ||
        e.data.source !== "following" ||
        !Array.isArray(e.data.items)
      )
        return;
      if (context && e.data.account !== context.account) return;
      items.push({
        account: e.data.account,
        items: e.data.items.slice(0, 500),
      });
      items = items.slice(-8);
      receivedAt = Date.now();
    };
    window.addEventListener("message", receive);
    try {
      for (let i = 0; i < 10 && !context; i++) {
        context = await chrome.runtime.sendMessage({ type: "FEED_CONTEXT" });
        if (!context) await wait(100);
      }
      if (!context) return;
      let following;
      for (let i = 0; i < 60; i++) {
        const account = root.MyXProfile.currentAccount(document);
        if (account && account !== context.account)
          throw Error("X account changed; refresh canceled.");
        following = [...document.querySelectorAll('[role="tab"]')].find(
          (t) => t.textContent.trim().toLowerCase() === "following",
        );
        if (account && following) break;
        await wait(200);
      }
      if (!following || !root.MyXProfile.currentAccount(document))
        throw Error(
          "Sign in to X and use its English Following tab to refresh.",
        );
      if (following.getAttribute("aria-selected") !== "true") following.click();
      for (let i = 0; i < 45; i++) {
        if (root.MyXProfile.currentAccount(document) !== context.account)
          throw Error("X account changed; refresh canceled.");
        const ready = items
          .filter((v) => v.account === context.account)
          .flatMap((v) => v.items);
        if (
          ready.length &&
          Date.now() - receivedAt >= 600 &&
          [...document.querySelectorAll('[role="tab"]')].some(
            (t) =>
              t.textContent.trim().toLowerCase() === "following" &&
              t.getAttribute("aria-selected") === "true",
          )
        ) {
          await chrome.runtime.sendMessage({
            type: "FEED_RESULT",
            account: context.account,
            items: root.MyXModel.merge([], ready),
          });
          return;
        }
        await wait(200);
      }
      throw Error(
        "X returned no Following activity. Try Refresh latest again.",
      );
    } catch (e) {
      if (context)
        await chrome.runtime.sendMessage({
          type: "FEED_RESULT",
          account: context.account,
          error: e.message,
        });
    } finally {
      window.removeEventListener("message", receive);
    }
  }
  root.MyXSync = { run };
})(globalThis);
