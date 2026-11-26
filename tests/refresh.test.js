import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
function worker() {
  let onMessage,
    onRemoved,
    nextId = 100;
  const records = {},
    created = [],
    removed = [],
    timers = new Map();
  const storage = {
    get: async (k) => ({ [k]: records[k] }),
    set: async (o) => Object.assign(records, o),
    remove: async (k) => delete records[k],
  };
  const chrome = {
    runtime: { onMessage: { addListener: (f) => (onMessage = f) } },
    storage: { session: storage, local: storage },
    tabs: {
      onRemoved: { addListener: (f) => (onRemoved = f) },
      create: async (o) => {
        created.push({ ...o, id: nextId });
        return { id: nextId++ };
      },
      get: async (id) => ({ id, active: false }),
      remove: async (id) => {
        removed.push(id);
        onRemoved(id);
      },
    },
  };
  vm.runInNewContext(fs.readFileSync("extension/background.js", "utf8"), {
    chrome,
    crypto: webcrypto,
    importScripts() {},
    setTimeout(f) {
      const id = timers.size + 1;
      timers.set(id, f);
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  const send = (m, id = 1, url = "https://x.com/home") =>
    new Promise((resolve) => {
      if (!onMessage(m, { tab: { id }, url }, resolve)) resolve(undefined);
    });
  return {
    send,
    created,
    removed,
    timers,
    records,
    close: (id) => onRemoved(id),
  };
}
const tick = () => new Promise((r) => setImmediate(r));
test("latest refresh uses a new inactive native X tab, checks account, and closes its helper", async () => {
  const w = worker();
  await w.send({ type: "SET", data: { data: { account: "alice" } } });
  const result = w.send({ type: "FEED_REFRESH", account: "alice" });
  await tick();
  assert.equal(w.created.length, 1);
  assert.equal(w.created[0].active, false);
  assert.equal(w.created[0].url, "https://x.com/home#myx-feed-sync");
  assert.equal((await w.send({ type: "FEED_CONTEXT" }, 100)).account, "alice");
  assert.match(
    (await w.send({ type: "FEED_REFRESH", account: "alice" })).error,
    /already/,
  );
  assert.equal(
    await w.send(
      { type: "FEED_RESULT", account: "bob", items: [{ id: "999" }] },
      100,
    ),
    null,
  );
  assert.equal(
    await w.send({ type: "FEED_RESULT", account: "alice", items: [] }, 999),
    null,
  );
  await w.send(
    { type: "FEED_RESULT", account: "alice", items: [{ id: "456" }] },
    100,
  );
  assert.equal((await result).items[0].id, "456");
  assert.ok(w.removed.includes(100));
  assert.equal(w.timers.size, 0);
});
test("refresh errors, account mismatch, off-site messages and parent closure cannot leak another account feed", async () => {
  const w = worker();
  await w.send({ type: "SET", data: { data: { account: "alice" } } });
  assert.equal(
    await w.send(
      { type: "FEED_REFRESH", account: "alice" },
      1,
      "https://evil.test/",
    ),
    undefined,
  );
  assert.match(
    (await w.send({ type: "FEED_REFRESH", account: "bob" })).error,
    /Account changed/,
  );
  const pending = w.send({ type: "FEED_REFRESH", account: "alice" });
  await tick();
  [...w.timers.values()][0]();
  assert.match((await pending).error, /did not finish/);
  const again = w.send({ type: "FEED_REFRESH", account: "alice" });
  await tick();
  w.close(1);
  assert.match((await again).error, /Reader tab closed/);
});
test("account proportions persist with a stable private seed; concurrent writes preserve different rules", async () => {
  const w = worker();
  const first = await w.send({ type: "RULES_GET", account: "alice" });
  assert.equal(typeof first.seed, "string");
  await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      w.send({
        type: "RULE_SET",
        account: "alice",
        handle: "writer" + i,
        kind: "post",
        percent: i * 10,
      }),
    ),
  );
  const rules = await w.send({ type: "RULES_GET", account: "alice" }, 2);
  assert.equal(rules.seed, first.seed);
  assert.equal(Object.keys(rules.accounts).length, 8);
  assert.equal(rules.accounts.writer7.post, 70);
  assert.notEqual(
    (await w.send({ type: "RULES_GET", account: "bob" })).seed,
    first.seed,
  );
  for (const percent of [-1, 101, NaN, "25"])
    assert.equal(
      await w.send({
        type: "RULE_SET",
        account: "alice",
        handle: "writer0",
        kind: "post",
        percent,
      }),
      null,
    );
  await w.send({
    type: "RULE_SET",
    account: "alice",
    handle: "__proto__",
    kind: "reply",
    percent: 25,
  });
  const special = await w.send({ type: "RULES_GET", account: "alice" });
  assert.equal(Object.hasOwn(special.accounts, "__proto__"), true);
  assert.equal(special.accounts.reply, undefined);
  await w.send({
    type: "RULE_SET",
    account: "alice",
    handle: "writer0",
    kind: "post",
    percent: 100,
  });
  assert.equal(
    Object.hasOwn(
      (await w.send({ type: "RULES_GET", account: "alice" })).accounts,
      "writer0",
    ),
    false,
  );
});

test("simultaneous refresh requests are bounded and cancellation only closes the requesting reader helper", async () => {
  const w = worker();
  const requests = Array.from({ length: 8 }, () =>
    w.send({ type: "FEED_REFRESH", account: "alice" }),
  );
  await tick();
  assert.equal(w.created.length, 1);
  await w.send({ type: "FEED_CANCEL" }, 2);
  assert.equal(w.removed.length, 0);
  await w.send({ type: "FEED_CANCEL" }, 1);
  const results = await Promise.all(requests);
  assert.ok(results.every((r) => r.error));
  assert.equal(w.removed.length, 1);
  assert.equal(w.timers.size, 0);
});
