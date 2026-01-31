import { CONFIG } from "./config.js";
import { vkInit, vkGetUserToken, vkGroupsGetAdmin } from "./api/vk.js";
import { Store } from "./state/store.js";
import { storageLoadConnections } from "./services/storage.js";
import { connectFlow } from "./services/connect.js";
import { renderApp } from "./ui/render.js";
import { mountToast } from "./ui/toast.js";
import { mountModal } from "./ui/modal.js";
import { debounce } from "./utils/debounce.js";
import { log } from "./utils/logger.js";
import { buildSuccessContent } from "./ui/success_content.js";

const store = new Store({
  phase: "boot", // boot | loading | ready | connecting | error
  groups: [],
  filteredGroups: [],
  connected: [],
  selectedGroupId: null,
  progress: { step: 0, label: "", percent: 0 },
  search: "",
  error: null,
  busy: false,
});

let progressEngine = null;

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

    const userToken = await vkGetUserToken(CONFIG.APP_ID, CONFIG.USER_SCOPE);
    const groups = await vkGroupsGetAdmin(userToken, CONFIG.VK_API_VERSION);

    store.setState({
      phase: "ready",
      groups,
      filteredGroups: groups,
      error: null,
      busy: false,
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

  setSearchDebounced: debounce((value) => {
    store.setState({ search: value });
    filterGroups();
  }, 120),

  openChat() {
    const link = `https://vk.com/im?sel=-${CONFIG.BOT_GROUP_ID}`;
    try {
      top.location.href = link;
    } catch {
      window.open(link, "_self");
    }
  },

  async onGroupClick(groupId) {
    const state = store.getState();
    if (state.busy) return;

    store.setState({ selectedGroupId: groupId });

    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return;

    const isConnected = state.connected.some((x) => x.id === groupId);

    if (isConnected) {
      window.__hubbot_modal_open?.({
        title: group.name,
        subtitle: "Это сообщество уже подключено",
        actions: [
          {
            id: "open_chat",
            label: "Перейти в чат управления Hubby",
            type: "primary",
            onClick: () => actions.openChat(),
          },
          {
            id: "reconnect",
            label: "Переподключить",
            type: "secondary",
            onClick: () => actions.startConnect(groupId),
          },
        ],
      });
      return;
    }

    await actions.startConnect(groupId);
  },

  async startConnect(groupId) {
    const state = store.getState();
    if (state.busy) return;

    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return;

    stopProgressEngine();
    progressEngine = createProgressEngine((patch) => store.setState(patch));
    progressEngine.start();

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
        onProgress: (step, label, capPercent) => {
          progressEngine.setStep(step, label, capPercent);
        },
      });

      const connected = await storageLoadConnections(CONFIG.STORAGE_KEY);

      progressEngine.finishTo100(() => {
        // ВАЖНО: не переходим на отдельный success-экран.
        // Возвращаемся в "ready" и показываем success-модалку поверх.
        stopProgressEngine();

        store.setState({
          phase: "ready",
          connected,
          busy: false,
          progress: { step: 0, label: "", percent: 0 },
          error: null,
        });

        // Открываем богатую success-модалку
        const contentNode = buildSuccessContent(group.name);

        window.__hubbot_modal_success?.({
          title: "Успешно подключено",
          subtitle: `Сообщество «${group.name}» готово к работе.`,
          contentNode,
          actions: [
            {
              id: "open_chat",
              label: "Перейти в чат управления Hubby",
              type: "primary",
              onClick: () => actions.openChat(),
            },
            {
              id: "close",
              label: "Остаться в списке сообществ",
              type: "secondary",
              onClick: () => {},
            },
          ],
        });

        window.__hubbot_toast?.("Подключение завершено ✅", "success");
      });
    } catch (e) {
      stopProgressEngine();
      store.setState({
        phase: "ready",
        busy: false,
        error: normalizeError(e, "Не удалось подключить сообщество. Попробуйте ещё раз."),
        progress: { step: 0, label: "", percent: 0 },
      });
      window.__hubbot_toast?.("Ошибка подключения", "error");
    }
  },
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

function stopProgressEngine() {
  if (progressEngine) {
    progressEngine.stop();
    progressEngine = null;
  }
}

function createProgressEngine(emit) {
  let raf = null;
  let running = false;

  let percent = 0;
  let cap = 18;
  let step = 1;
  let label = "Начинаю…";

  const speed = 12;
  const maxBeforeFinish = 92;

  let last = performance.now();

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const target = Math.min(cap, maxBeforeFinish);

    if (percent < target) {
      const distance = target - percent;
      const ease = Math.max(0.14, Math.min(1, distance / 18));
      percent += speed * ease * dt;
      percent = Math.min(percent, target);
    }

    emit({
      progress: { step, label, percent: Math.round(percent) },
    });

    raf = requestAnimationFrame(loop);
  }

  return {
    start() {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    },
    setStep(nextStep, nextLabel, nextCap) {
      step = nextStep;
      label = nextLabel;
      if (Number.isFinite(nextCap)) cap = Math.max(cap, nextCap);
      else cap = Math.max(cap, 20);
    },
    finishTo100(onDone) {
      this.stop();

      const start = percent;
      const duration = 900;
      const startTime = performance.now();

      const finishTick = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const value = start + (100 - start) * eased;

        emit({
          progress: { step: 4, label: "Готово", percent: Math.round(value) },
        });

        if (t < 1) requestAnimationFrame(finishTick);
        else onDone?.();
      };

      requestAnimationFrame(finishTick);
    },
  };
}
