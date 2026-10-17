document.body.dataset.controller = "starting";
try {
  await import("./website.js");
  document.body.dataset.controller = "ready";
} catch (error) {
  document.body.dataset.controller = "failed";
  const box = document.getElementById("site-error");
  box.hidden = false;
  box.textContent =
    "The main interface could not load. Reload, or use the independent scientific tools below. ";
  for (const [text, href] of [
    ["Open observations", "./explore.html"],
    ["Open comparison", "./compare.html"],
  ]) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    box.append(a);
  }
  console.error("SKYSHIFT website startup:", error);
}
