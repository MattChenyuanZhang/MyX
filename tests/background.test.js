import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
test("session cache is isolated by tab, rejects off-site messages, and clears on close", async () => {
  let onMessage, onRemoved;
  const records = {};
  const chrome = {
    runtime: { onMessage: { addListener: (f) => (onMessage = f) } },
    tabs: { onRemoved: { addListener: (f) => (onRemoved = f) } },
    storage: {
      session: {
        get: async (k) => ({ [k]: records[k] }),
        set: async (o) => Object.assign(records, o),
        remove: async (k) => {
          delete records[k];
        },
      },
    },
  };
  vm.runInNewContext(fs.readFileSync("extension/background.js", "utf8"), {
    chrome,
    JSON,
    importScripts: () => {},
  });
  const send = (m, id = 1, url = "https://x.com/home") =>
    new Promise((resolve) => {
      const pending = onMessage(m, { tab: { id }, url }, resolve);
      if (!pending) resolve(undefined);
    });
  await send({ type: "SET", data: { account: "alice", posts: ["1"] } });
  assert.equal((await send({ type: "GET" })).account, "alice");
  assert.equal(await send({ type: "GET" }, 2), null);
  assert.equal(await send({ type: "GET" }, 1, "https://evil.test/"), undefined);
  onRemoved(1);
  assert.equal(await send({ type: "GET" }), null);
});

test("mute preferences persist separately per account and validate handles", async () => {
  let onMessage;
  const session = {},
    local = {};
  const storage = (records) => ({
    get: async (k) => ({ [k]: records[k] }),
    set: async (o) => Object.assign(records, o),
    remove: async (k) => {
      delete records[k];
    },
  });
  const chrome = {
    runtime: { onMessage: { addListener: (f) => (onMessage = f) } },
    tabs: { onRemoved: { addListener: () => {} } },
    storage: { session: storage(session), local: storage(local) },
  };
  vm.runInNewContext(fs.readFileSync("extension/background.js", "utf8"), {
    chrome,
    JSON,
    importScripts: () => {},
  });
  const send = (m) =>
    new Promise((resolve) =>
      onMessage(m, { tab: { id: 1 }, url: "https://x.com/home" }, resolve),
    );
  await send({
    type: "MUTES_SET",
    account: "alice",
    muted: ["writer", "writer", "bad/handle"],
    xMuted: ["blocked"],
  });
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(await send({ type: "MUTES_GET", account: "alice" })),
    ),
    { muted: ["writer"], xMuted: ["blocked"] },
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(await send({ type: "MUTES_GET", account: "bob" })),
    ),
    { muted: [], xMuted: [] },
  );
  await send({ type: "CLEAR" });
  assert.equal(
    (await send({ type: "MUTES_GET", account: "alice" })).muted[0],
    "writer",
  );
});

test("feed mix persists across tabs and session clearing, isolated by X account", async () => {
  let onMessage;
  const local = {},
    session = {};
  const storage = (records) => ({
    get: async (k) => ({ [k]: records[k] }),
    set: async (value) => Object.assign(records, value),
    remove: async (k) => {
      delete records[k];
    },
  });
  const chrome = {
    runtime: {
      onMessage: {
        addListener: (f) => {
          onMessage = f;
        },
      },
    },
    tabs: { onRemoved: { addListener: () => {} } },
    storage: { local: storage(local), session: storage(session) },
  };
  vm.runInNewContext(fs.readFileSync("extension/background.js", "utf8"), {
    chrome,
    JSON,
    importScripts: () => {},
  });
  const send = (m, id = 1) =>
    new Promise((resolve) =>
      onMessage(m, { tab: { id }, url: "https://x.com/home" }, resolve),
    );
  await send({ type: "MIX_SET", account: "alice", percent: 25, enabled: true });
  await send({ type: "CLEAR" });
  assert.equal(
    (await send({ type: "MIX_GET", account: "alice" }, 2)).percent,
    25,
  );
  assert.equal(await send({ type: "MIX_GET", account: "bob" }), null);
  for (const percent of [-1, 101, NaN, "50"]) {
    assert.equal(
      await send({ type: "MIX_SET", account: "alice", percent }),
      null,
    );
  }
  assert.equal((await send({ type: "MIX_GET", account: "alice" })).percent, 25);
  await send({ type: "MIX_SET", account: "bob", percent: 100, enabled: false });
  assert.equal(
    (await send({ type: "MIX_GET", account: "bob" })).enabled,
    false,
  );
  assert.equal((await send({ type: "MIX_GET", account: "alice" })).percent, 25);
});
