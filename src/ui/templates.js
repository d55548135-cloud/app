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

export function IntroState({ hasSavedConnections = false, introState = "default" }) {
  const wrap = el("div", "intro");

  const shell = el("div", "intro__shell");
  const visual = el("div", "intro__visual");
  visual.appendChild(buildIntroIllustration());

  const content = el("div", "intro__content");

  const denied = introState === "auth_denied";

  const title = el("div", "intro__title", {
    text: denied
      ? "Нужен доступ, чтобы продолжить"
      : "Подключите HubBot к вашему сообществу",
  });

  const text = el("div", "intro__text", {
    text: denied
      ? "HubBot запрашивает доступ только к списку ваших сообществ VK. Это необходимо, чтобы мы могли отобразить их для вас, проверить статус подключения и продолжить настройку."
      : "HubBot автоматически настроит сообщения сообщества, возможности ботов и стабильную связь. Сначала покажем, что будет происходить, а доступы запросим только на следующем шаге.",
  });

  const points = el("div", "intro__points");

  if (denied) {
    points.appendChild(pointRow("Покажем только сообщества, которыми вы управляете"));
    points.appendChild(pointRow("Проверим доступность подключения и статус подписки"));
    points.appendChild(pointRow("Запросим только необходимые права VK"));
  } else {
    points.appendChild(pointRow("Покажем ваши сообщества, которыми вы управляете"));
    points.appendChild(pointRow("После выбора сообщества отдельно попросим доступ VK"));
    points.appendChild(pointRow("Настройка займёт около 15 секунд"));
  }

  content.appendChild(title);
  content.appendChild(text);
  content.appendChild(points);

  if (hasSavedConnections && !denied) {
    const saved = el("div", "intro__saved");
    const savedText = el("div", "intro__savedText", {
      text: "Ранее подключённые сообщества уже сохранены и подтянутся после продолжения.",
    });
    saved.appendChild(savedText);
    content.appendChild(saved);
  }

  if (denied) {
    const note = el("div", "intro__saved intro__saved--warning");
    const noteText = el("div", "intro__savedText", {
      text: "После нажатия «Продолжить» VK снова покажет системный запрос доступа.",
    });
    note.appendChild(noteText);
    content.appendChild(note);
  }

  shell.appendChild(visual);
  shell.appendChild(content);
  wrap.appendChild(shell);

  return wrap;
}

function buildIntroIllustration() {
  const card = el("div", "intro__scene");

  const img = el("img", "intro__sceneImage", {
    src: "./assets/intro-banner-v2.jpg",
    alt: "",
    loading: "eager",
    decoding: "async",
  });

  card.appendChild(img);
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
