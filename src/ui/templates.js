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
          ? "HubBot Control"
          : "Выбор сообщества",
  });

  const subtitleText =
    phase === "connecting"
      ? (progress?.label || "Подготавливаю…")
      : phase === "intro"
        ? "Сначала покажем, что умеет сервис и зачем дальше понадобится доступ VK"
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
      ? "Подписка проверится после продолжения"
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

export function IntroState({ hasSavedConnections = false, howItWorksUrl = "" }) {
  const wrap = el("div", "intro");

  const hero = el("div", "intro__hero");
  hero.appendChild(buildIntroIllustration());

  const title = el("div", "intro__title", {
    text: "Подключите HubBot к вашему сообществу",
  });

  const text = el("div", "intro__text", {
    text:
      "HubBot автоматически включает сообщения сообщества, возможности ботов и стабильную связь для новых сообщений. Доступы запрашиваются только после продолжения и только когда они действительно нужны.",
  });

  hero.appendChild(title);
  hero.appendChild(text);

  const chips = el("div", "intro__chips");
  chips.appendChild(infoChip("Права не запрашиваются при открытии"));
  chips.appendChild(infoChip("Проверим VK Donut после продолжения"));
  chips.appendChild(infoChip("Подключение занимает около 15 секунд"));
  hero.appendChild(chips);

  const card = el("div", "intro__card");
  card.appendChild(featureRow("Покажем ваши сообщества, которыми вы управляете"));
  card.appendChild(featureRow("Проверим, доступно ли подключение по подписке"));
  card.appendChild(featureRow("После выбора сообщества отдельно попросим доступ VK"));

  if (hasSavedConnections) {
    const saved = el("div", "intro__saved", {
      text: "Ранее подключённые сообщества уже сохранены и подтянутся после продолжения.",
    });
    card.appendChild(saved);
  }

  const note = el("div", "intro__note");
  note.appendChild(shieldMini());
  note.appendChild(
    el("div", "intro__noteText", {
      text:
        "Сначала вы видите описание сервиса, а запрос доступа появляется только на следующем шаге — это безопасный и прозрачный сценарий подключения.",
    })
  );

  wrap.appendChild(hero);
  wrap.appendChild(card);
  wrap.appendChild(note);

  if (howItWorksUrl) {
    const link = el("a", "intro__link", {
      href: howItWorksUrl,
      target: "_blank",
      rel: "noopener noreferrer",
      text: "Подробнее о том, как это работает",
    });
    wrap.appendChild(link);
  }

  return wrap;
}

function buildIntroIllustration() {
  const card = el("div", "intro__scene");
  card.innerHTML = `
    <svg viewBox="0 0 720 360" class="intro__svg" aria-hidden="true">
      <defs>
        <linearGradient id="hbBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f6f7ff"/>
          <stop offset="100%" stop-color="#eef1ff"/>
        </linearGradient>
        <linearGradient id="hbGlow" x1="0" x2="1">
          <stop offset="0%" stop-color="#7c5cff"/>
          <stop offset="100%" stop-color="#4f8cff"/>
        </linearGradient>
        <filter id="hbShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#6f6ce8" flood-opacity="0.16"/>
        </filter>
      </defs>

      <rect x="16" y="16" width="688" height="328" rx="32" fill="url(#hbBg)" />
      <circle cx="618" cy="84" r="48" fill="#ebe7ff"/>
      <circle cx="580" cy="260" r="64" fill="#e5efff"/>
      <circle cx="128" cy="84" r="36" fill="#eef3ff"/>

      <g filter="url(#hbShadow)">
        <rect x="60" y="82" width="220" height="200" rx="28" fill="#ffffff"/>
        <rect x="86" y="112" width="64" height="64" rx="20" fill="#edf3ff"/>
        <rect x="164" y="118" width="86" height="16" rx="8" fill="#dde6ff"/>
        <rect x="164" y="144" width="64" height="12" rx="6" fill="#e8edff"/>
        <rect x="86" y="196" width="138" height="14" rx="7" fill="#e7ebfb"/>
        <rect x="86" y="220" width="112" height="14" rx="7" fill="#eef1fb"/>
        <rect x="86" y="250" width="132" height="18" rx="9" fill="url(#hbGlow)" opacity="0.18"/>
      </g>

      <g transform="translate(315 64)" filter="url(#hbShadow)">
        <rect x="0" y="28" width="128" height="172" rx="32" fill="#141722"/>
        <rect x="20" y="48" width="88" height="68" rx="20" fill="#f4f6ff"/>
        <circle cx="42" cy="77" r="6" fill="#141722"/>
        <circle cx="86" cy="77" r="6" fill="#141722"/>
        <rect x="44" y="96" width="40" height="8" rx="4" fill="#8f9cff"/>
        <rect x="34" y="0" width="12" height="34" rx="6" fill="#141722"/>
        <rect x="82" y="0" width="12" height="34" rx="6" fill="#141722"/>
        <rect x="18" y="130" width="92" height="18" rx="9" fill="#22273a"/>
        <path d="M66 138l-11 10h9l-4 12 14-14h-9l3-8z" fill="#8b5cff"/>
      </g>

      <g filter="url(#hbShadow)">
        <rect x="486" y="94" width="170" height="152" rx="28" fill="#ffffff"/>
        <rect x="516" y="122" width="54" height="54" rx="18" fill="#edf3ff"/>
        <rect x="582" y="126" width="42" height="12" rx="6" fill="#dfe7ff"/>
        <rect x="582" y="146" width="56" height="12" rx="6" fill="#e9eeff"/>
        <rect x="516" y="192" width="110" height="16" rx="8" fill="#e7ebfb"/>
        <path d="M624 214l14 14 20-28" fill="none" stroke="url(#hbGlow)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      </g>

      <path d="M286 180h24" stroke="#98a7ff" stroke-width="6" stroke-linecap="round"/>
      <path d="M444 180h24" stroke="#98a7ff" stroke-width="6" stroke-linecap="round"/>

      <g opacity="0.88">
        <circle cx="360" cy="292" r="9" fill="#8b5cff"/>
        <circle cx="392" cy="292" r="9" fill="#4f8cff"/>
        <circle cx="424" cy="292" r="9" fill="#8b5cff"/>
      </g>
    </svg>
  `;
  return card;
}

function infoChip(text) {
  const chip = el("div", "intro__chip");
  chip.appendChild(el("span", "intro__chipDot"));
  chip.appendChild(el("span", "intro__chipText", { text }));
  return chip;
}

function featureRow(text) {
  const row = el("div", "intro__row");
  row.appendChild(checkMini());
  row.appendChild(el("div", "intro__rowText", { text }));
  return row;
}

function checkMini() {
  const wrap = el("span", "intro__mini");
  wrap.innerHTML = `
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#e9f7ef"></circle>
      <path d="M6 10.3l2.4 2.5L14.3 7" fill="none" stroke="#2ca36b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `;
  return wrap;
}

function shieldMini() {
  const wrap = el("span", "intro__shield");
  wrap.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 3l7 3v5c0 5.2-3.1 8.6-7 10-3.9-1.4-7-4.8-7-10V6l7-3z" fill="#eef1ff"></path>
      <path d="M8 12.4l2.2 2.2L16 8.8" fill="none" stroke="#6f5cff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
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
