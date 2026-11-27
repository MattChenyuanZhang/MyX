import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const code = fs.readFileSync(
  new URL("../extension/boot.js", import.meta.url),
  "utf8",
);
function boot(hash, open, storageThrows = false) {
  const mounts = [];
  vm.runInNewContext(code, {
    location: { hash },
    sessionStorage: {
      getItem() {
        if (storageThrows) throw Error("unavailable");
        return open;
      },
    },
    MyXShell: {
      mount(options) {
        mounts.push(options);
      },
    },
  });
  return mounts;
}
test("first MyX visit mounts the reader shell before account or DOM readiness", () => {
  assert.equal(boot("#myx", null).length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(boot("#myx", null)[0])), {
    open: true,
    loading: true,
  });
});
test("refresh and native route navigation reuse the loading shell only when MyX was open", () => {
  assert.equal(boot("", "1").length, 1);
  assert.equal(boot("", null).length, 0);
  assert.equal(boot("", null, true).length, 0);
  assert.equal(boot("#myx", null, true).length, 1);
});

// Regression: the pre-hydration shell must agree with the reader history entry.
test("browser Back starts with the MyX feed shell even when the last saved surface was a conversation", () => {
  const context = vm.createContext({
    history: {
      state: {
        __myxReader: {
          account: "alice",
          view: "home",
          rows: [],
          prefs: { replies: false },
        },
      },
    },
    sessionStorage: {
      getItem: () => JSON.stringify({ surface: "thread", view: "sources" }),
    },
  });
  vm.runInContext(fs.readFileSync("extension/shell.js", "utf8"), context);
  const ui = context.MyXShell.state();
  assert.equal(ui.surface, "feed");
  assert.equal(ui.view, "home");
  assert.equal(ui.replies, false);
  context.history.state = {};
  assert.equal(context.MyXShell.state().surface, "thread");
});
