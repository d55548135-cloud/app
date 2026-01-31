import { el } from "./dom.js";
import { Icon } from "./icons.js";

export function buildSuccessContent(groupName) {
  const wrap = el("div", "successModal");

  // “Что настроили”
  const card = el("div", "successModal__card");
  card.appendChild(el("div", "successModal__cardTitle", { text: "Что настроили автоматически" }));

  const list = el("div", "successModal__list");
  list.appendChild(item("Сообщения сообщества включены"));
  list.appendChild(item("Возможности ботов активированы (кнопка «Начать»)"));
  list.appendChild(item("Включена стабильная связь для получения новых сообщений"));

  card.appendChild(list);
  wrap.appendChild(card);

  // Note
  const note = el("div", "successModal__note");
  const noteHead = el("div", "successModal__noteHead");
  noteHead.appendChild(Icon("info", "icon icon--info"));
  noteHead.appendChild(el("div", "successModal__noteTitle", { text: "Важно" }));

  note.appendChild(noteHead);
  note.appendChild(
    el("div", "successModal__noteText", {
      text:
        "В чате управления Hubby интерфейс может обновиться не сразу. " +
        "Чтобы появились новые кнопки/меню, сделайте любое действие в диалоге: " +
        "нажмите «Начать», отправьте короткое сообщение или обновите чат свайпом вниз.",
    })
  );

  wrap.appendChild(note);

  // маленькая строка контекста (по желанию)
  wrap.appendChild(
    el("div", "successModal__fineprint", {
      text: groupName ? `Подключено: «${groupName}»` : "",
    })
  );

  return wrap;
}

function item(text) {
  const row = el("div", "successModal__item");
  const ico = Icon("circleCheck", "icon icon--circleCheck");
  const t = el("div", "successModal__itemText", { text });

  row.appendChild(ico);
  row.appendChild(t);
  return row;
}
