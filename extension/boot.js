(() => {
  try {
    if (location.hash === "#myx-profile-lookup") return;
    if (location.hash !== "#myx" && !sessionStorage.getItem("myx-shell-open"))
      return;
    globalThis.MyXShell.mount({ open: true, loading: true });
  } catch {}
})();
