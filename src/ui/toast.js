import { el } from "./dom.js";

export function mountToast(root) {
  const host = el("div", "toast-host");
  root.appendChild(host);

  let current = null;
  let hideTimer = null;
  let removeTimer = null;

  function clearTimers() {
    if (hideTimer) clearTimeout(hideTimer);
    if (removeTimer) clearTimeout(removeTimer);
    hideTimer = null;
    removeTimer = null;
  }

  function removeCurrent(immediate = false) {
    if (!current) return;

    clearTimers();

    const node = current;
    current = null;

    if (immediate) {
      node.remove();
      return;
    }

    node.classList.remove("is-in");
    node.classList.add("is-out");
    removeTimer = setTimeout(() => node.remove(), 220);
  }

  window.__hubbot_toast = (text, type = "info") => {
    // хочешь оставить только error/success — фильтруй тут
    // const allowed = new Set(["error", "success"]);
    // if (!allowed.has(type)) return;

    // ✅ если тост уже висит — заменяем его красиво
    if (current) removeCurrent(false);

    const item = el("div", `toast toast--${type}`);
    item.appendChild(el("div", "toast__text", { text }));

    host.appendChild(item);
    current = item;

    requestAnimationFrame(() => item.classList.add("is-in"));

    const life = type === "error" ? 3200 : 2200;

    hideTimer = setTimeout(() => {
      if (current !== item) return; // на случай, если уже заменили
      item.classList.remove("is-in");
      item.classList.add("is-out");
      removeTimer = setTimeout(() => {
        if (current === item) current = null;
        item.remove();
      }, 220);
    }, life);
  };

  // На всякий: если вдруг нужно “снести” тост вручную
  window.__hubbot_toast_clear = () => removeCurrent(true);
}
