(() => {
  try {
    if (!sessionStorage.getItem("myx-shell-open")) return;
    const node = document.createElement("div");
    node.id = "myx-boot";
    node.style.cssText =
      "position:fixed;inset:0;background:#fff;color:#0f1419;z-index:2147483589;display:grid;place-content:center;font:600 22px system-ui";
    node.textContent = "MyX · Loading your account…";
    document.documentElement.append(node);
    setTimeout(() => node.remove(), 15000);
  } catch {}
})();
