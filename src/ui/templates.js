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
    <svg viewBox="0 0 960 460" class="intro__svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hbBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F7F9FF"/>
          <stop offset="100%" stop-color="#EEF2FF"/>
        </linearGradient>

        <linearGradient id="hbCard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#F6F8FF"/>
        </linearGradient>

        <linearGradient id="hbBot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#17192E"/>
          <stop offset="100%" stop-color="#12142A"/>
        </linearGradient>

        <linearGradient id="hbAccent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#8B63FF"/>
          <stop offset="100%" stop-color="#5E8EFF"/>
        </linearGradient>

        <linearGradient id="hbLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#9A8CFF"/>
          <stop offset="100%" stop-color="#6B90FF"/>
        </linearGradient>

        <filter id="hbShadowSoft" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#9AA7D6" flood-opacity="0.16"/>
        </filter>

        <filter id="hbShadowCard" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#8B98C8" flood-opacity="0.14"/>
        </filter>

        <filter id="hbGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" result="blur"/>
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0.48
                    0 1 0 0 0.42
                    0 0 1 0 1
                    0 0 0 0.18 0"/>
        </filter>
      </defs>

      <rect x="18" y="18" width="924" height="424" rx="36" fill="url(#hbBg)"/>

      <circle cx="146" cy="98" r="42" fill="#EFF3FF"/>
      <circle cx="820" cy="96" r="54" fill="#EDE5FF"/>
      <circle cx="790" cy="328" r="68" fill="#EAF1FF"/>

      <g opacity="0.9">
        <rect x="88" y="84" width="300" height="290" rx="34" fill="#F3F5FD"/>
        <rect x="572" y="108" width="222" height="214" rx="30" fill="#F2F5FD"/>
      </g>

      <g filter="url(#hbShadowCard)">
        <rect x="114" y="118" width="252" height="222" rx="34" fill="url(#hbCard)"/>
        <rect x="146" y="150" width="68" height="68" rx="22" fill="#E3E9F6"/>
        <rect x="232" y="160" width="96" height="16" rx="8" fill="#C8D1EA"/>
        <rect x="232" y="186" width="72" height="14" rx="7" fill="#D8DFF2"/>
        <rect x="146" y="254" width="136" height="16" rx="8" fill="#C9D2E9"/>
        <rect x="146" y="282" width="108" height="14" rx="7" fill="#D9E0F1"/>
        <rect x="146" y="308" width="122" height="18" rx="9" fill="#D8CBFB"/>
      </g>

      <g filter="url(#hbShadowCard)">
        <rect x="612" y="132" width="176" height="160" rx="28" fill="url(#hbCard)"/>
        <rect x="646" y="164" width="56" height="56" rx="18" fill="#E3E9F6"/>
        <rect x="720" y="172" width="58" height="12" rx="6" fill="#C8D1EA"/>
        <rect x="720" y="192" width="44" height="12" rx="6" fill="#D8DFF2"/>
        <rect x="646" y="246" width="108" height="14" rx="7" fill="#CDD5EA"/>
        <path d="M748 250l20 20 32-42" fill="none" stroke="#5E82FF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      </g>

      <g>
        <rect x="382" y="78" width="196" height="268" rx="56" fill="url(#hbBot)"/>
        <rect x="430" y="42" width="16" height="52" rx="8" fill="#17192E"/>
        <rect x="514" y="42" width="16" height="52" rx="8" fill="#17192E"/>

        <g filter="url(#hbShadowSoft)">
          <rect x="414" y="118" width="132" height="108" rx="30" fill="#F7F9FF"/>
        </g>

        <circle cx="454" cy="172" r="8" fill="#1B1D31"/>
        <circle cx="506" cy="172" r="8" fill="#1B1D31"/>
        <rect x="454" y="194" width="52" height="10" rx="5" fill="#8790FF"/>

        <rect x="416" y="244" width="130" height="24" rx="12" fill="#23274A"/>
        <g filter="url(#hbGlow)">
          <path d="M478 255h10l-12 16h10l-14 20 4-14h-10l12-22z" fill="url(#hbAccent)"/>
        </g>
        <path d="M478 255h10l-12 16h10l-14 20 4-14h-10l12-22z" fill="url(#hbAccent)"/>
      </g>

      <g opacity="0.95">
        <rect x="366" y="204" width="32" height="8" rx="4" fill="url(#hbLine)"/>
        <rect x="562" y="204" width="32" height="8" rx="4" fill="url(#hbLine)"/>
      </g>

      <g opacity="0.96">
        <circle cx="468" cy="362" r="11" fill="#8B63FF"/>
        <circle cx="504" cy="362" r="11" fill="#6B90FF"/>
        <circle cx="540" cy="362" r="11" fill="#8B63FF"/>
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
