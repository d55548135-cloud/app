import { el } from "./dom.js";
import { Icon } from "./icons.js";

export function Header({ phase, progress, donutActive = false }) {
  const wrap = el("div", "header");

  const topRow = el("div", "header__row");

  const top = el("div", "header__top");
  const title = el("div", "header__title", {
    text:
      phase === "connecting"
        ? "Подключение"
        : phase === "intro"
          ? ""
          : "Выбор сообщества",
  });

  const subtitleText =
    phase === "connecting"
      ? (progress?.label || "Подготавливаю…")
      : "Подключим HubBot за ~15 секунд — всё настроим автоматически";

  const subtitle = el("div", "header__subtitle", { text: subtitleText });

  top.appendChild(title);
  top.appendChild(subtitle);

  const chip = SubscriptionChip({
    active: phase === "ready" ? !!donutActive : null,
  });

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
  const unknown = active === null;
  const wrap = el(
    "div",
    `subchip ${
      unknown ? "subchip--pending" : active ? "subchip--on" : "subchip--off"
    }`
  );

  const ico = el("span", "subchip__ico");
  ico.appendChild(Icon("donutBadge", "icon icon--sub"));

  const text = el("span", "subchip__text", {
    text: unknown
      ? "Подписка проверяется"
      : active
        ? "Подписка подключена"
        : "Подписка не подключена",
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

  btn.appendChild(Icon("refresh", "icon icon--refresh"));

  if (refreshing) btn.disabled = true;

  wrap.appendChild(input);
  wrap.appendChild(btn);

  return { wrap, input, refreshBtn: btn };
}

export function GroupCard({ group, isConnected, isBusy, donutActive }) {
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

  let metaText = "Нажмите, чтобы подключить";
  if (isConnected) metaText = "Подключено";
  else if (!donutActive) metaText = "Доступно с подпиской";

  const meta = el("div", "card__meta", { text: metaText });

  info.appendChild(name);
  info.appendChild(meta);

  left.appendChild(img);
  left.appendChild(info);

  const right = el("div", "card__right");

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

  card.dataset.locked = !isConnected && !donutActive ? "1" : "0";

  return card;
}

export function IntroState({ hasSavedConnections = false }) {
  const wrap = el("div", "intro");

  const shell = el("div", "intro__shell");

  const visual = el("div", "intro__visual");
  visual.appendChild(buildIntroIllustration());

  const content = el("div", "intro__content");

  const title = el("div", "intro__title", {
    text: "Подключите HubBot к вашему сообществу",
  });

  const text = el("div", "intro__text", {
    text:
      "HubBot автоматически настроит сообщения сообщества, возможности ботов и стабильную связь. " +
      "Сначала покажем, что будет происходить, а доступы запросим только на следующем шаге.",
  });

  const points = el("div", "intro__points");
  points.appendChild(pointRow("Покажем ваши сообщества, которыми вы управляете"));
  points.appendChild(pointRow("После выбора сообщества отдельно попросим доступ VK"));
  points.appendChild(pointRow("Настройка займёт около 15 секунд"));

  content.appendChild(title);
  content.appendChild(text);
  content.appendChild(points);

  if (hasSavedConnections) {
    const saved = el("div", "intro__saved", {
      text: "Ранее подключённые сообщества уже сохранены и подтянутся после продолжения.",
    });
    content.appendChild(saved);
  }

  shell.appendChild(visual);
  shell.appendChild(content);
  wrap.appendChild(shell);

  return wrap;
}

function buildIntroIllustration() {
  const card = el("div", "intro__scene");
  card.innerHTML = `
    <svg viewBox="0 0 720 360" class="intro__svg" aria-hidden="true">
      <defs>
        <linearGradient id="hbBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f3f5ff"/>
          <stop offset="100%" stop-color="#eceffd"/>
        </linearGradient>
        <linearGradient id="hbGlow" x1="0" x2="1">
          <stop offset="0%" stop-color="#7c5cff"/>
          <stop offset="100%" stop-color="#4f8cff"/>
        </linearGradient>
        <filter id="hbShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#6f6ce8" flood-opacity="0.10"/>
        </filter>
      </defs>

      <rect x="16" y="16" width="688" height="328" rx="36" fill="url(#hbBg)" />
      <circle cx="618" cy="84" r="48" fill="#e9e3ff"/>
      <circle cx="580" cy="258" r="62" fill="#e7efff"/>
      <circle cx="130" cy="88" r="34" fill="#edf1ff"/>

      <g filter="url(#hbShadow)">
        <rect x="64" y="90" width="208" height="184" rx="30" fill="#ffffff"/>
        <rect x="88" y="118" width="58" height="58" rx="18" fill="#e8eefb"/>
        <rect x="160" y="124" width="80" height="14" rx="7" fill="#ccd5f2"/>
        <rect x="160" y="148" width="58" height="12" rx="6" fill="#d8def3"/>
        <rect x="88" y="198" width="122" height="14" rx="7" fill="#d3daf0"/>
        <rect x="88" y="222" width="98" height="14" rx="7" fill="#d9dff1"/>
        <rect x="88" y="246" width="116" height="16" rx="8" fill="#d8cdfc"/>
      </g>

      <g transform="translate(312 64)" filter="url(#hbShadow)">
        <rect x="0" y="28" width="132" height="176" rx="34" fill="#18192b"/>
        <rect x="20" y="50" width="92" height="70" rx="22" fill="#f5f7ff"/>
        <circle cx="42" cy="82" r="6" fill="#1a1b2f"/>
        <circle cx="88" cy="82" r="6" fill="#1a1b2f"/>
        <rect x="44" y="100" width="38" height="8" rx="4" fill="#8e97ff"/>
        <rect x="34" y="0" width="12" height="34" rx="6" fill="#18192b"/>
        <rect x="86" y="0" width="12" height="34" rx="6" fill="#18192b"/>
        <rect x="18" y="132" width="96" height="18" rx="9" fill="#232845"/>
        <path d="M67 138l-10 10h8l-3 11 13-13h-8l2-8z" fill="#8b63ff"/>
      </g>

      <g filter="url(#hbShadow)">
        <rect x="506" y="102" width="126" height="132" rx="28" fill="#ffffff"/>
        <rect x="530" y="126" width="46" height="46" rx="16" fill="#e8eefb"/>
        <rect x="588" y="132" width="36" height="11" rx="5.5" fill="#ccd5f2"/>
        <rect x="588" y="150" width="48" height="11" rx="5.5" fill="#d8def3"/>
        <rect x="530" y="194" width="90" height="14" rx="7" fill="#d3daf0"/>
        <path d="M610 208l14 14 22-30" fill="none" stroke="#5b7bff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      </g>

      <path d="M276 180h28" stroke="#8e97ff" stroke-width="6" stroke-linecap="round"/>
      <path d="M444 180h28" stroke="#8e97ff" stroke-width="6" stroke-linecap="round"/>

      <g opacity="0.9">
        <circle cx="360" cy="292" r="9" fill="#8b63ff"/>
        <circle cx="392" cy="292" r="9" fill="#6290ff"/>
        <circle cx="424" cy="292" r="9" fill="#8b63ff"/>
      </g>
    </svg>
  `;
  return card;
}

function pointRow(text) {
  const row = el("div", "intro__point");
  row.appendChild(checkMini());
  row.appendChild(el("div", "intro__pointText", { text }));
  return row;
}

function checkMini() {
  const wrap = el("span", "intro__mini");
  wrap.innerHTML = `
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#e8f7ef"></circle>
      <path d="M6 10.3l2.4 2.5L14.3 7" fill="none" stroke="#24a466" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `;
  return wrap;
}

export function PermissionDeniedState({ title, text }) {
  const wrap = el("div", "empty empty--error");
  const ico = el("div", "empty__icon");
  ico.appendChild(Icon("warning", "icon icon--warning"));
  wrap.appendChild(ico);

  wrap.appendChild(el("div", "empty__title", { text: title }));
  wrap.appendChild(el("div", "empty__text", { text }));
  return wrap;
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
