import { el, clear, on } from "./dom.js";
import {
  Header,
  SearchBar,
  GroupCard,
  SkeletonList,
  EmptyState,
  ErrorState,
  PrimaryButton,
  IntroState,
  PermissionDeniedState,
} from "./templates.js";

export function renderApp(viewRoot, state, actions) {
  if (!viewRoot.__hb) {
    viewRoot.__hb = createShell(viewRoot, state, actions);
  }

  const ui = viewRoot.__hb;

  updateHeader(ui, state);

  if (state.phase === "intro") {
    showIntro(ui, state, actions);
    return;
  }

  if (state.phase === "loading" || state.phase === "boot") {
    showLoading(ui);
    return;
  }

  if (state.phase === "error") {
    showError(ui, state, actions);
    return;
  }

  showMain(ui);

  if (ui.searchInput && ui.searchInput.value !== (state.search || "")) {
    ui.searchInput.value = state.search || "";
  }

  ui.refreshBtn?.classList.toggle("is-spinning", !!state.refreshing);
  if (ui.refreshBtn) ui.refreshBtn.disabled = !!state.refreshing || !!state.busy;

  const listKey = buildListKey(
    state.filteredGroups,
    state.connected,
    state.busy,
    !!state.donutActive,
    state.permissionGate
  );

  if (ui.lastListKey !== listKey) {
    ui.lastListKey = listKey;
    renderList(ui, state, actions);
  }

  ui.layout.classList.toggle("is-busy", !!state.busy);
  ui.layout.classList.toggle("layout--intro", state.phase === "intro");
}

function createShell(viewRoot, state, actions) {
  clear(viewRoot);

  const layout = el("div", "layout");
  const headerSlot = el("div", "slot slot--header");
  const content = el("div", "content");
  const section = el("div", "section");

  headerSlot.appendChild(
    Header({ phase: state.phase, progress: state.progress, donutActive: state.donutActive })
  );

  const { wrap: searchWrap, input: searchInput, refreshBtn } = SearchBar({
    value: state.search,
    refreshing: !!state.refreshing,
  });

  on(searchInput, "input", (e) => actions.setSearchDebounced(e.target.value));
  refreshBtn.addEventListener("click", () => actions.refreshConnections(false));

  const listSlot = el("div", "slot slot--list");

  const footer = el("div", "footer");
  if (actions.howItWorksUrl) {
    const how = el("a", "footer__how", { text: "Как это работает?" });
    how.href = actions.howItWorksUrl;
    how.target = "_blank";
    how.rel = "noopener noreferrer";
    footer.appendChild(how);
  }

  section.appendChild(searchWrap);
  section.appendChild(listSlot);
  content.appendChild(section);

  layout.appendChild(headerSlot);
  layout.appendChild(content);
  layout.appendChild(footer);

  viewRoot.appendChild(layout);

  const overlaySlot = el("div", "slot slot--overlay");
  viewRoot.appendChild(overlaySlot);

  return {
    layout,
    headerSlot,
    content,
    section,
    searchWrap,
    searchInput,
    refreshBtn,
    listSlot,
    overlaySlot,
    footer,
    lastListKey: "",
  };
}

function updateHeader(ui, state) {
  clear(ui.headerSlot);

  if (state.phase !== "intro") {
    ui.headerSlot.appendChild(
      Header({ phase: state.phase, progress: state.progress, donutActive: state.donutActive })
    );
  }

  const shouldHideSearch =
    state.phase === "intro" ||
    state.phase === "loading" ||
    state.phase === "boot" ||
    state.phase === "error";

  ui.searchWrap.style.display = shouldHideSearch ? "none" : "";
  ui.footer.style.display = state.phase === "intro" ? "none" : "";
}

function showIntro(ui, state, actions) {
  clear(ui.listSlot);
  clear(ui.overlaySlot);

  const intro = IntroState({
    hasSavedConnections: (state.connected || []).length > 0,
    introState: state.introState || "default",
  });

  const btn = PrimaryButton({ label: "Продолжить" });

  btn.classList.add("intro__cta");
  btn.addEventListener("click", actions.continueFromIntro);

  const wrap = el("div", "introScreen");
  wrap.appendChild(intro);
  wrap.appendChild(btn);

  ui.listSlot.appendChild(wrap);
}

function showLoading(ui) {
  clear(ui.listSlot);
  clear(ui.overlaySlot);
  ui.listSlot.appendChild(SkeletonList({ count: 7 }));
}

function showError(ui, state, actions) {
  clear(ui.listSlot);
  clear(ui.overlaySlot);

  const err = ErrorState({
    title: "Не удалось загрузить",
    text: state.error || "Попробуйте ещё раз.",
  });

  ui.listSlot.appendChild(err);

  const btn = PrimaryButton({ label: "Повторить" });
  btn.addEventListener("click", actions.continueFromIntro);
  ui.listSlot.appendChild(el("div", "spacer"));
  ui.listSlot.appendChild(btn);
}

function showMain(ui) {
  clear(ui.overlaySlot);
}

function renderList(ui, state, actions) {
  clear(ui.listSlot);

  if (state.permissionGate?.type === "community_denied") {
    const denied = PermissionDeniedState({
      title: "Доступ к сообществу не предоставлен",
      text:
        `Без этого разрешения HubBot не сможет подключить «${state.permissionGate.groupName}» и включить нужные настройки автоматически.`,
    });

    const btn = PrimaryButton({ label: "Запросить доступ ещё раз" });
    btn.addEventListener("click", () =>
      actions.retryCommunityPermission(state.permissionGate.groupId)
    );

    ui.listSlot.appendChild(denied);
    ui.listSlot.appendChild(el("div", "spacer"));
    ui.listSlot.appendChild(btn);
    return;
  }

  const groups = state.filteredGroups || [];

  if (!state.groups?.length) {
    ui.listSlot.appendChild(
      EmptyState({
        title: "Нет администрируемых сообществ",
        text: "Добавьте себя администратором в сообщество и попробуйте снова.",
      })
    );
    return;
  }

  if (!groups.length) {
    ui.listSlot.appendChild(
      EmptyState({
        title: "Ничего не найдено",
        text: "Попробуйте другой запрос.",
      })
    );
    return;
  }

  const list = el("div", "list");

  groups.forEach((g) => {
    const isConnected = state.connected.some((x) => x.id === g.id);
    const card = GroupCard({
      group: g,
      isConnected,
      isBusy: state.busy,
      donutActive: !!state.donutActive,
    });

    card.addEventListener("click", () => {
      if (card.dataset.locked === "1") {
        const badge = card.querySelector(".badge");
        if (badge) {
          badge.classList.remove("is-shaking");
          badge.offsetWidth;
          badge.classList.add("is-shaking");
        }
      }

      actions.onGroupClick(g.id);
    });

    list.appendChild(card);
  });

  ui.listSlot.appendChild(list);
}

function buildListKey(groups, connected, busy, donutActive, permissionGate) {
  const g = (groups || []).map((x) => x.id).join(",");
  const c = (connected || []).map((x) => x.id).join(",");
  const p = permissionGate ? `${permissionGate.type}:${permissionGate.groupId}` : "";
  return `${g}|${c}|${busy ? 1 : 0}|${donutActive ? 1 : 0}|${p}`;
}
