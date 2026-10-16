// Same-origin presentation bridge. No science values or source URLs cross this boundary.
if (window.parent !== window) {
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || event.source !== window.parent)
      return;
    if (
      event.data?.type === "skyshift:workspace-visibility" &&
      event.data.visible === false
    )
      document.dispatchEvent(new Event("skyshift:workspace-hidden"));
  });
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || link.target === "_blank") return;
    const url = new URL(link.href, location.href);
    if (
      url.origin === location.origin &&
      /\/(index\.html)?$/.test(url.pathname)
    ) {
      event.preventDefault();
      window.parent.postMessage(
        { type: "skyshift:return-to-space" },
        location.origin,
      );
    }
  });
}
