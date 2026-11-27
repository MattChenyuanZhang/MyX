import test from "node:test";
import assert from "node:assert/strict";
import "../extension/timeline.js";
import "../extension/engine.js";
const T = globalThis.MyXTimeline,
  M = globalThis.MyXModel;
function tweet(id, handle = "alice", time = "Mon Nov 23 10:00:00 +0000 2026") {
  return {
    __typename: "Tweet",
    rest_id: id,
    core: {
      user_results: {
        result: {
          core: { name: handle, screen_name: handle },
          relationship_perspectives: { following: true },
        },
      },
    },
    legacy: { created_at: time, full_text: "post " + id },
  };
}
function response(t) {
  return {
    data: {
      home: {
        instructions: [
          {
            entries: [
              {
                content: {
                  itemContent: {
                    itemType: "TimelineTweet",
                    tweet_results: { result: t },
                  },
                },
              },
            ],
          },
        ],
      },
    },
  };
}
test("repost uses wrapper activity ID and time, preserving original timestamp separately", () => {
  const original = tweet("1", "writer", "Sun Nov 22 10:00:00 +0000 2026"),
    rt = tweet("2", "alice", "Mon Nov 23 12:00:00 +0000 2026");
  rt.legacy.retweeted_status_result = { result: original };
  const p = T.extract(response(rt))[0];
  assert.equal(p.id, "1");
  assert.equal(p.eventId, "2");
  assert.equal(p.actor, "alice");
  assert.equal(p.handle, "writer");
  assert.equal(p.kind, "repost");
  assert.ok(p.eventTime > p.time);
  assert.equal(T.extract(response(rt)).length, 1);
});
test("reply kind comes from reply metadata even when no visible reply label exists", () => {
  const t = tweet("3");
  t.legacy.in_reply_to_status_id_str = "1";
  t.legacy.in_reply_to_screen_name = "ParentAuthor";
  assert.equal(T.extract(response(t))[0].kind, "reply");
  assert.equal(T.extract(response(t))[0].replyTo, "parentauthor");
});
test("ignores tombstones, ads and quoted tweet objects as independent events", () => {
  const t = tweet("3");
  t.quoted_status_result = { result: tweet("99") };
  assert.deepEqual(
    T.extract(response(t)).map((p) => p.id),
    ["3"],
  );
  let ad = response(t);
  ad.data.home.instructions[0].entries[0].content.itemContent.promotedMetadata =
    {};
  assert.equal(T.extract(ad).length, 0);
  assert.equal(T.extract(response({ __typename: "TweetTombstone" })).length, 0);
});
test("known activity times sort reposts with posts and retain different actors", () => {
  const a = tweet("11", "alice", "Mon Nov 23 12:00:00 +0000 2026"),
    b = tweet("12", "bob", "Mon Nov 23 13:00:00 +0000 2026");
  a.legacy.retweeted_status_result = { result: tweet("1") };
  b.legacy.retweeted_status_result = { result: tweet("1") };
  const posts = M.merge(T.extract(response(a)), T.extract(response(b)));
  assert.equal(posts.length, 2);
  assert.deepEqual(
    M.feed({ following: posts }, { order: "activity" }).map((p) => p.eventId),
    ["12", "11"],
  );
});
test("known non-followed context rows do not become followed activity", () => {
  const t = tweet("9");
  t.core.user_results.result.relationship_perspectives.following = false;
  const p = T.extract(response(t))[0];
  assert.equal(
    M.feed({ following: [p], forYou: [] }, { order: "activity" }).length,
    0,
  );
});

test("timeline profiles expose public bio and follower counts without copying account secrets", () => {
  const t = tweet("9");
  const u = t.core.user_results.result;
  u.legacy ||= {};
  u.legacy.description = "An actual biography";
  u.legacy.followers_count = 4217;
  u.legacy.friends_count = 126;
  u.auth_token = "never";
  const p = T.extract(response(t))[0].profiles[0];
  assert.equal(p.bio, "An actual biography");
  assert.equal(p.followersCount, "4217");
  assert.equal(p.followingCount, "126");
  assert.equal(p.auth_token, undefined);
});

test("video extraction retains the highest bitrate native MP4 and poster on reposts", () => {
  const original = tweet("10", "writer");
  original.legacy.extended_entities = {
    media: [
      {
        type: "video",
        media_url_https: "https://pbs.twimg.com/video.jpg",
        video_info: {
          variants: [
            {
              content_type: "application/x-mpegURL",
              url: "https://video.twimg.com/a.m3u8",
            },
            {
              content_type: "video/mp4",
              bitrate: 256000,
              url: "https://video.twimg.com/small.mp4",
            },
            {
              content_type: "video/mp4",
              bitrate: 832000,
              url: "https://video.twimg.com/large.mp4",
            },
            {
              content_type: "video/mp4",
              bitrate: 9999999,
              url: "https://evil.test/bad.mp4",
            },
          ],
        },
      },
    ],
  };
  const rt = tweet("11", "alice");
  rt.legacy.retweeted_status_result = { result: original };
  const p = T.extract(response(rt))[0];
  assert.equal(p.video, true);
  assert.equal(p.videos[0].src, "https://video.twimg.com/large.mp4");
  assert.equal(p.videos[0].poster, "https://pbs.twimg.com/video.jpg");
  assert.equal(p.kind, "repost");
});

test("the action row view counter belongs to the original post even on reposts", () => {
  const original = tweet("801", "writer"),
    rt = tweet("802", "alice");
  original.views = { count: "89000" };
  rt.views = { count: "7" };
  rt.legacy.retweeted_status_result = { result: original };
  assert.equal(T.extract(response(rt))[0].counts.views, 89000);
});
