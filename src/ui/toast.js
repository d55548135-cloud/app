import { el } from "./dom.js";

export function mountToast(root, opts = {}) {
  const host = el("div", "toast-host");
  root.appendChild(host);

  const {
    muteMs = 900,         // 🔇 первые 0.9s после запуска не показываем тосты
    dedupeMs = 1500,      // 🚫 не повторяем одинаковое за короткое время
    replace = true,       // ♻️ если новый тост — убираем предыдущий
  } = opts;

  const bootAt = performance.now();
  let lastKey = "";
  let lastAt = 0;
  let currentItem = null;
  let removeTimer = null;

  function killCurrent() {
    if (!currentItem) return;
    currentItem.classList.remove("is-in");
    currentItem.classList.add("is-out");
    const node = currentItem;
    currentItem = null;

    if (removeTimer) clearTimeout(removeTimer);
    removeTimer = setTimeout(() => node.remove(), 220);
  }

  window.__hubbot_toast = (text, type = "info", toastOpts = {}) => {
    const now = performance.now();

    // 🔇 mute on boot (чтобы не всплывало при refresh/init)
    if (now - bootAt < muteMs && !toastOpts.force) return;

    // 🚫 dedupe одинаковых сообщений
    const key = `${type}|${text}`;
    if (key === lastKey && now - lastAt < dedupeMs && !toastOpts.force) return;
    lastKey = key;
    lastAt = now;

    // ♻️ replace предыдущего
    if (replace) killCurrent();

    const item = el("div", `toast toast--${type}`);
    item.appendChild(el("div", "toast__text", { text }));
    host.appendChild(item);
    currentItem = item;

    requestAnimationFrame(() => item.classList.add("is-in"));

    const life = type === "error" ? 3200 : 2200;
    setTimeout(() => {
      if (item !== currentItem) {
        // если уже заменили другим — не трогаем
        item.remove();
        return;
      }
      killCurrent();
    }, life);
  };
}
