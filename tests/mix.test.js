import test from "node:test";
import assert from "node:assert/strict";
import "../extension/engine.js";
const M = globalThis.MyXModel;
const post = (id, h) => ({
  id: String(id),
  handle: h,
  name: h,
  text: "",
  time: 1000 - id,
  kind: "post",
});
const data = () => ({
  following: Array.from({ length: 40 }, (_, i) => post(i + 1, "following" + i)),
  forYou: Array.from({ length: 200 }, (_, i) => post(i + 100, "new" + i)),
  relationships: Object.fromEntries(
    Array.from({ length: 200 }, (_, i) => ["new" + i, "not-following"]),
  ),
});
test("slider targets correctly interleave low, equal, and discovery-heavy mixes", () => {
  for (const [percentage, discoveries] of [
    [0, 0],
    [10, 4],
    [25, 13],
    [50, 40],
    [75, 120],
  ]) {
    const out = M.feed(data(), { discoveryPercent: percentage });
    assert.equal(out.filter((p) => p.discovery).length, discoveries);
    assert.equal(out.filter((p) => !p.discovery).length, 40);
    assert.equal(new Set(out.map((p) => p.id)).size, out.length);
    assert.deepEqual(
      out.filter((p) => !p.discovery).map((p) => p.id),
      M.feed(data(), { discovery: false }).map((p) => p.id),
    );
  }
});
test("100 percent uses only eligible real For You candidates; shortage never invents or repeats posts", () => {
  const d = data();
  d.forYou = d.forYou.slice(0, 2);
  d.forYou.push(d.forYou[0]);
  assert.equal(M.feed(d, { discoveryPercent: 100 }).length, 2);
  assert.ok(M.feed(d, { discoveryPercent: 100 }).every((p) => p.discovery));
  const out = M.feed(d, { discoveryPercent: 90 });
  assert.equal(out.length, 42);
  d.muted = ["new0"];
  assert.equal(M.feed(d, { discoveryPercent: 100 }).length, 1);
});
test("old preferences retain 10-plus-1 spacing, with explicit off and focused tabs respected", () => {
  const out = M.feed(data());
  assert.equal(out[10].discovery, true);
  assert.equal(out[21].discovery, true);
  assert.equal(
    M.feed(data(), { discovery: false, discoveryPercent: 100 }).length,
    40,
  );
  assert.ok(
    M.feed(data(), { tab: "post", discoveryPercent: 100 }).every(
      (p) => !p.discovery,
    ),
  );
  assert.equal(M.discoveryPercent({ discoveryPercent: NaN }), 100 / 11);
  assert.equal(M.discoveryPercent({ discoveryPercent: -1 }), 0);
  assert.equal(M.discoveryPercent({ discoveryPercent: 101 }), 100);
});
