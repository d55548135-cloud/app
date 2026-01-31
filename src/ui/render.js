import { clear, el, on } from "./dom.js";
import {
  Header,
  SearchBar,
  GroupCard,
  SkeletonList,
  EmptyState,
  ErrorState,
  PrimaryButton,
} from "./templates.js";

export function renderApp(viewRoot, state, actions) {
  clear(viewRoot);

  const layout = el("div", "layout");
  layout.appendChild(Header({ phase: state.phase, progress: state.progress }));

  const content = el("div", "content");
  const section = el("div", "section");

  if (state.phase === "loading" || state.phase === "boot") {
    section.appendChild(SkeletonList({ count: 7 }));
  }

  if (state.phase === "error") {
    const err = ErrorState({
      title: "Не удалось загрузить",
      text: state.error || "Попробуйте ещё раз.",
    });
    section.appendChild(err);

    const btn = PrimaryButton({ label: "Повторить" });
    btn.addEventListener("click", actions.retry);
    section.appendChild(el("div", "spacer"));
    section.appendChild(btn);
  }

  if (state.phase === "ready" || state.phase === "connecting") {
    const { wrap, input } = SearchBar({ value: state.search });
    on(input, "input", (e) => actions.setSearchDebounced(e.target.value));
    section.appendChild(wrap);

    const groups = state.filteredGroups || [];

    if (!state.groups?.length) {
      section.appendChild(
        EmptyState({
          title: "Нет администрируемых сообществ",
          text: "Добавьте себя администратором в сообщество и попробуйте снова.",
        })
      );
    } else if (!groups.length) {
      section.appendChild(
        EmptyState({
          title: "Ничего не найдено",
          text: "Попробуйте другой запрос.",
        })
      );
    } else {
      const list = el("div", "list");
      groups.forEach((g) => {
        const isConnected = state.connected.some((x) => x.id === g.id);
        const card = GroupCard({ group: g, isConnected, isBusy: state.busy });
        card.addEventListener("click", () => actions.onGroupClick(g.id));
        list.appendChild(card);
      });
      section.appendChild(list);
    }
  }

  content.appendChild(section);
  layout.appendChild(content);

  const footer = el("div", "footer");
  footer.appendChild(
    el("div", "footer__hint", {
      text: "Мы автоматически включим чат-бота и стабильную связь для сообщений.",
    })
  );
  layout.appendChild(footer);

  viewRoot.appendChild(layout);
}
