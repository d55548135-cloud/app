import { el } from "./dom.js";
import { Icon } from "./icons.js";

export function Header({ phase, progress }) {
  const wrap = el("div", "header");

  const top = el("div", "header__top");
  const title = el("div", "header__title", {
    text: phase === "connecting" ? "Подключение" : "Выбор сообщества",
  });

  const subtitleText =
    phase === "connecting"
      ? (progress?.label || "Подготавливаю…")
      : "Подключим HubBot за ~15 секунд — всё настроим автоматически";

  const subtitle = el("div", "header__subtitle", { text: subtitleText });

  top.appendChild(title);
  top.appendChild(subtitle);

  const step = Number.isFinite(progress?.step) ? progress.step : 0;
  const percent = Number.isFinite(progress?.percent) ? progress.percent : 0;

  const steps = Stepper({ phase, step });
  const bar = ProgressBar({ phase, percent });

  wrap.appendChild(top);
  wrap.appendChild(steps);
  wrap.appendChild(bar);

  return wrap;
}

export function Stepper({ phase, step }) {
  // Человеческие названия шагов
  const labels = ["Доступ", "Чат-бот", "Связь", "Готово"];

  const wrap = el("div", "stepper");

  labels.forEach((label, i) => {
    const idx = i + 1;
    const active = phase === "connecting" && step >= idx;

    const item = el("div", `stepper__item ${active ? "is-active" : ""}`);
    const dot = el("div", "stepper__dot");
    const text = el("div", "stepper__text", { text: label });

    item.appendChild(dot);
    item.appendChild(text);
    wrap.appendChild(item);
  });

  return wrap;
}

export function ProgressBar({ phase, percent }) {
  const wrap = el("div", "progress");
  const bar = el("div", "progress__bar");
  const fill = el("div", "progress__fill");

  const safePercent = Number.isFinite(percent) ? percent : 0;
  fill.style.width = `${safePercent}%`;

  bar.appendChild(fill);

  const text = el("div", "progress__text", {
    text: phase === "connecting" ? `Подключение… ${safePercent}%` : " ",
  });

  wrap.appendChild(bar);
  wrap.appendChild(text);

  return wrap;
}

export function SearchBar({ value }) {
  const wrap = el("div", "search");
  const input = el("input", "search__input", {
    type: "search",
    placeholder: "Поиск по сообществам…",
    value: value || "",
    "aria-label": "Поиск по сообществам",
  });
  wrap.appendChild(input);
  return { wrap, input };
}

export function GroupCard({ group, isConnected, isBusy }) {
  const card = el("button", `card ${isConnected ? "card--connected" : ""}`, {
    type: "button",
  });
  card.disabled = !!isBusy;

  const left = el("div", "card__left");
  const img = el("img", "card__avatar", {
    src: group.photo || "",
    alt: "",
    loading: "lazy",
  });

  const info = el("div", "card__info");
  const name = el("div", "card__name", { text: group.name });
  const meta = el("div", "card__meta", {
    text: isConnected ? "Подключено" : "Нажмите, чтобы подключить",
  });

  info.appendChild(name);
  info.appendChild(meta);

  left.appendChild(img);
  left.appendChild(info);

  const right = el("div", "card__right");

  // SVG бейджи вместо символов ✓ / ›
  const badge = el("div", `badge ${isConnected ? "badge--ok" : "badge--go"}`);
  const icon = isConnected
    ? Icon("check", "icon icon--badge")
    : Icon("chevronRight", "icon icon--badge");
  badge.appendChild(icon);

  right.appendChild(badge);

  card.appendChild(left);
  card.appendChild(right);

  return card;
}

export function SkeletonList({ count = 6 }) {
  const wrap = el("div", "list");
  for (let i = 0; i < count; i++) {
    const sk = el("div", "skeleton-card");
    sk.appendChild(el("div", "skeleton-card__avatar"));
    const lines = el("div", "skeleton-card__lines");
    lines.appendChild(el("div", "skeleton-line skeleton-line--lg"));
    lines.appendChild(el("div", "skeleton-line skeleton-line--sm"));
    sk.appendChild(lines);
    wrap.appendChild(sk);
  }
  return wrap;
}

export function EmptyState({ title, text }) {
  const wrap = el("div", "empty");
  const ico = el("div", "empty__icon");
  ico.appendChild(Icon("bot", "icon icon--bot"));
  wrap.appendChild(ico);

  wrap.appendChild(el("div", "empty__title", { text: title }));
  wrap.appendChild(el("div", "empty__text", { text }));
  return wrap;
}

export function ErrorState({ title, text }) {
  const wrap = el("div", "empty empty--error");
  const ico = el("div", "empty__icon");
  ico.appendChild(Icon("warning", "icon icon--warning"));
  wrap.appendChild(ico);

  wrap.appendChild(el("div", "empty__title", { text: title }));
  wrap.appendChild(el("div", "empty__text", { text }));
  return wrap;
}

export function PrimaryButton({ label }) {
  return el("button", "btn btn--primary", { type: "button", text: label });
}

export function SecondaryButton({ label }) {
  return el("button", "btn btn--secondary", { type: "button", text: label });
}
