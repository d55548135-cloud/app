import { clear, el, on } from "./dom.js";
import {
  Header,
  SearchBar,
  GroupCard,
  SkeletonList,
  EmptyState,
  ErrorState,
  PrimaryButton,
  SecondaryButton,
} from "./templates.js";

export function renderApp(root, state, actions) {
  clear(root);

  const layout = el("div", "layout");
  layout.appendChild(Header({ phase: state.phase, progress: state.progress }));

  const content = el("div", "content");
  const section = el("div", "section");

  // ========== LOADING ==========
  if (state.phase === "loading" || state.phase === "boot") {
    section.appendChild(SkeletonList({ count: 7 }));
  }

  // ========== ERROR ==========
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

  // ========== SUCCESS SCREEN ==========
  if (state.phase === "success") {
    section.appendChild(SuccessScreen(state, actions));
  }

  // ========== READY / CONNECTING ==========
  if (state.phase === "ready" || state.phase === "connecting") {
    // Search
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
        const card = GroupCard({
          group: g,
          isConnected,
          isBusy: state.busy,
        });

        card.addEventListener("click", () => actions.onGroupClick(g.id));
        list.appendChild(card);
      });

      section.appendChild(list);
    }
  }

  content.appendChild(section);
  layout.appendChild(content);

  // footer hint (в success не нужен — там свой блок)
  if (state.phase !== "success") {
    const footer = el("div", "footer");
    footer.appendChild(
      el("div", "footer__hint", {
        text: "Мы автоматически включим чат-бота и стабильную связь для сообщений.",
      })
    );
    layout.appendChild(footer);
  }

  root.appendChild(layout);

  // мягкое сообщение об ошибке (если в ready прилетела)
  if ((state.phase === "ready" || state.phase === "connecting") && state.error) {
    window.__hubbot_toast?.(state.error, "error");
  }
}

function SuccessScreen(state, actions) {
  const wrap = el("div", "success");

  const title = el("div", "success__title", { text: "Готово ✅" });
  const subtitle = el("div", "success__subtitle", {
    text: state.success?.groupName
      ? `Сообщество «${state.success.groupName}» подключено.`
      : "Сообщество подключено.",
  });

  wrap.appendChild(title);
  wrap.appendChild(subtitle);

  // Чеклист “что сделали”
  const card = el("div", "success__card");
  card.appendChild(el("div", "success__cardTitle", { text: "Что настроили автоматически" }));

  const ul = el("div", "success__list");
  ul.appendChild(successItem("Сообщения сообщества включены"));
  ul.appendChild(successItem("Возможности ботов активированы (кнопка «Начать»)"));
  ul.appendChild(successItem("Включена стабильная связь для получения новых сообщений"));
  card.appendChild(ul);

  wrap.appendChild(card);

  // Важная подсказка про “обновить активность”
  const note = el("div", "success__note");
  note.appendChild(el("div", "success__noteTitle", { text: "Важно" }));
  note.appendChild(
    el("div", "success__noteText", {
      text:
        "В чате управления Hubby интерфейс может обновиться не сразу. " +
        "Чтобы появились новые кнопки/меню, сделайте любое действие в диалоге: " +
        "нажмите «Начать», отправьте короткое сообщение или просто обновите чат свайпом вниз.",
    })
  );

  wrap.appendChild(note);

  // Кнопки
  const btnOpen = PrimaryButton({ label: "Перейти в чат управления Hubby" });
  btnOpen.addEventListener("click", actions.openChat);

  const btnBack = SecondaryButton({ label: "Подключить другое сообщество" });
  btnBack.addEventListener("click", actions.backToGroups);

  wrap.appendChild(el("div", "spacer"));
  wrap.appendChild(btnOpen);
  wrap.appendChild(el("div", "spacer"));
  wrap.appendChild(btnBack);

  // Немного стилей прямо классами (используем твой existing CSS + добавим ниже)
  return wrap;
}

function successItem(text) {
  const row = el("div", "success__item");
  const dot = el("div", "success__dot", { text: "✓" });
  const t = el("div", "success__itemText", { text });
  row.appendChild(dot);
  row.appendChild(t);
  return row;
}
