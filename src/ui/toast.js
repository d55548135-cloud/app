import { el } from "./dom.js";

export function mountToast(root) {
  const host = el("div", "toast-host");
  root.appendChild(host);

  let current = null;
  let state = "idle"; // idle | showing | hiding
  let hideTimer = null;
  let removeTimer = null;

  // храним только ПОСЛЕДНЕЕ сообщение (анти-спам)
  let pending = null;

  function clearTimers() {
    if (hideTimer) clearTimeout(hideTimer);
    if (removeTimer) clearTimeout(removeTimer);
    hideTimer = null;
    removeTimer = null;
  }

  function showNow(text, type) {
    clearTimers();

    const item = el("div", `toast toast--${type}`);
    item.appendChild(el("div", "toast__text", { text }));

    host.appendChild(item);
    current = item;
    state = "showing";

    requestAnimationFrame(() => item.classList.add("is-in"));

    const life = type === "error" ? 3200 : 2200;

    hideTimer = setTimeout(() => beginHide(item), life);
  }

  function beginHide(item) {
    if (!item || item !== current) return;

    state = "hiding";
    item.classList.remove("is-in");
    item.classList.add("is-out");

    removeTimer = setTimeout(() => {
      if (current === item) current = null;
      item.remove();
      state = "idle";

      // ✅ только теперь показываем следующее (если было)
      if (pending) {
        const next = pending;
        pending = null;
        showNow(next.text, next.type);
      }
    }, 220);
  }

  window.__hubbot_toast = (text, type = "info") => {
    // Если хочешь вообще вырубить "Уже актуально" — просто не вызывай toast в syncConnections.
    // Но если вызываешь — этот код не даст спамить и "уезжать вбок".

    // ✅ если что-то показывается/скрывается — НЕ показываем новое,
    // а запоминаем последнее и дождёмся полного исчезновения
    if (state !== "idle") {
      pending = { text, type };
      return;
    }

    // ✅ если idle — показываем сразу
    showNow(text, type);
  };

  window.__hubbot_toast_clear = () => {
    pending = null;
    if (!current) {
      state = "idle";
      clearTimers();
      return;
    }
    clearTimers();
    beginHide(current);
  };
}
