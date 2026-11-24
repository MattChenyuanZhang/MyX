import test from "node:test";
import assert from "node:assert/strict";
import "../extension/engine.js";
const M = globalThis.MyXModel;
const post = (i, extra = {}) => ({
  id: String(i),
  handle: "user" + i,
  name: "User " + i,
  text: "Post " + i,
  time: i,
  kind: "post",
  ...extra,
});
test("following stays chronological, with exactly one eligible For You post per 10", () => {
  let following = Array.from({ length: 23 }, (_, i) => post(i + 1));
  let d = {
    following,
    forYou: [post(99), post(98), post(97)],
    relationships: {
      user99: "not-following",
      user98: "not-following",
      user97: "not-following",
    },
  };
  let out = M.feed(d);
  assert.equal(out.length, 25);
  assert.equal(out[10].id, "99");
  assert.equal(out[21].id, "98");
  assert.deepEqual(
    out.filter((p) => !p.discovery).map((p) => p.time),
    following.map((p) => p.time).sort((a, b) => b - a),
  );
});
test("reject unknown relationships, followed authors, repost authors, and duplicates", () => {
  let following = Array.from({ length: 30 }, (_, i) => post(i + 1));
  following[0].actor = "knownactor";
  let d = {
    following,
    forYou: [
      post(1),
      post(81, { handle: "user2" }),
      post(82, { handle: "knownactor" }),
      post(83),
      post(84, { kind: "repost" }),
      post(85),
      post(85),
    ],
    relationships: {
      user1: "not-following",
      user2: "not-following",
      knownactor: "not-following",
      user84: "not-following",
      user85: "not-following",
    },
  };
  assert.deepEqual(
    M.feed(d)
      .filter((p) => p.discovery)
      .map((p) => p.id),
    ["85"],
  );
});
test("reply/repost filters apply before discovery spacing", () => {
  let d = {
    following: Array.from({ length: 20 }, (_, i) =>
      post(i + 1, { kind: i < 10 ? "reply" : "post" }),
    ),
    forYou: [post(99)],
    relationships: { user99: "not-following" },
  };
  let out = M.feed(d, { replies: false });
  assert.equal(out.length, 11);
  assert.equal(out[10].discovery, true);
  assert.equal(M.feed(d, { tab: "reply" }).length, 10);
  assert.equal(M.feed(d, { discovery: false }).length, 20);
});
test("merge preserves first observation, updates state, rejects invalid posts", () => {
  let p = post(3, { seenAt: 100, liked: false });
  let out = M.merge(
    [p],
    [
      post(3, { seenAt: 200, liked: true }),
      post(4, { time: NaN }),
      post("bad"),
    ],
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].seenAt, 100);
  assert.equal(out[0].liked, true);
});
test("status URLs are restricted to exact X post links", () => {
  assert.equal(M.statusLink("https://evil.test/a/status/1"), null);
  assert.equal(M.statusLink("https://x.com/a/status/1/analytics"), null);
  assert.equal(M.statusLink("javascript:alert(1)"), null);
  assert.equal(M.statusLink("/alice/status/123").id, "123");
});
test("account reset has no posts or relationship state", () => {
  let a = M.empty("@Alice");
  assert.equal(a.account, "alice");
  assert.deepEqual(a.following, []);
  assert.deepEqual(a.relationships, {});
});

test("activity order keeps an old original at its observed repost position", () => {
  const oldRepost = post(10, { time: 1, kind: "repost", actor: "friend" }),
    freshPost = post(11, { time: 100 });
  const d = {
    following: [oldRepost, freshPost],
    forYou: [],
    relationships: {},
  };
  assert.deepEqual(
    M.feed(d, { order: "activity" }).map((p) => p.id),
    ["10", "11"],
  );
  assert.deepEqual(
    M.feed(d, { order: "post-time" }).map((p) => p.id),
    ["11", "10"],
  );
});
test("repost actors are separate activities and overlapping windows merge in source order", () => {
  const a = post(10, { kind: "repost", actor: "alice" }),
    b = post(10, { kind: "repost", actor: "bob" }),
    c = post(11),
    d = post(12);
  assert.equal(M.merge([a], [a, b]).length, 2);
  const merged = M.mergeActivity([a, c], [c, b, d]);
  assert.deepEqual(merged.map(M.eventKey), [
    M.eventKey(a),
    M.eventKey(c),
    M.eventKey(b),
    M.eventKey(d),
  ]);
  assert.equal(M.mergeActivity(merged, [a, c]).length, 4);
  assert.deepEqual(M.mergeActivity([c], [a, c], true).map(M.eventKey), [
    M.eventKey(a),
    M.eventKey(c),
  ]);
});
test("muting an author or activity actor excludes all kinds and discovery before spacing", () => {
  const d = {
    following: [
      post(1, { handle: "muted" }),
      post(2, { kind: "reply", handle: "muted" }),
      post(3, { kind: "repost", actor: "muted" }),
      ...Array.from({ length: 10 }, (_, i) => post(30 + i)),
    ],
    forYou: [post(90, { handle: "muted" }), post(91)],
    relationships: { muted: "not-following", user91: "not-following" },
    muted: ["@Muted"],
    xMuted: [],
  };
  let out = M.feed(d, { order: "activity" });
  assert.equal(out.length, 11);
  assert.equal(out[10].id, "91");
  assert.equal(
    out.some((p) => ["1", "2", "3", "90"].includes(p.id)),
    false,
  );
  d.muted = [];
  d.xMuted = ["muted"];
  assert.equal(
    M.feed(d).some((p) => p.handle === "muted" || p.actor === "muted"),
    false,
  );
});

test("post state updates every reposter row without losing activity identity", () => {
  const a = post(1, {
      kind: "repost",
      actor: "alice",
      eventId: "10",
      eventTime: 100,
    }),
    b = post(1, {
      kind: "repost",
      actor: "bob",
      eventId: "11",
      eventTime: 200,
    });
  const updated = M.updatePostState([a, b, post(2)], "1", {
    liked: true,
    bookmarked: false,
    reposted: false,
    counts: { like: 2 },
  });
  assert.equal(updated[0].liked, true);
  assert.equal(updated[1].liked, true);
  assert.equal(updated[2].liked, undefined);
  assert.deepEqual(
    updated.slice(0, 2).map((p) => [p.eventId, p.actor, p.eventTime]),
    [
      ["10", "alice", 100],
      ["11", "bob", 200],
    ],
  );
});

test("account search includes authors, reposters, and mentioned reply accounts without invented profiles", () => {
  const data = {
    following: [
      post(1, {
        handle: "alice",
        name: "Alice Example",
        actor: "friend",
        context: "A Friend reposted",
        text: "Replying to @Other",
      }),
      post(2, { handle: "alice", name: "Alice Example" }),
    ],
  };
  assert.deepEqual(M.searchAccounts(data, "alice"), [
    { handle: "alice", name: "Alice Example" },
  ]);
  assert.deepEqual(M.searchAccounts(data, "A Friend"), [
    { handle: "friend", name: "A Friend" },
  ]);
  assert.deepEqual(M.searchAccounts(data, "@other"), [
    { handle: "other", name: "" },
  ]);
  assert.deepEqual(M.searchAccounts(data, "nonexistent"), []);
  assert.equal(
    M.accountSearchUrl("  Ada & Bob  "),
    "https://x.com/search?q=Ada%20%26%20Bob&src=typed_query&f=user",
  );
  assert.equal(M.accountSearchUrl("  "), null);
});
test("mention links preserve text and ignore emails, markup, and overlong handles", () => {
  const text =
    '<img onerror="bad"> @Alice, reply @Bob! mail@example.com @abcdefghijklmnop';
  const parts = M.mentionParts(text);
  assert.equal(parts.map((p) => p.text).join(""), text);
  assert.deepEqual(
    parts.filter((p) => p.handle).map((p) => p.handle),
    ["alice", "bob"],
  );
});
