import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
test("observer returns X fetch unchanged and makes no extra requests", async () => {
  let requests = 0;
  const sent = [];
  const response = {
    ok: true,
    clone: () => ({ json: async () => ({ timeline: true }) }),
  };
  const original = async () => {
    requests++;
    return response;
  };
  class XHR {}
  XHR.prototype.open = function () {};
  const window = {
    fetch: original,
    MyXTimeline: { extract: () => [{ id: "1" }] },
    postMessage: (m) => sent.push(m),
  };
  const document = { querySelector: () => ({ textContent: "Alice @alice" }) };
  vm.runInNewContext(fs.readFileSync("extension/observe.js", "utf8"), {
    window,
    document,
    location: { origin: "https://x.com", href: "https://x.com/home" },
    URL,
    XMLHttpRequest: XHR,
    Reflect,
    WeakMap,
    JSON,
    setTimeout,
  });
  const got = await window.fetch(
    "https://x.com/i/api/graphql/opaque/HomeLatestTimeline?variables=x",
    { headers: { Authorization: "not-read-by-observer" } },
  );
  await new Promise((r) => setImmediate(r));
  assert.equal(got, response);
  assert.equal(requests, 1);
  assert.equal(sent[0].source, "following");
  assert.equal(sent[0].account, "alice");
  assert.equal(JSON.stringify(sent).includes("Authorization"), false);
  await window.fetch("https://x.com/i/api/graphql/opaque/UnrelatedOperation");
  await new Promise((r) => setImmediate(r));
  assert.equal(requests, 2);
  assert.equal(sent.length, 1);
});
