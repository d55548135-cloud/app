import { el } from "./dom.js";

const ICONS = {
  bot: `
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M10 3h4m-2 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M7 10a5 5 0 0 1 10 0v5a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4v-5Z"
            stroke="currentColor" stroke-width="2" />
      <path d="M9.2 13.2h.01M14.8 13.2h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M6 12H4m16 0h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,
  warning: `
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path d="M12 3 22 21H2L12 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M12 9v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 17.5h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `,
  chevronRight: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M10 6l6 6-6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  check: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M6 12.5l4 4L18 8.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  circleCheck: `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
            stroke="currentColor" stroke-width="2"/>
      <path d="M7.5 12.2l3 3L16.8 9.2"
            stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  info: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="2"/>
      <path d="M12 10.5v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 7.5h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `,
};

export function Icon(name, className = "icon") {
  const wrap = el("span", className);
  wrap.innerHTML = ICONS[name] || "";
  return wrap;
}
