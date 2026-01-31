import { el, clear, on } from "./dom.js";
import {
  Header,
  SearchBar,
  GroupCard,
  SkeletonList,
  EmptyState,
  ErrorState,
  PrimaryButton,
} from "./templates.js";

/**
 * Stateful renderer:
 * - не пересоздаёт список на каждом обновлении прогресса
 * - аватарки не “моргают”
 */
export function renderApp(viewRoot, state, actions) {
  // init once
  if (!viewRoot.__hb) {
    viewRoot.__hb = createShell(viewRoot, state, actions);
  }

  const ui = viewRoot.__hb;

  // update header every time (дёшево)
  updateHeader(ui, state);

  // phase switches
  if (state.phase === "loading" || state.phase === "boot") {
    showLoading(ui);
    return;
  }

  if (state.phase === "error") {
    showError(ui, state, actions);
    return;
  }

  // ready / connecting
  showMain(ui);

  // update search value (без перезатирания курсора)
  if (ui.searchInput && ui.searchInput.value !== (state.search || "")) {
    ui.searchInput.value = state.search || "";
  }

  // update list only when needed
  const listKey = buildListKey(state.filteredGroups, state.connected, state.busy);
  if (ui.lastListKey !== listKey) {
    ui.lastListKey = listKey;
    renderList(ui, state, actions);
  }

  // disable interactions while busy (без уничтожения DOM)
  ui.layout.classList.toggle("is-busy", !!state.busy);
}

function createShell(viewRoot, state, actions) {
  clear(viewRoot);

  const layout = el("div", "layout");
  const headerSlot = el("div", "slot slot--header");
  const content = el("div", "content");
  const section = el("div", "section");

  // header placeholder (will be replaced)
  headerSlot.appendChild(Header({ phase: state.phase, progress: state.progress }));

  // search
  const { wrap: searchWrap, input: searchInput } = SearchBar({ value: state.search });
  on(searchInput, "input", (e) => actions.setSearchDebounced(e.target.value));

  // list slot
  const listSlot = el("div", "slot slot--list");

  // footer
  const footer = el("div", "footer");
  footer.appendChild(
    el("div", "footer__hint", {
      text: "Мы автоматически включим чат-бота и стабильную связь для сообщений.",
    })
  );

  section.appendChild(searchWrap);
  section.appendChild(listSlot);
  content.appendChild(section);

  layout.appendChild(headerSlot);
  layout.appendChild(content);
  layout.appendChild(footer);

  viewRoot.appendChild(layout);

  // extra screens
  const overlaySlot = el("div", "slot slot--overlay");
  viewRoot.appendChild(overlaySlot);

  return {
    layout,
    headerSlot,
    content,
    section,
    searchWrap,
    searchInput,
    listSlot,
    overlaySlot,
    lastListKey: "",
  };
}

function updateHeader(ui, state) {
  // replace header node (but not whole layout)
  clear(ui.headerSlot);
  ui.headerSlot.appendChild(Header({ phase: state.phase, progress: state.progress }));
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
  btn.addEventListener("click", actions.retry);
  ui.listSlot.appendChild(el("div", "spacer"));
  ui.listSlot.appendChild(btn);
}

function showMain(ui) {
  clear(ui.overlaySlot);
  // listSlot is managed separately
}

function renderList(ui, state, actions) {
  clear(ui.listSlot);

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
    const card = GroupCard({ group: g, isConnected, isBusy: state.busy });
    card.addEventListener("click", () => actions.onGroupClick(g.id));
    list.appendChild(card);
  });

  ui.listSlot.appendChild(list);
}

function buildListKey(groups, connected, busy) {
  // lightweight stable key: ids + connected ids + busy flag
  const g = (groups || []).map((x) => x.id).join(",");
  const c = (connected || []).map((x) => x.id).join(",");
  return `${g}|${c}|${busy ? 1 : 0}`;
}
