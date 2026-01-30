import { el, clear } from "./dom.js";

export function mountModal(root) {
  const overlay = el("div", "modal-overlay", { role: "dialog", "aria-modal": "true" });
  const sheet = el("div", "modal-sheet");

  const head = el("div", "modal-head");
  const title = el("div", "modal-title");
  const subtitle = el("div", "modal-subtitle");
  head.appendChild(title);
  head.appendChild(subtitle);

  const body = el("div", "modal-body");
  const closeBtn = el("button", "modal-close", { type: "button", text: "Закрыть" });

  sheet.appendChild(head);
  sheet.appendChild(body);
  sheet.appendChild(closeBtn);

  overlay.appendChild(sheet);
  overlay.style.display = "none";
  root.appendChild(overlay);

  const close = () => {
    overlay.classList.remove("is-open");
    setTimeout(() => {
      overlay.style.display = "none";
      clear(body);
    }, 160);
  };

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  window.__hubbot_modal_open = ({ title: t, subtitle: s, actions = [] }) => {
    title.textContent = t || "";
    subtitle.textContent = s || "";
    clear(body);

    actions.forEach((a) => {
      const btn = el("button", `btn modal-btn modal-btn--${a.type || "secondary"}`, {
        type: "button",
        text: a.label,
      });
      btn.addEventListener("click", () => {
        close();
        a.onClick?.();
      });
      body.appendChild(btn);
    });

    overlay.style.display = "block";
    requestAnimationFrame(() => overlay.classList.add("is-open"));
  };
}
