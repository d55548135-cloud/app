import { el, clear } from "./dom.js";

export function mountModal(root) {
  const overlay = el("div", "modal-overlay", {
    role: "dialog",
    "aria-modal": "true",
  });

  const sheet = el("div", "modal-sheet");

  const head = el("div", "modal-head");
  const titleEl = el("div", "modal-title");
  const subtitleEl = el("div", "modal-subtitle");
  head.appendChild(titleEl);
  head.appendChild(subtitleEl);

  const body = el("div", "modal-body");
  const footer = el("div", "modal-footer");

  const closeBtn = el("button", "modal-close", {
    type: "button",
    "aria-label": "Закрыть",
  });

  closeBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M6 6l12 12M18 6l-12 12"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"/>
    </svg>
  `;

  sheet.appendChild(head);
  sheet.appendChild(body);
  sheet.appendChild(footer);
  sheet.appendChild(closeBtn);

  overlay.appendChild(sheet);
  overlay.style.display = "none";
  root.appendChild(overlay);

  const close = () => {
    overlay.classList.remove("is-open");
    setTimeout(() => {
      overlay.style.display = "none";
      sheet.classList.remove("modal-sheet--success");
      sheet.classList.remove("is-body-empty");
      clear(body);
      clear(footer);
      footer.classList.add("is-empty");
    }, 170);
  };

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  function renderActions(actions = []) {
    clear(footer);

    if (!actions.length) {
      footer.classList.add("is-empty");
      return;
    }

    footer.classList.remove("is-empty");

    actions.forEach((a) => {
      const btn = el("button", `btn modal-btn modal-btn--${a.type || "secondary"}`, {
        type: "button",
        text: a.label,
      });

      btn.addEventListener("click", () => {
        close();
        a.onClick?.();
      });

      footer.appendChild(btn);
    });
  }

  function open({ variant = "base", title, subtitle, contentNode, actions = [] }) {
    titleEl.textContent = title || "";
    subtitleEl.textContent = subtitle || "";

    clear(body);

    if (variant === "success") sheet.classList.add("modal-sheet--success");
    else sheet.classList.remove("modal-sheet--success");

    // ✅ если контента нет — прячем body полностью
    if (contentNode) {
      body.appendChild(contentNode);
      sheet.classList.remove("is-body-empty");
    } else {
      sheet.classList.add("is-body-empty");
    }

    renderActions(actions);

    overlay.style.display = "block";
    requestAnimationFrame(() => overlay.classList.add("is-open"));
  }

  window.__hubbot_modal_open = (opts) => open({ ...opts, variant: "base" });
  window.__hubbot_modal_success = (opts) => open({ ...opts, variant: "success" });
}
