// Pure, bounded extraction of timeline items. No authentication or request data is retained.
(function (root) {
  const cleanHandle = (s) =>
    typeof s === "string" && /^[A-Za-z0-9_]{1,15}$/.test(s)
      ? s.toLowerCase()
      : null;
  const unwrap = (t) => t?.tweet || t;
  const user = (t) => t?.core?.user_results?.result;
  const handleOf = (u) =>
    cleanHandle(u?.core?.screen_name || u?.legacy?.screen_name);
  const https = (s) =>
    typeof s === "string" && /^https:\/\/(?:pbs|abs)\.twimg\.com\//.test(s)
      ? s
      : "";
  function parseItem(raw) {
    let t = unwrap(raw);
    if (!t?.legacy || !/^\d+$/.test(t.rest_id || "")) return null;
    const actorUser = user(t),
      actor = handleOf(actorUser);
    if (!actor) return null;
    const original = unwrap(
      t.legacy.retweeted_status_result?.result ||
        t.retweeted_status_result?.result,
    );
    const p = original?.legacy ? original : t,
      u = user(p),
      handle = handleOf(u);
    const eventTime = Date.parse(t.legacy.created_at),
      postTime = Date.parse(p.legacy.created_at);
    if (
      !handle ||
      !/^\d+$/.test(p.rest_id || "") ||
      !Number.isFinite(eventTime) ||
      !Number.isFinite(postTime)
    )
      return null;
    const originalID = p.rest_id;
    const text =
      p.note_tweet?.note_tweet_results?.result?.text ||
      p.legacy.full_text ||
      "";
    if (typeof text !== "string" || text.length > 100000) return null;
    const isFollowing =
      actorUser?.relationship_perspectives?.following ??
      actorUser?.legacy?.following;
    const muted =
      actorUser?.relationship_perspectives?.muting ?? actorUser?.legacy?.muting;
    const kind = original?.legacy
      ? "repost"
      : t.legacy.in_reply_to_status_id_str
        ? "reply"
        : "post";
    return {
      id: originalID,
      eventId: t.rest_id,
      eventTime,
      time: postTime,
      timeSource: "x-timeline-response",
      name: String(u?.core?.name || u?.legacy?.name || handle).slice(0, 200),
      handle,
      text,
      kind,
      replyTo:
        kind === "reply" ? cleanHandle(t.legacy.in_reply_to_screen_name) : null,
      actor: kind === "repost" ? actor : null,
      context:
        kind === "repost"
          ? String(actorUser?.core?.name || actorUser?.legacy?.name || actor) +
            " reposted"
          : "",
      url: "https://x.com/" + handle + "/status/" + originalID,
      avatar: https(u?.avatar?.image_url || u?.legacy?.profile_image_url_https),
      photos: (p.legacy.extended_entities?.media || [])
        .filter((m) => m.type === "photo")
        .slice(0, 4)
        .map((m) => ({
          url: https(m.media_url_https),
          alt: String(m.ext_alt_text || "Post photo").slice(0, 2000),
        }))
        .filter((m) => m.url),
      video: (p.legacy.extended_entities?.media || []).some(
        (m) => m.type === "video" || m.type === "animated_gif",
      ),
      counts: {
        reply: Number(p.legacy.reply_count) || 0,
        repost: Number(p.legacy.retweet_count) || 0,
        like: Number(p.legacy.favorite_count) || 0,
      },
      liked: p.legacy.favorited === true,
      bookmarked: p.legacy.bookmarked === true,
      reposted: p.legacy.retweeted === true,
      seenAt: Date.now(),
      followedActor: typeof isFollowing === "boolean" ? isFollowing : null,
      mutedActor: muted === true,
    };
  }
  function extract(payload) {
    const items = [],
      seen = new Set();
    let budget = 0;
    function visit(o, depth) {
      if (!o || typeof o !== "object" || depth > 24 || ++budget > 30000) return;
      if (o.itemType === "TimelineTweet" || o.tweet_results) {
        if (o.promotedMetadata || o.promoted_metadata) return;
        const p = parseItem(o.tweet_results?.result);
        if (p && !seen.has(p.eventId)) {
          seen.add(p.eventId);
          items.push(p);
        }
        // Do not descend into quoted/original tweet objects as separate activity.
        if (p) return;
      }
      if (Array.isArray(o)) {
        for (const v of o) visit(v, depth + 1);
      } else
        for (const [k, v] of Object.entries(o)) {
          if (!["quoted_status_result", "retweeted_status_result"].includes(k))
            visit(v, depth + 1);
        }
    }
    visit(payload, 0);
    return items.slice(0, 500);
  }
  root.MyXTimeline = { extract, parseItem };
})(globalThis);
