import { CONFIG } from "./config.js";
import { vkInit, vkGetUserToken, vkGroupsGetAdmin } from "./api/vk.js";
import { Store } from "./state/store.js";
import { storageLoadConnections } from "./services/storage.js";
import { connectFlow, disconnectGroup } from "./services/connect.js";
import { renderApp } from "./ui/render.js";
import { mountToast } from "./ui/toast.js";
import { mountModal } from "./ui/modal.js";
import { debounce } from "./utils/debounce.js";
import { log } from "./utils/logger.js";

const store = new Store({
  phase: "boot", // boot | loading | ready | connecting | success | error
  groups: [],
  filteredGroups: [],
  connected: [], // [{id, token, createdAt}]
  selectedGroupId: null,
  progress: { step: 0, label: "" },
  progressPct: 0,
  search: "",
  error: null,
  busy: false,
});


export async function initApp() {
  const root = document.getElementById("app");
  root.innerHTML = "";

  mountToast(root);
  mountModal(root);

  store.subscribe(() => renderApp(root, store.getState(), actions));
  renderApp(root, store.getState(), actions);

  store.setState({ phase: "loading", error: null });

  try {
    await vkInit();

    const connected = await storageLoadConnections(CONFIG.STORAGE_KEY);
    store.setState({ connected });

    // получаем user token -> список админских групп
    const userToken = await vkGetUserToken(CONFIG.APP_ID, CONFIG.USER_SCOPE);

    const groups = await vkGroupsGetAdmin(userToken, CONFIG.VK_API_VERSION);
    store.setState({
      phase: "ready",
      groups,
      filteredGroups: groups,
      error: null,
    });

    document.getElementById("app")?.setAttribute("aria-busy", "false");
  } catch (e) {
    log("init error", e);
    store.setState({
      phase: "error",
      error: normalizeError(e, "Не удалось загрузить группы. Проверьте доступ и повторите."),
      busy: false,
    });
    document.getElementById("app")?.setAttribute("aria-busy", "false");
  }
}

const actions = {
  retry: () => initApp(),

  setSearch: (value) => {
    store.setState({ search: value });
    filterGroups();
  },

  setSearchDebounced: debounce((value) => {
    store.setState({ search: value });
    filterGroups();
  }, 120),

  async onGroupClick(groupId) {
    const state = store.getState();
    if (state.busy) return;

    store.setState({ selectedGroupId: groupId });

    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return;

    const isConnected = state.connected.some((x) => x.id === groupId);

    if (isConnected) {
      // откроем bottom sheet с действиями
      window.__hubbot_modal_open?.({
        title: group.name,
        subtitle: "Это сообщество уже подключено",
        actions: [
          {
            id: "open_chat",
            label: "Открыть чат с HubBot",
            type: "primary",
            onClick: () => openBotChat(),
          },
          {
            id: "reconnect",
            label: "Переподключить",
            type: "secondary",
            onClick: () => actions.startConnect(groupId),
          },
          {
            id: "disconnect",
            label: "Отключить",
            type: "danger",
            onClick: async () => {
              await disconnectGroup(groupId);
              const connected = await storageLoadConnections(CONFIG.STORAGE_KEY);
              store.setState({ connected });
              window.__hubbot_toast?.("Отключено", "success");
            },
          },
        ],
      });
      return;
    }

    // если не подключено — сразу начинаем процесс
    await actions.startConnect(groupId);
  },

  async startConnect(groupId) {
    const state = store.getState();
    if (state.busy) return;

    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return;

    store.setState({
      phase: "connecting",
      busy: true,
      error: null,
      progress: { step: 1, label: "Начинаю подключение…", percent: 0 },
    });

    try {
      await connectFlow({
        groupId,
        groupName: group.name,
        onProgress: (step, label, targetPercent) => {
          animateProgress(store, step, label, targetPercent);
        },
      });

      const connected = await storageLoadConnections(CONFIG.STORAGE_KEY);

      store.setState({
        phase: "success",
        connected,
        busy: false,
        progress: { step: 4, label: "Готово", percent: 100 },
      });

      window.__hubbot_toast?.("Сообщество успешно подключено", "success");

      setTimeout(() => {
        openBotChat();
      }, CONFIG.CONNECT_REDIRECT_DELAY_MS);
    } catch (e) {
      store.setState({
        phase: "ready",
        busy: false,
        error: "Не удалось подключить сообщество. Попробуйте ещё раз.",
        progress: { step: 0, label: "", percent: 0 },
      });
      window.__hubbot_toast?.("Ошибка подключения", "error");
    }
  }

};

function filterGroups() {
  const { groups, search } = store.getState();
  const q = (search || "").trim().toLowerCase();

  if (!q) {
    store.setState({ filteredGroups: groups });
    return;
  }

  const filtered = groups.filter((g) => (g.name || "").toLowerCase().includes(q));
  store.setState({ filteredGroups: filtered });
}

function openBotChat() {
  const link = `https://vk.com/im?sel=-${CONFIG.BOT_GROUP_ID}`;
  try {
    top.location.href = link;
  } catch {
    window.open(link, "_self");
  }
}

function normalizeError(err, fallback) {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err?.message) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}


function animateProgress(store, step, label, targetPercent) {
  const state = store.getState();
  const start = Number.isFinite(state.progress?.percent) ? state.progress.percent : 0;
  const target = Number.isFinite(targetPercent) ? targetPercent : start;

  // если target меньше текущего — не откатываемся назад
  const finalTarget = Math.max(start, target);

  const duration = 850; // плавность/«дороговизна»
  const startTime = performance.now();

  function tick(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    const value = Math.round(start + (finalTarget - start) * eased);

    store.setState({
      progress: { step, label, percent: value },
    });

    if (t < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
