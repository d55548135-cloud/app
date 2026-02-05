import { el } from "./dom.js";
import { Icon } from "./icons.js";

export function Header({ phase, progress, donutActive = false }) {
  const wrap = el("div", "header");

  // top row (title + status chip)
  const topRow = el("div", "header__row");

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

  // ✅ Subscription chip (right top)
  const chip = SubscriptionChip({ active: !!donutActive });

  topRow.appendChild(top);
  topRow.appendChild(chip);

  const step = phase === "connecting" ? (Number(progress?.step) || 1) : 0;
  const percent = Number.isFinite(progress?.percent) ? progress.percent : 0;

  const steps = Stepper({ phase, step });
  const bar = ProgressBar({ phase, percent });

  wrap.appendChild(topRow);
  wrap.appendChild(steps);
  wrap.appendChild(bar);

  return wrap;
}

function SubscriptionChip({ active }) {
  const wrap = el("div", `subchip ${active ? "subchip--on" : "subchip--off"}`);

  const ico = el("span", "subchip__ico");
  ico.appendChild(Icon("donutBadge", "icon icon--sub"));

  const text = el("span", "subchip__text", {
    text: active ? "Подписка подключена" : "Подписка не подключена",
  });

  wrap.appendChild(ico);
  wrap.appendChild(text);

  return wrap;
}

export function Stepper({ phase, step }) {
  const labels = ["Доступ", "Чат-бот", "Связь", "Готово"];
  const wrap = el("div", "stepper");

  labels.forEach((label, i) => {
    const idx = i + 1;

    // ✅ active ровно когда step дошёл до idx
    const active = phase === "connecting" && step >= idx;
    const current = phase === "connecting" && step === idx;

    const item = el(
      "div",
      `stepper__item ${active ? "is-active" : ""} ${current ? "is-current" : ""}`
    );

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


/**
 * ✅ SearchBar with refresh icon button
 * returns: { wrap, input, refreshBtn }
 */
export function SearchBar({ value, refreshing = false }) {
  const wrap = el("div", "searchbar");

  const input = el("input", "searchbar__input", {
    type: "search",
    placeholder: "Поиск по сообществам…",
    value: value || "",
    "aria-label": "Поиск по сообществам",
  });

  const btn = el("button", `searchbar__refresh ${refreshing ? "is-spinning" : ""}`, {
    type: "button",
    "aria-label": "Обновить список",
  });

  // SVG refresh
  btn.appendChild(Icon("refresh", "icon icon--refresh"));

  if (refreshing) btn.disabled = true;

  wrap.appendChild(input);
  wrap.appendChild(btn);

  return { wrap, input, refreshBtn: btn };
}

export function GroupCard({ group, isConnected, isBusy, donutActive, enabled = true, onToggle }) {
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

  // ✅ мета-текст под названием
  let metaText = "Нажмите, чтобы подключить";
  if (isConnected) metaText = enabled ? "Чат-бот активен" : "Чат-бот выключен";
  else if (!donutActive) metaText = "Доступно с подпиской";

  const meta = el("div", "card__meta", { text: metaText });

  info.appendChild(name);
  info.appendChild(meta);

  left.appendChild(img);
  left.appendChild(info);

  const right = el("div", "card__right");

  // ✅ 1) Если подключено — показываем toggle-кнопку
  if (isConnected) {
    const toggleBtn = el(
      "button",
      `card__toggle ${enabled ? "is-on" : "is-off"}`,
      {
        type: "button",
        "aria-label": enabled ? "Выключить чат-бота" : "Включить чат-бота",
        title: enabled ? "Выключить" : "Включить",
      }
    );

    toggleBtn.appendChild(Icon(enabled ? "toggleOn" : "toggleOff", "icon icon--toggle"));

    // ВАЖНО: не даём клику всплыть в card
    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isBusy) return;
      onToggle?.(group.id);
    });

    right.appendChild(toggleBtn);
  }

  // ✅ 2) Справа бейдж остаётся как “доп. статус/действие”
  const badge = el(
    "div",
    `badge ${
      isConnected ? "badge--ok" : (!donutActive ? "badge--lock" : "badge--go")
    }`
  );

  const icon =
    isConnected
      ? Icon("check", "icon icon--badge")
      : (!donutActive ? Icon("lock", "icon icon--badge icon--lock") : Icon("chevronRight", "icon icon--badge"));

  badge.appendChild(icon);
  right.appendChild(badge);

  card.appendChild(left);
  card.appendChild(right);

  // ✅ пометка для shake-анимации
  if (!isConnected && !donutActive) {
    card.dataset.locked = "1";
  } else {
    card.dataset.locked = "0";
  }

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
