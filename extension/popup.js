document.querySelector("#open").addEventListener("click", async () => {
  await chrome.tabs.create({ url: "https://x.com/home#myx" });
  window.close();
});
