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
  refreshing: false, // ✅ NEW
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

  // ✅ авто-синк при возврате в мини-апп
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      actions.refreshConnections(true);
    }
  });

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
      refreshing: false,
      progress: { step: 0, label: "", percent: 0 },
    });

    root.setAttribute("aria-busy", "false");
  } catch (e) {
    log("init error", e);
    store.setState({
      phase: "error",
      error: normalizeError(e, "Не удалось загрузить группы. Проверьте доступ и повторите."),
      busy: false,
      refreshing: false,
    });
    root.setAttribute("aria-busy", "false");
  }
}

async function syncConnectionsFromStorage({ silent = false } = {}) {
  try {
    const next = await storageLoadConnections(CONFIG.STORAGE_KEY);
    const prev = store.getState().connected;

    const prevKey = (prev || []).map((x) => x.id).join(",");
    const nextKey = (next || []).map((x) => x.id).join(",");

    if (prevKey !== nextKey) {
      store.setState({ connected: next });
      if (!silent) window.__hubbot_toast?.("Список подключений обновлён", "success");
    } else {
      if (!silent) window.__hubbot_toast?.("Уже актуально", "success");
    }
  } catch {
    if (!silent) window.__hubbot_toast?.("Не удалось обновить список", "error");
  }
}

const actions = {
  retry: () => initApp(),

  howItWorksUrl: CONFIG.HOW_IT_WORKS_URL,

  refreshConnections: async (silent = false) => {
    const state = store.getState();
    if (state.refreshing || state.busy) return;

    store.setState({ refreshing: true });
    await syncConnectionsFromStorage({ silent });
    store.setState({ refreshing: false });
  },

  setSearchDebounced: debounce((value) => {
    store.setState({ search: value });
    filterGroups();
  }, 120),

  async openChat() {
    const url = `https://vk.com/im?sel=-${CONFIG.BOT_GROUP_ID}`;

    // 1) Try bridge (some platforms don't support)
    try {
      if (window.vkBridge?.send) {
        await window.vkBridge.send("VKWebAppOpenURL", { url });
        return;
      }
    } catch (e) {
      // error_code: 6 => Unsupported platform (expected)
      const code = e?.error_data?.error_code;

      if (CONFIG.DEBUG && code !== 6) {
        console.warn("VKWebAppOpenURL failed", e);
      }
      // silent fallback
    }

    // 2) Open as top-level tab (reliable)
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  async onGroupClick(groupId) {
    const state = store.getState();
    if (state.busy || state.refreshing) return;

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
        ],
      });
      return;
    }

    await actions.startConnect(groupId);
  },

  async startConnect(groupId) {
    const state = store.getState();
    if (state.busy || state.refreshing) return;

    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return;

    // ⚠️ у тебя в config MAX_CONNECTED, но в коде было MAX_CONNECTIONS — оставим безопасно:
    const max = Number.isFinite(CONFIG.MAX_CONNECTIONS)
      ? CONFIG.MAX_CONNECTIONS
      : (Number.isFinite(CONFIG.MAX_CONNECTED) ? CONFIG.MAX_CONNECTED : 2);

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
          ],
        });

        window.__hubbot_toast?.("Подключение завершено ✅", "success");
      });
    } catch (e) {
      stopProgressEngine();

      if (e?.code === "PERMISSION_DENIED" || e?.message === "PERMISSION_DENIED") {
        store.setState({
          phase: "ready",
          busy: false,
          error: null,
          progress: { step: 0, label: "", percent: 0 },
        });

        window.__hubbot_toast?.("Подключение отменено — доступ не предоставлен", "error");
        return;
      }

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

function createProgressEngine(emit) {
  let raf = null;
  let running = false;

  // текущие (то, что видит UI)
  let percent = 0;
  let shownStep = 1;
  let shownLabel = "Начинаю…";

  // “цель” (то, что приходит из connectFlow)
  let desiredStep = 1;
  let desiredLabel = "Начинаю…";
  let cap = 25;

  const speed = 22;
  const maxBeforeFinish = 97;

  // ✅ Пороги: когда можно зажигать следующий шаг
  // (можешь подогнать числа под свой вкус)
  const STEP_MIN_PERCENT = {
    1: 0,   // Доступ
    2: 55,  // Чат-бот
    3: 78,  // Связь
    4: 94,  // Готово
  };

  let last = performance.now();

  function maybeCommitStep() {
    // если целевой шаг выше — зажигаем его только когда % дошёл до порога
    if (desiredStep > shownStep) {
      const minP = STEP_MIN_PERCENT[desiredStep] ?? 0;
      if (percent >= minP - 0.5) {
        shownStep = desiredStep;
        shownLabel = desiredLabel;
      }
    } else {
      // если шаг не “вперёд”, обновляем label сразу (без ожиданий)
      shownStep = desiredStep;
      shownLabel = desiredLabel;
    }
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const target = Math.min(cap, maxBeforeFinish);

    if (percent < target) {
      const distance = target - percent;
      const ease = Math.max(0.22, Math.min(1, distance / 22));
      percent += speed * ease * dt;
      percent = Math.min(percent, target);
    }

    // ✅ синхронизация: шаг не опережает проценты
    maybeCommitStep();

    emit({
      progress: {
        step: shownStep,
        label: shownLabel,
        percent: Math.round(percent),
      },
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
      desiredStep = Number(nextStep) || 1;
      desiredLabel = nextLabel || "";

      // ✅ кап не должен быть ниже порога шага,
      // иначе шаг никогда не “дождётся” процентов
      const minCap = STEP_MIN_PERCENT[desiredStep] ?? 0;

      if (Number.isFinite(nextCap)) cap = Math.max(cap, nextCap, minCap);
      else cap = Math.max(cap, minCap);
    },

    finishTo100(onDone) {
      this.stop();

      // перед финишем гарантируем, что “Готово” не включится раньше 94%
      desiredStep = 4;
      desiredLabel = "Готово";

      const start = percent;
      const duration = 1400;
      const startTime = performance.now();

      const finishTick = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 4);
        percent = start + (100 - start) * eased;

        maybeCommitStep();

        emit({
          progress: {
            step: shownStep,
            label: shownLabel,
            percent: Math.round(percent),
          },
        });

        if (t < 1) requestAnimationFrame(finishTick);
        else onDone?.();
      };

      requestAnimationFrame(finishTick);
    },
  };
}

