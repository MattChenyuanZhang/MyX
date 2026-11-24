(() => {
  try {
    if (location.hash !== "#myx" && !sessionStorage.getItem("myx-shell-open")) return;
    globalThis.MyXShell.mount({ open: true, loading: true });
  } catch {}
})();
