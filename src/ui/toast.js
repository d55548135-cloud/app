import { el } from "./dom.js";

export function mountToast(root) {
  const host = el("div", "toast-host");
  root.appendChild(host);

  window.__hubbot_toast = (text, type = "info") => {
    const item = el("div", `toast toast--${type}`);
    item.appendChild(el("div", "toast__text", { text }));

    host.appendChild(item);

    requestAnimationFrame(() => item.classList.add("is-in"));

    const life = type === "error" ? 3200 : 2200;
    setTimeout(() => {
      item.classList.remove("is-in");
      item.classList.add("is-out");
      setTimeout(() => item.remove(), 220);
    }, life);
  };
}
