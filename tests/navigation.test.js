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
