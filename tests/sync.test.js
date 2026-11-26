import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import "../extension/engine.js";
async function nativeSync({
  account = "alice",
  early = false,
  noResponse = false,
} = {}) {
  let receiver,
    clock = 1000,
    tab;
  const sent = [];
  const w = {
    addEventListener: (type, f) => (receiver = f),
    removeEventListener: () => {
      receiver = null;
    },
  };
  const item = {
    id: "555",
    eventId: "555",
    time: 1,
    eventTime: 1,
    handle: "writer",
    kind: "post",
  };
  const publish = () =>
    receiver({
      source: w,
      origin: "https://x.com",
      data: {
        type: "MYX_TIMELINE_ITEMS_V1",
        source: "following",
        account: "alice",
        items: [item],
      },
    });
  tab = {
    textContent: "Following",
    getAttribute: () => (early ? "true" : "false"),
    click() {
      tab = { textContent: "Following", getAttribute: () => "true" };
      if (!noResponse) publish();
    },
  };
  const context = {
    window: w,
    document: { querySelectorAll: () => [tab] },
    location: { origin: "https://x.com" },
    Date: { now: () => clock },
    setTimeout: (f, ms) => {
      clock += ms;
      queueMicrotask(f);
    },
    MyXModel: globalThis.MyXModel,
    MyXProfile: { currentAccount: () => account },
    chrome: {
      runtime: {
        sendMessage: async (m) => {
          sent.push(m);
          if (m.type === "FEED_CONTEXT") {
            if (early) publish();
            return { account: "alice" };
          }
          return { ok: true };
        },
      },
    },
  };
  vm.runInNewContext(fs.readFileSync("extension/sync.js", "utf8"), context);
  await context.MyXSync.run();
  return { sent, receiver };
}
test("refresh captures early native responses and re-reads replaced Following tab nodes", async () => {
  for (const early of [false, true]) {
    const { sent, receiver } = await nativeSync({ early });
    const result = sent.find((m) => m.type === "FEED_RESULT");
    assert.equal(result.items[0].id, "555");
    assert.equal(result.error, undefined);
    assert.equal(receiver, null);
  }
});
test("refresh fails visibly for account switches or missing native responses instead of returning stale success", async () => {
  assert.match(
    (await nativeSync({ account: "bob" })).sent.find(
      (m) => m.type === "FEED_RESULT",
    ).error,
    /account changed/,
  );
  assert.match(
    (await nativeSync({ noResponse: true })).sent.find(
      (m) => m.type === "FEED_RESULT",
    ).error,
    /no Following activity/,
  );
});
