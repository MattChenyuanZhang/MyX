/* One shell for document-start, account loading, and the hydrated reader. */
(function (scope) {
  const template = `<style>
:host{font:15px/20px TwitterChirp,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#0f1419;color-scheme:light;--myx-line:#eff1f2;--myx-hover:rgba(15,20,25,.1);--myx-native-left:max(88px,calc((100vw - 1265px)/2 + 275px));--myx-native-width:600px}
*{box-sizing:border-box}button,input,select{font:inherit}button,a{touch-action:manipulation}button{cursor:pointer;color:inherit;background:none;border:0;transition:background-color .2s,color .2s}button:hover{background:var(--myx-hover)}button:disabled{cursor:default}a{color:#1d9bf0;text-decoration:none}a:hover{text-decoration:underline}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid #1d9bf0;outline-offset:2px}[hidden]{display:none!important}
.app{height:100dvh;overflow:auto;background:#fff;scrollbar-gutter:stable}
.layout{max-width:1265px;min-height:100%;margin:auto;display:grid;grid-template-columns:275px minmax(0,600px) minmax(0,390px)}
.left{padding:0 8px;position:sticky;top:0;height:100dvh;display:flex;flex-direction:column;align-items:flex-start}
.logo{display:flex;align-items:center;height:58px;padding:12px;font-size:30px;line-height:34px;font-weight:850;letter-spacing:-1.7px;flex-shrink:0}.logo span{color:#1d9bf0}
.nav{display:flex;align-items:center;width:100%;padding:4px 0;text-align:left;font-size:20px;line-height:24px;margin:0;flex-shrink:0}.nav:hover{background:transparent}.nav-pill{display:inline-flex;align-items:center;gap:20px;padding:12px 28px 12px 12px;border-radius:9999px;transition:background-color .2s}.nav:hover .nav-pill{background:var(--myx-hover)}.nav.active{font-weight:700}.nav svg{width:26.25px;height:26.25px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.nav.active [data-icon="home"]{fill:currentColor;stroke-width:1.2}
.primary{background:#0f1419;color:#fff;border-radius:9999px;padding:12px 22px;font-weight:700}.primary:hover{background:#272c30}.blue{background:#1d9bf0}.blue:hover{background:#1a8cd8}.left .primary{width:90%;height:52px;min-height:52px;margin-top:4px;padding:0 24px;font-size:17px;line-height:20px}
.account{display:flex;align-items:center;gap:12px;margin-top:auto;margin-bottom:12px;width:100%;min-height:64px;border-radius:9999px;padding:12px;text-align:left;overflow:hidden;font-size:15px;line-height:20px}.account .avatar{width:40px;height:40px}.identity{display:block;min-width:0;flex:1}.identity b,.identity span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.identity span{color:#536471}.account-more{font-size:20px;letter-spacing:1px}
.main{border:1px solid var(--myx-line);border-top:0;min-width:0}.top{position:sticky;top:0;background:#fffffff2;backdrop-filter:blur(12px);z-index:2}.heading{height:54px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}.heading h1{margin:0;font-size:20px;line-height:24px;font-weight:700}.heading .secondary{padding:8px 14px;font-size:14px}
.tabs{display:flex;border-bottom:1px solid var(--myx-line);height:53px}.tabs button{flex:1;padding:16px 8px;color:#536471;position:relative;font-weight:600}.tabs button.active{color:#0f1419}.tabs button.active:after{content:'';position:absolute;height:4px;background:#1d9bf0;bottom:0;left:32%;right:32%;border-radius:6px}
.coverage{min-height:64px;padding:12px 16px;background:#f7f9f9;border-bottom:1px solid var(--myx-line);font-size:13px;line-height:20px;color:#536471}.coverage b{color:#0f1419}.post{cursor:pointer;padding:12px 16px 8px;border-bottom:1px solid var(--myx-line);transition:background-color .2s}.post:focus-visible{outline:2px solid #1d9bf0;outline-offset:-2px}.post:hover{background:rgba(0,0,0,.03)}.context{font-size:13px;line-height:16px;color:#536471;margin:0 0 4px 52px}.context a{color:inherit}.discovery{color:#1d9bf0}.row{display:flex;gap:12px}.avatar{width:40px;height:40px;border-radius:50%;background:#eff1f2;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;font-weight:700}.avatar img{width:100%;height:100%;object-fit:cover}.avatar:hover{opacity:.85}.body{min-width:0;flex:1}.by{display:flex;flex-wrap:wrap;gap:4px;align-items:center;line-height:20px}.by a{color:inherit}.by .meta{color:#536471;font-size:15px}.text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:20px;margin:4px 0 12px}.media{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:3px;border-radius:16px;overflow:hidden;border:1px solid var(--myx-line)}.media img{width:100%;height:230px;object-fit:cover}.tiny{font-size:12px;line-height:16px;color:#536471}
.actions{display:flex;align-items:center;margin-top:4px;min-height:34px;color:#536471}.action-slot{display:flex;align-items:center;min-width:0}.primary-action{flex:1 1 0%}.trailing{flex:0 0 auto;margin-left:12px}.actions button{display:inline-flex;align-items:center;gap:4px;padding:0;max-width:100%;min-width:18.75px;height:34px;color:#536471;font-size:13px;line-height:16px}.actions button:hover{background:transparent;color:#1d9bf0}.action-icon{width:18.75px;height:18.75px;display:inline-flex;align-items:center;justify-content:center;position:relative;flex:none;isolation:isolate}.action-icon:before{content:"";position:absolute;inset:-8px;border-radius:50%;z-index:-1;transition:background-color .2s}.actions button:hover .action-icon:before{background:rgba(29,155,240,.1)}.actions svg{width:18.75px;height:18.75px;fill:currentColor;stroke:none}.actions .count{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.actions [data-act="like"]:hover,.actions .liked{color:#f91880}.actions [data-act="like"]:hover .action-icon:before{background:rgba(249,24,128,.1)}.actions [data-act="repost"]:hover,.actions [data-act="repost"].selected{color:#00ba7c}.actions [data-act="repost"]:hover .action-icon:before{background:rgba(0,186,124,.1)}.actions [data-act="bookmark"].selected{color:#1d9bf0}

.right{padding:5px 10px 20px 30px;position:sticky;top:0;height:100dvh;overflow:auto;min-width:0}.right>*{max-width:350px}.right h3{font-size:20px;line-height:24px;font-weight:700;margin:16px 0}.search{width:100%;height:44px;border:1px solid #cfd9de;padding:11px 16px;border-radius:9999px;background:#fff;outline:none}.search:focus{border:2px solid #1d9bf0;padding-left:15px;outline:none}.setting{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:19px 0;font-size:15px;line-height:20px}.setting input{accent-color:#1d9bf0;width:18px;height:18px;flex-shrink:0}.rule{border-top:1px solid var(--myx-line);margin:24px 0}.eyebrow{font-size:11px;font-weight:750;letter-spacing:1.4px;color:#1d9bf0}.help{font-size:14px;color:#536471;line-height:1.6}.status{font-size:13px;line-height:20px;padding:12px 16px;border-bottom:1px solid var(--myx-line);color:#536471}.empty{padding:40px 24px}.empty h2{font-size:28px;line-height:32px;letter-spacing:-.6px}.empty p{color:#536471;max-width:430px;line-height:22px}.tools{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0}.secondary{border:1px solid #cfd9de;border-radius:9999px;padding:9px 15px;font-weight:600}.list{display:grid;gap:15px;margin-top:20px}.list button{text-align:left;padding:15px;border:1px solid var(--myx-line);border-radius:12px}.toast{position:fixed;bottom:35px;left:50%;transform:translateX(-50%);z-index:5;max-width:90vw;padding:13px 22px;background:#1d9bf0;color:white;border-radius:4px;box-shadow:0 2px 12px #0002}.mobiletools{display:none}.tag{padding:3px 9px;background:#eaf6fe;color:#1d9bf0;border-radius:15px;font-size:12px}
#account-search{position:relative}#account-results{position:absolute;top:100%;left:0;right:0;background:Canvas;color:CanvasText;border:1px solid var(--myx-line);border-radius:8px;box-shadow:0 0 15px #65778633,0 0 3px 1px #65778626;z-index:8;overflow:hidden}#account-results a,#account-results button{display:block;width:100%;padding:12px 16px;text-align:left;color:inherit}#account-results a:hover{background:rgba(0,0,0,.03);text-decoration:none}#account-results span{display:block;font-size:15px;color:#536471}.mute{font-size:12px;line-height:16px;color:#536471;border:1px solid #cfd9de;border-radius:9999px;margin-left:auto;padding:2px 8px}select,input#mute-handle{border:1px solid #cfd9de;border-radius:8px;background:transparent;color:inherit;padding:8px;font:inherit;max-width:65%}
:host(.native-surface){pointer-events:none}:host(.native-surface) .app{background:transparent;overflow:hidden}:host(.native-surface) .layout{max-width:none;grid-template-columns:var(--myx-native-left) var(--myx-native-width) minmax(0,1fr)}:host(.native-surface) .left,:host(.native-surface) .right{background:#fff;pointer-events:auto;z-index:3}:host(.native-surface) .left{padding-left:max(8px,calc(var(--myx-native-left) - 267px))}:host(.native-surface) .main{background:transparent;pointer-events:none}:host(.native-surface) .top{pointer-events:auto;background:#fff}:host(.native-surface) .tabs,:host(.native-surface) .coverage,:host(.native-surface) .status,:host(.native-surface) #feed,:host(.native-surface) .mobiletools{display:none}
:host(.booting) .app{pointer-events:none}:host(.booting) #native{pointer-events:auto}:host(.booting) #coverage{min-height:64px}:host(.booting) .account{min-height:64px}.loading-row{display:flex;gap:12px;padding:16px;border-bottom:1px solid var(--myx-line)}.loading-row i{width:40px;height:40px;border-radius:50%;background:#eff1f2;flex:none}.loading-row div{flex:1}.loading-row b,.loading-row p{display:block;background:#eff1f2;border-radius:6px;height:14px;margin:4px 0 14px}.loading-row b{width:36%}.loading-row p:last-child{width:72%}:host(.booting.native-surface) .app,:host(.booting.native-surface) .main{background:Canvas}:host(.booting.native-surface) #feed{display:block}
@media(prefers-color-scheme:dark){:host{color-scheme:dark;color:#e7e9ea;--myx-line:#2f3336;--myx-hover:rgba(231,233,234,.1)}.app{background:#000}.top{background:#000e}.coverage{background:#080808}.coverage b,.tabs button.active{color:#e7e9ea}.post:hover,#account-results a:hover{background:rgba(255,255,255,.03)}.search{background:#000;color:#e7e9ea}.primary{background:#eff3f4;color:#0f1419}.primary:hover{background:#d7dbdc}.blue{background:#1d9bf0;color:white}.blue:hover{background:#1a8cd8}.secondary,.mute,.list button{border-color:#536471}.tag{background:#102c3e}.loading-row i,.loading-row b,.loading-row p{background:#202327}:host(.native-surface) .left,:host(.native-surface) .right,:host(.native-surface) .top{background:#000}}
@media(max-width:1280px){:host{--myx-native-left:max(88px,calc((100vw - 1078px)/2 + 88px))}.layout{max-width:1078px;grid-template-columns:88px minmax(0,600px) minmax(0,390px)}.left{align-items:center;padding:0 4px}.nav{justify-content:center}.nav-pill{padding:12px}.nav-pill>span,.identity,.account-more{display:none}.logo{font-size:24px;padding:12px 4px}.left .primary{width:52px;font-size:0;padding:0}.left .primary:after{content:'+';font-size:27px}.account{width:64px;justify-content:center}.mobiletools{display:flex;gap:8px;padding:10px 16px;border-bottom:1px solid var(--myx-line)}:host(.native-surface) .left{padding-left:max(4px,calc(var(--myx-native-left) - 84px))}}
@media(max-width:1005px){.layout{max-width:688px;grid-template-columns:88px minmax(0,600px)}.right{display:none}:host{--myx-native-left:max(88px,calc((100vw - 688px)/2 + 88px))}}
@media(max-width:650px){.layout{display:block}.left{display:none}.main{border:0}.post{padding:12px 16px 8px}.heading h1{font-size:20px}.actions .trailing{margin-left:8px}.media img{height:200px}:host(.native-surface) .layout{display:block}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}

.profile-card{position:fixed;width:300px;max-width:calc(100vw - 16px);padding:16px;background:Canvas;color:CanvasText;border:1px solid var(--myx-line);border-radius:16px;box-shadow:0 0 15px #65778633,0 0 3px 1px #65778626;z-index:9;pointer-events:auto;font-size:15px;line-height:20px}.profile-card a{color:inherit}.profile-card .preview-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.profile-card .avatar{width:64px;height:64px}.profile-card .preview-name{font-weight:700;font-size:17px;line-height:22px}.profile-card .preview-name [aria-label="Verified account"]{color:#1d9bf0}.profile-card .preview-handle,.profile-card .preview-status{color:#536471}.profile-card .preview-bio a{color:#1d9bf0}.profile-card .preview-bio{white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0}.profile-card .preview-counts{display:flex;gap:16px;margin-top:12px;flex-wrap:wrap}.profile-card .preview-counts span{color:#536471}.profile-card .preview-status{font-size:13px;margin-top:10px}.profile-card .secondary{font-size:14px;line-height:20px;padding:5px 12px;white-space:nowrap}

:host([data-surface="messages"]){--myx-native-left:max(68px,calc((100vw - 1265px)/2 + 68px));--myx-native-width:calc(100vw - var(--myx-native-left))}:host([data-surface="messages"]) .right{display:none}:host([data-surface="messages"]) .left{padding-left:max(4px,calc(var(--myx-native-left) - 60px));align-items:flex-start}:host([data-surface="messages"]) .nav{width:52px;justify-content:center}:host([data-surface="messages"]) .nav-pill{padding:12px}:host([data-surface="messages"]) .nav-pill>span,:host([data-surface="messages"]) .identity,:host([data-surface="messages"]) .account-more{display:none}:host([data-surface="messages"]) .logo{font-size:20px;padding:12px 2px}:host([data-surface="messages"]) .left .primary{width:52px;font-size:0;padding:0}:host([data-surface="messages"]) .left .primary:after{content:'+';font-size:27px}:host([data-surface="messages"]) .account{width:52px;min-height:52px;padding:6px;justify-content:center}

.mix-control{padding:20px 0;border-bottom:1px solid var(--myx-line);margin-bottom:20px}.mix-control h3{font-size:20px;margin:0 0 16px}.mix-control label{font-weight:700}.mix-control output{display:block;margin:8px 0;color:#536471}.mix-control input[type="range"]{width:100%;height:32px;accent-color:#1d9bf0;cursor:pointer;touch-action:pan-y}.mix-endpoints{display:flex;justify-content:space-between;color:#536471;font-size:13px}#mix-pattern{display:flex;gap:4px;margin:20px 0 12px}#mix-pattern i{height:20px;flex:1;border-radius:3px}.following-slot{background:#0f1419}.discovery-slot{background:#1d9bf0}@media(prefers-color-scheme:dark){.following-slot{background:#e7e9ea}}

.video-block{margin:10px 0;border:1px solid var(--myx-line);border-radius:16px;overflow:hidden;background:#000}.video-block video{display:block;width:100%;max-height:650px;background:#000}.video-block .secondary{margin:8px;color:#fff;border-color:#536471;font-size:12px}.video-block img{width:100%;max-height:500px;object-fit:contain}.actions .account-gear{min-width:18.75px;color:#536471}.rate-card{position:fixed;width:300px;max-width:calc(100vw - 16px);padding:16px;background:Canvas;color:CanvasText;border:1px solid var(--myx-line);border-radius:16px;box-shadow:0 0 15px #65778633;z-index:10}.rate-card h3{margin:0 0 6px;font-size:17px}.rate-card label{display:flex;justify-content:space-between;margin-top:16px}.rate-card input{width:100%;accent-color:#1d9bf0;height:28px}.rate-card .secondary{margin-top:12px}.rate-card p{margin:8px 0}.account-rules{margin:20px 0}.account-rules button{display:block;margin:8px 0}.refresh-tools{display:flex;gap:6px;align-items:center}.refresh-tools #refresh-latest{padding:8px;font-size:19px;color:#1d9bf0}.sync-status{padding:8px 16px;font-size:12px;color:#536471;border-bottom:1px solid var(--myx-line)}#new-posts{width:100%;padding:12px;color:#1d9bf0;border-bottom:1px solid var(--myx-line)}
</style><div class="app"><div class="layout"><aside class="left"><div class="logo">My<span>X</span></div><button class="nav active" data-view="home"><span class="nav-pill"><svg data-icon="home" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M3 10 12 3l9 7v11h-6v-7H9v7H3z"/></svg><span>Home</span></span></button><button class="nav" data-native="messages"><span class="nav-pill"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/></svg><span>Messages</span></span></button><button class="nav" data-native="lists"><span class="nav-pill"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="19" rx="2"/><path d="M8 8h8M8 12h8M8 16h8M2 6h2M2 11h2M2 16h2"/></svg><span>Lists</span></span></button><button class="nav" data-view="sources"><span class="nav-pill"><svg data-icon="sources" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg><span>Feed sources</span></span></button><button class="nav" data-view="settings"><span class="nav-pill"><svg data-icon="settings" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3-.6 3-2 .9L3.8 6l-2 3.5 2.3 2-.1 2.2-2 2 2 3.4 2.7-.9 2 1 .6 2.8h4l.6-2.8 2-1 2.7.9 2-3.4-2-2-.1-2.2 2.3-2L18.8 6l-2.6.9-2-.9-.6-3z"/><circle cx="11.7" cy="12" r="3.2"/></svg><span>Feed settings</span></span></button><button class="nav" data-native="history"><span class="nav-pill"><svg data-icon="history" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>History</span></span></button><button class="nav" data-native="bookmarks"><span class="nav-pill"><svg data-icon="bookmarks" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v19l-7-4-7 4z"/></svg><span>Bookmarks</span></span></button><button class="primary" data-native="post">Post</button><button class="account" id="account" data-account="true" aria-label="Your account"></button></aside><main class="main"><header class="top"><div class="heading"><h1>Home</h1><div class="refresh-tools"><button class="secondary" id="refresh-latest" aria-label="Refresh latest posts" title="Refresh latest posts">↻</button><button class="secondary" id="native">Back to X</button></div></div><div class="tabs"><button class="active" data-tab="all">Following</button><button data-tab="reply">Replies</button><button data-tab="repost">Reposts</button></div></header><div class="coverage" id="coverage"></div><div class="mobiletools"><button class="secondary" data-view="sources">Sources</button><button class="secondary" data-view="settings">Settings</button><button class="secondary" data-native="post">Post</button></div><div class="status" id="status" role="status"></div><div class="sync-status" id="sync-status" role="status"></div><button id="new-posts" hidden>Show latest posts</button><div id="feed"></div></main><aside class="right"><form id="account-search" role="search"><input class="search" aria-label="Search X accounts" placeholder="Search X accounts" autocomplete="off" maxlength="500"><div id="account-results" hidden></div></form><div class="rule"></div><h3>Your feed</h3><div id="settings"></div></aside></div><div class="toast" hidden role="status"></div></div><div class="profile-card" id="profile-card" role="dialog" aria-label="Account preview" hidden></div>`;
  const surfaces = new Set([
    "feed",
    "history",
    "bookmarks",
    "thread",
    "profile",
    "search",
    "messages",
    "lists",
  ]);
  const views = new Set(["home", "sources", "settings"]);
  function state() {
    let saved = {};
    try {
      saved = JSON.parse(sessionStorage.getItem("myx-ui") || "{}");
    } catch {}
    const reader = history.state?.__myxReader;
    if (reader && views.has(reader.view) && Array.isArray(reader.rows))
      saved = { ...saved, ...reader.prefs, surface: "feed", view: reader.view };
    return {
      surface: surfaces.has(saved.surface) ? saved.surface : "feed",
      view: views.has(saved.view) ? saved.view : "home",
      replies: saved.replies !== false,
      reposts: saved.reposts !== false,
      discovery: saved.discovery !== false,
    };
  }
  function mount({ open = false, loading = false } = {}) {
    let host = document.getElementById("myx-root");
    if (host) return { host, root: host.shadowRoot };
    host = document.createElement("div");
    host.id = "myx-root";
    host.style.cssText =
      "position:fixed;inset:0;z-index:2147483590;display:" +
      (open ? "block" : "none");
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = template;
    root.querySelectorAll(".nav").forEach((b) => {
      const label = b.textContent.trim();
      b.setAttribute("aria-label", label);
      b.title = label;
    });
    document.documentElement.append(host);
    if (loading) {
      const ui = state();
      host.classList.add("booting");
      host.dataset.surface = ui.surface;
      host.classList.toggle("native-surface", ui.surface !== "feed");
      host.setAttribute("aria-busy", "true");
      document.documentElement.classList.add("myx-open");
      root.querySelector("#native").textContent =
        ui.surface === "feed" ? "Back to X" : "Back to feed";
      root.querySelector(".heading h1").textContent =
        ui.surface === "feed"
          ? {
              home: "Home",
              sources: "Feed sources",
              settings: "Feed settings",
            }[ui.view]
          : {
              history: "History",
              bookmarks: "Bookmarks",
              thread: "Conversation",
              profile: "Profile",
              search: "Account search",
              messages: "Messages",
              lists: "Lists",
            }[ui.surface];
      root.querySelector("#status").textContent = "Loading your account…";
      root.querySelector("#feed").innerHTML =
        '<div class="loading-feed" aria-hidden="true">' +
        '<div class="loading-row"><i></i><div><b></b><p></p><p></p></div></div>'.repeat(
          3,
        ) +
        "</div>";
      root.querySelector("#settings").innerHTML = [
        "replies",
        "reposts",
        "discovery",
      ]
        .map(
          (k) =>
            '<label class="setting">' +
            {
              replies: "Include replies",
              reposts: "Include reposts",
              discovery: "Include discovery",
            }[k] +
            '<input type="checkbox" disabled ' +
            (ui[k] ? "checked" : "") +
            "></label>",
        )
        .join("");
      root
        .querySelectorAll(".nav")
        .forEach((b) =>
          b.classList.toggle(
            "active",
            ui.surface === "feed"
              ? b.dataset.view === ui.view
              : b.dataset.native === ui.surface,
          ),
        );
      root.querySelectorAll("button,input").forEach((e) => {
        if (e.id !== "native") e.disabled = true;
      });
      root.querySelector("#native").onclick = () => {
        host.style.display = "none";
        sessionStorage.removeItem("myx-shell-open");
      };
    }
    return { host, root };
  }
  scope.MyXShell = { mount, state };
})(globalThis);
