// Keep the independent scientific link usable even if an ES-module dependency
// fails. Import rejection must not strand visitors in an inert 3D shell.
const status = document.getElementById("space-status");
const fallback = document.getElementById("render-fallback");
document.body.dataset.controller = "starting";
const controls = [...document.querySelectorAll("button")].map((button) => [
  button,
  button.disabled,
]);
for (const [button] of controls) button.disabled = true;
const warning = setTimeout(() => {
  status.textContent =
    "3D startup is taking longer than expected. Classic View remains available above.";
}, 10000);
try {
  await import("./immersive.js");
  for (const [button, originallyDisabled] of controls)
    if (!originallyDisabled) button.disabled = false;
  document.body.dataset.controller = "ready";
} catch (error) {
  document.body.dataset.controller = "failed";
  status.textContent =
    "The exploration controls could not load. Reload or open the standalone scientific tool.";
  document.getElementById("render-error").textContent = error.message;
  fallback.hidden = false;
  document.getElementById("retry-renderer").hidden = true;
  document.getElementById("fallback-classic").hidden = true;
  console.error("SKYSHIFT startup:", error);
} finally {
  clearTimeout(warning);
}
