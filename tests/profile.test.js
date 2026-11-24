import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import "../extension/profile.js";
const P = globalThis.MyXProfile;
test("profile previews retain only bounded public fields and safe images", () => {
  const p = P.clean({
    handle: "alice",
    name: "Alice",
    bio: "<img src=x onerror=bad()>",
    avatar: "https://evil.test/a.png",
    followingCount: "27",
    followersCount: "101",
    following: true,
    token: "never",
    cookie: "never",
  });
  assert.equal(p.avatar, "");
  assert.equal(p.bio, "<img src=x onerror=bad()>");
  assert.equal(p.following, true);
  assert.equal(p.token, undefined);
  assert.equal(p.cookie, undefined);
  assert.equal(P.clean({ handle: "bad/name" }), null);
  assert.equal(
    P.clean({ handle: "alice", bio: "x".repeat(3000) }).bio.length,
    2000,
  );
});
function worker() {
  let onMessage,
    onRemoved,
    nextId = 100;
  const created = [],
    removed = [],
    records = {},
    timers = new Map();
  const storage = {
    get: async (k) => ({ [k]: records[k] }),
    set: async (o) => Object.assign(records, o),
    remove: async (k) => delete records[k],
  };
  const context = vm.createContext({
    JSON,
    Date,
    MyXProfile: P,
    importScripts() {},
    setTimeout(f) {
      const id = timers.size + 1;
      timers.set(id, f);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    chrome: {
      runtime: { onMessage: { addListener: (f) => (onMessage = f) } },
      storage: { session: storage, local: storage },
      tabs: {
        get: async (id) => ({ id, active: false }),
        onRemoved: { addListener: (f) => (onRemoved = f) },
        create: async (o) => {
          created.push({ ...o, id: nextId });
          return { id: nextId++ };
        },
        remove: async (id) => {
          removed.push(id);
          onRemoved(id);
        },
      },
    },
  });
  vm.runInContext(fs.readFileSync("extension/background.js", "utf8"), context);
  const send = (m, id = 1, url = "https://x.com/home") =>
    new Promise((resolve) => {
      if (!onMessage(m, { tab: { id }, url }, resolve)) resolve(undefined);
    });
  return {
    send,
    created,
    removed,
    records,
    timers,
    close: (id) => onRemoved(id),
  };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
test("profile lookup uses an inactive owned X tab, checks account and closes it after a sanitized result", async () => {
  const w = worker();
  await w.send({ type: "SET", data: { data: { account: "alice" } } });
  const result = w.send({
    type: "PROFILE_GET",
    account: "alice",
    handle: "writer",
  });
  await tick();
  assert.equal(w.created[0].active, false);
  assert.equal(w.created[0].url, "https://x.com/writer#myx-profile-lookup");
  const own = w.created[0].id;
  assert.equal(
    (await w.send({ type: "PROFILE_CONTEXT" }, own)).handle,
    "writer",
  );
  assert.equal(await w.send({ type: "PROFILE_CONTEXT" }, 999), null);
  await w.send(
    { type: "PROFILE_RESULT", account: "bob", profile: { handle: "writer" } },
    own,
  );
  assert.equal(w.removed.length, 0);
  await w.send(
    {
      type: "PROFILE_RESULT",
      account: "alice",
      profile: {
        handle: "writer",
        name: "Writer",
        bio: "Actual biography",
        token: "never",
      },
    },
    own,
  );
  const r = await result;
  assert.equal(r.profile.name, "Writer");
  assert.equal(r.profile.token, undefined);
  assert.deepEqual(w.removed, [own]);
  assert.equal(w.timers.size, 0);
  assert.equal((await w.send({ type: "GET" })).data.account, "alice");
});
test("lookup requests reject foreign origins and changed accounts; reader close cleans up only owned tabs", async () => {
  const w = worker();
  assert.equal(
    await w.send(
      { type: "PROFILE_GET", account: "alice", handle: "writer" },
      1,
      "https://evil.test/",
    ),
    undefined,
  );
  assert.equal(w.created.length, 0);
  await w.send({ type: "SET", data: { data: { account: "bob" } } });
  assert.equal(
    (await w.send({ type: "PROFILE_GET", account: "alice", handle: "writer" }))
      .error,
    "Account changed.",
  );
  assert.equal(w.created.length, 0);
  const result = w.send({
    type: "PROFILE_GET",
    account: "bob",
    handle: "writer",
  });
  await tick();
  w.close(1);
  assert.equal((await result).error, "Reader tab closed.");
  assert.deepEqual(w.removed, [100]);
});
test("lookup timeout resolves with no fabricated profile and closes the temporary tab", async () => {
  const w = worker();
  const result = w.send({
    type: "PROFILE_GET",
    account: "alice",
    handle: "writer",
  });
  await tick();
  await [...w.timers.values()][0]();
  assert.equal((await result).profile, undefined);
  assert.deepEqual(w.removed, [100]);
});

test("native profile parser checks the exact handle and reads bio, counts and relationship outside posts", () => {
  const name = {
    innerText: "Actual Person\n@Writer",
    querySelector: () => null,
  };
  const makeLink = (href, text, img = "") => ({
    getAttribute: () => href,
    textContent: text,
    querySelector: () => (img ? { src: img } : null),
  });
  const links = [
    makeLink(
      "/Writer/photo",
      "",
      "https://pbs.twimg.com/profile_images/example.jpg",
    ),
    makeLink("/Writer/following", "126 Following"),
    makeLink("/Writer/verified_followers", "4,217 Followers"),
  ];
  const controls = [
    { dataset: { testid: "123-unfollow" }, closest: () => null },
  ];
  const main = {
    querySelector: (s) =>
      s.includes("UserName")
        ? name
        : s.includes("UserDescription")
          ? { textContent: "Biography from the native page." }
          : null,
    querySelectorAll: (s) => (s === "a[href]" ? links : controls),
  };
  const doc = { querySelector: () => main };
  const p = P.read(doc, "writer");
  assert.equal(p.name, "Actual Person");
  assert.equal(p.bio, "Biography from the native page.");
  assert.equal(p.followingCount, "126");
  assert.equal(p.followersCount, "4,217");
  assert.equal(p.following, true);
  assert.equal(p.avatar, "https://pbs.twimg.com/profile_images/example.jpg");
  assert.equal(P.read(doc, "someoneelse"), null);
});
