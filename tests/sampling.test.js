import test from "node:test";
import assert from "node:assert/strict";
import "../extension/engine.js";
const M = globalThis.MyXModel;
const post = (id, kind = "post", h = "alice") => ({
  id: String(id),
  eventId: String(id),
  time: id,
  kind,
  handle: h,
  actor: kind === "repost" ? "reposter" : null,
});
test("per-account percentages sample each activity type independently, stably, and before discovery spacing", () => {
  const following = Array.from({ length: 3000 }, (_, i) =>
    post(i + 1, ["post", "reply", "repost"][i % 3]),
  );
  const accountRules = {
    seed: "fixed-random-seed",
    accounts: { alice: { post: 0, reply: 50 }, reposter: { repost: 100 } },
  };
  const out = M.feed({ following }, { accountRules, discovery: false });
  assert.equal(out.filter((p) => p.kind === "post").length, 0);
  assert.equal(out.filter((p) => p.kind === "repost").length, 1000);
  assert.ok(
    out.filter((p) => p.kind === "reply").length > 430 &&
      out.filter((p) => p.kind === "reply").length < 570,
  );
  assert.deepEqual(
    out,
    M.feed({ following }, { accountRules, discovery: false }),
  );
  const lower = M.feed(
    { following },
    {
      accountRules: {
        ...accountRules,
        accounts: { alice: { reply: 25, post: 0 }, reposter: { repost: 100 } },
      },
      discovery: false,
    },
  );
  assert.ok(
    lower.every((p) => out.some((v) => M.eventKey(v) === M.eventKey(p))),
  );
  assert.equal(M.activityAccount(post(1, "repost", "original")), "reposter");
  assert.equal(
    M.feed(
      { following: [post(1, "repost", "original")] },
      { accountRules: { seed: "s", accounts: { original: { repost: 0 } } } },
    ).length,
    1,
  );
});
test("0 and 100 endpoints, actor-specific reposts, default rates, and duplicate stability", () => {
  const p = post(1);
  assert.equal(
    M.includeActivity(p, { seed: "s", accounts: { alice: { post: 0 } } }),
    false,
  );
  assert.equal(
    M.includeActivity(p, { seed: "s", accounts: { alice: { post: 100 } } }),
    true,
  );
  assert.equal(M.accountRate({}, "alice", "post"), 100);
  assert.equal(
    M.sampleRank(p, "s"),
    M.sampleRank({ ...p, text: "updated" }, "s"),
  );
  assert.notEqual(M.sampleRank(p, "s"), M.sampleRank(p, "another-user-seed"));
});
test("video sources only accept X media HTTPS origins and reject injected URLs", () => {
  const safe = {
    src: "https://video.twimg.com/ext_tw_video/a.mp4?tag=12",
    poster: "https://pbs.twimg.com/a.jpg",
    gif: true,
  };
  assert.deepEqual(M.cleanVideos([safe]), [safe]);
  for (const src of [
    "javascript:bad()",
    "https://evil.test/a.mp4",
    "https://video.twimg.com.evil.test/a.mp4",
    "http://video.twimg.com/a.mp4",
  ])
    assert.deepEqual(M.cleanVideos([{ src }]), []);
  assert.deepEqual(M.cleanVideos("invalid"), []);
});
