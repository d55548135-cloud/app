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
  phase: "boot",
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

  root.innerHTML = `
    <div id="app-view"></div>
    <div id="portal-toast"></div>
    <div id="portal-modal"></div>
  `;

  const viewRoot = document.getElementById("app-view");
  const toastRoot = document.getElementById("portal-toast");
  const modalRoot = document.getElementById("portal-modal");

  mountToast(toastRoot);
  mountModal(modalRoot);

  store.subscribe(() => renderApp(viewRoot, store.getState(), actions));
  renderApp(viewRoot, store.getState(), actions);

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
      progress: { step: 0, label: "", percent: 0 },
    });

    root.setAttribute("aria-busy", "false");
  } catch (e) {
    log("init error", e);
    store.setState({
      phase: "error",
      error: normalizeError(e, "Не удалось загрузить группы. Проверьте доступ и повторите."),
      busy: false,
    });
    root.setAttribute("aria-busy", "false");
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
            id: "ok",
            label: "Закрыть",
            type: "secondary",
            onClick: () => {},
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

    // ✅ ЛИМИТ: НЕ ВЫТЕСНЯЕМ, А ЗАПРЕЩАЕМ
    const max = Number.isFinite(CONFIG.MAX_CONNECTIONS) ? CONFIG.MAX_CONNECTIONS : 2;
    const alreadyConnected = state.connected.some((x) => x.id === groupId);

    if (!alreadyConnected && state.connected.length >= max) {
      window.__hubbot_modal_open?.({
        title: "Достигнут лимит подключений",
        subtitle:
          `Можно подключить максимум ${max} сообществ(а).\n` +
          "Чтобы подключить новое — отключите одно из текущих в чате управления Hubby.",
        actions: [
          {
            id: "open_chat",
            label: "Открыть управление Hubby",
            type: "primary",
            onClick: () => actions.openChat(),
          },
          {
            id: "close",
            label: "Понятно",
            type: "secondary",
            onClick: () => {},
          },
        ],
      });
      return;
    }

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
        stopProgressEngine();

        store.setState({
          phase: "ready",
          connected,
          busy: false,
          progress: { step: 0, label: "", percent: 0 },
          error: null,
        });

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
  store.setState({
    filteredGroups: groups.filter((g) => (g.name || "").toLowerCase().includes(q)),
  });
}

function normalizeError(err, fallback) {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err?.message) return err.message;
  try { return JSON.stringify(err); } catch { return fallback; }
}

function stopProgressEngine() {
  if (progressEngine) {
    progressEngine.stop();
    progressEngine = null;
  }
}

/**
 * ✅ Прогресс: быстрее и без резкого “взлёта” на финале
 * - ускорили инерцию
 * - подняли maxBeforeFinish ближе к 100
 * - сделали финиш дольше и мягче
 */
function createProgressEngine(emit) {
  let raf = null;
  let running = false;

  let percent = 0;
  let cap = 25;
  let step = 1;
  let label = "Начинаю…";

  const speed = 22;          // было 12 → стало бодрее
  const maxBeforeFinish = 97; // было 92 → теперь меньше “скачок” на финале

  let last = performance.now();

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const target = Math.min(cap, maxBeforeFinish);

    if (percent < target) {
      const distance = target - percent;
      // чем ближе к target, тем медленнее – но не слишком
      const ease = Math.max(0.22, Math.min(1, distance / 22));
      percent += speed * ease * dt;
      percent = Math.min(percent, target);
    }

    emit({ progress: { step, label, percent: Math.round(percent) } });
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
      else cap = Math.max(cap, 30);
    },
    finishTo100(onDone) {
      this.stop();

      const start = percent;
      const duration = 1400; // было 900 → финал мягче и без “взлёта”
      const startTime = performance.now();

      const finishTick = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        // плавная кривая без резкого ускорения
        const eased = 1 - Math.pow(1 - t, 4);
        const value = start + (100 - start) * eased;

        emit({ progress: { step: 4, label: "Готово", percent: Math.round(value) } });

        if (t < 1) requestAnimationFrame(finishTick);
        else onDone?.();
      };

      requestAnimationFrame(finishTick);
    },
  };
}
