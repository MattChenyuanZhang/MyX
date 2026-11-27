import test from "node:test";
import assert from "node:assert/strict";
import "../extension/engine.js";
const M = globalThis.MyXModel;
test("native navigation tracks profile, thread, search and history surfaces", () => {
  assert.equal(M.surfaceForPath("/search"), "search");
  assert.equal(M.surfaceForPath("/i/chat"), "messages");
  assert.equal(M.surfaceForPath("/i/chat/pin/recovery"), "messages");
  assert.equal(M.surfaceForPath("/messages/123"), "messages");
  assert.equal(M.surfaceForPath("/i/lists"), "lists");
  assert.equal(M.surfaceForPath("/alice/lists"), "lists");
  assert.equal(M.surfaceForPath("/example"), "profile");
  assert.equal(M.surfaceForPath("/example/status/123"), "thread");
  assert.equal(M.surfaceForPath("/example/status/123/photo/1"), "thread");
  assert.equal(M.surfaceForPath("/i/history/likes"), "history");
  assert.equal(M.surfaceForPath("/i/bookmarks"), "bookmarks");
  assert.equal(M.surfaceForPath("/home"), null);
  assert.equal(M.surfaceForPath("/settings"), null);
});

// Regression: browser Back must restore MyX membership/order, independent of new arrival order.
test("reader checkpoints keep the originating account, tab, exact row order and discovery identity", () => {
  const one = {
    id: "1",
    eventId: "101",
    handle: "writer",
    time: 1,
    kind: "post",
    discovery: false,
  };
  const two = {
    id: "2",
    eventId: "102",
    handle: "other",
    time: 2,
    kind: "post",
    discovery: true,
  };
  const checkpoint = {
    account: "alice",
    view: "home",
    rows: [
      { key: M.eventKey(one), discovery: false },
      { key: M.eventKey(two), discovery: true },
    ],
    scroll: 780,
    anchorKey: M.eventKey(two),
    anchorTop: -30,
    prefs: { tab: "reply" },
  };
  const valid = M.readerCheckpoint(checkpoint, "alice");
  assert.equal(valid.scroll, 780);
  assert.equal(valid.prefs.tab, "reply");
  assert.deepEqual(
    M.restoreRows(
      [two, { ...one, liked: true }, { ...one, eventId: "103" }],
      valid.rows,
    ).map((p) => [p.id, !!p.discovery]),
    [
      ["1", false],
      ["2", true],
    ],
  );
  assert.equal(M.readerCheckpoint(checkpoint, "bob"), null);
  assert.equal(
    M.readerCheckpoint({ ...checkpoint, view: "invalid" }, "alice"),
    null,
  );
  assert.equal(
    M.readerCheckpoint({ ...checkpoint, scroll: NaN }, "alice").scroll,
    0,
  );
  assert.deepEqual(
    M.restoreRows([{ ...two, discovery: false }], valid.rows),
    [],
  );
});
test("action counts use X-style compact numbers while zero stays unobtrusive", () => {
  for (const [value, label] of [
    [0, ""],
    [46, "46"],
    [1800, "1.8K"],
    [89000, "89K"],
    [1300000, "1.3M"],
    ["1.8K", "1.8K"],
  ])
    assert.equal(M.formatCount(value), label);
});
