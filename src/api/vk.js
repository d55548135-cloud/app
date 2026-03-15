import { CONFIG } from "../config.js";
import { withTimeout, retry } from "../utils/async.js";
import { log } from "../utils/logger.js";

/**
 * Инициализация Mini App
 */
export async function vkInit() {
  await bridgeSend("VKWebAppInit", undefined, {
    timeout: CONFIG.TIMEOUT.BRIDGE,
    timeoutMessage: "VK init timeout",
  });
}

/**
 * Получение user token.
 * ВАЖНО: без retry, чтобы после отказа пользователя
 * не открывалось второе системное окно.
 */
export async function vkGetUserToken(appId, scope) {
  try {
    const res = await bridgeSend(
      "VKWebAppGetAuthToken",
      { app_id: appId, scope },
      {
        timeout: CONFIG.TIMEOUT.BRIDGE,
        timeoutMessage: "User token timeout",
      }
    );

    if (!res?.access_token) {
      throw new Error("Не удалось получить токен пользователя.");
    }

    return res.access_token;
  } catch (e) {
    throw normalizeBridgeError(e, {
      fallback: "Не удалось получить токен пользователя.",
    });
  }
}

/**
 * Получение community token.
 * Тоже без retry: отказ пользователя не должен вызывать
 * повторное системное окно.
 */
export async function vkGetCommunityToken({ appId, groupId, scope }) {
  try {
    const res = await bridgeSend(
      "VKWebAppGetCommunityToken",
      {
        app_id: appId,
        group_id: groupId,
        scope,
      },
      {
        timeout: CONFIG.TIMEOUT.BRIDGE,
        timeoutMessage: "Community token timeout",
      }
    );

    if (!res?.access_token) {
      throw new Error("Не удалось получить токен сообщества.");
    }

    return res.access_token;
  } catch (e) {
    throw normalizeBridgeError(e, {
      fallback: "Не удалось получить токен сообщества.",
    });
  }
}

/**
 * Установка приложения в сообщество
 */
export async function vkAddToCommunity(groupId) {
  try {
    const res = await bridgeSend(
      "VKWebAppAddToCommunity",
      { group_id: groupId },
      {
        timeout: CONFIG.TIMEOUT.BRIDGE,
        timeoutMessage: "Add to community timeout",
      }
    );

    const newGroupId = parseInt(res?.group_id, 10);
    if (!newGroupId) {
      throw new Error("Установка приложения в сообщество отменена или не завершилась.");
    }

    return newGroupId;
  } catch (e) {
    throw normalizeBridgeError(e, {
      fallback: "Не удалось установить приложение в сообщество.",
    });
  }
}

/**
 * Универсальный вызов VK API.
 * Здесь retry допустим, потому что это уже не системное окно прав,
 * а обычный API-запрос.
 */
export async function vkCall(method, params = {}) {
  const payload = {
    method,
    params: {
      ...params,
      v: params?.v || CONFIG.VK_API_VERSION,
    },
  };

  const exec = async () => {
    const res = await bridgeSend("VKWebAppCallAPIMethod", payload, {
      timeout: CONFIG.TIMEOUT.API,
      timeoutMessage: `${method} timeout`,
    });

    if (res?.error) {
      log("VK API error", { method, error: res.error });

      const msg = res.error?.error_msg || "ошибка";
      const err = new Error(`VK API: ${method} — ${msg}`);
      err.code = res.error?.error_code;
      err.vkError = res.error;
      throw err;
    }

    return res?.response;
  };

  try {
    return await retry(exec, {
      retries: 1,
      delayMs: 250,
    });
  } catch (e) {
    throw normalizeVkApiError(e, method);
  }
}

/**
 * Получить список сообществ, где пользователь администратор
 */
export async function vkGroupsGetAdmin(userToken, v = CONFIG.VK_API_VERSION) {
  const resp = await vkCall("groups.get", {
    filter: "admin",
    extended: 1,
    count: 200,
    access_token: userToken,
    v,
  });

  const items = Array.isArray(resp?.items) ? resp.items : [];

  return items.map((g) => ({
    id: Number(g.id),
    name: String(g.name || ""),
    photo: g.photo_100 || g.photo_50 || "",
  }));
}

/**
 * Включить сообщения и возможности ботов
 */
export async function vkGroupsSetSettings({ groupId, token, v = CONFIG.VK_API_VERSION }) {
  return vkCall("groups.setSettings", {
    group_id: groupId,
    messages: 1,
    bots_capabilities: 1,
    access_token: token,
    v,
  });
}

/**
 * Включить Long Poll и нужные события
 */
export async function vkGroupsSetLongPollSettings({
  groupId,
  token,
  v = CONFIG.VK_API_VERSION,
}) {
  return vkCall("groups.setLongPollSettings", {
    group_id: groupId,
    enabled: 1,
    api_version: v,
    message_new: 1,
    message_allow: 1,
    message_deny: 1,
    access_token: token,
    v,
  });
}

/* ---------------------------------- */
/* Helpers                            */
/* ---------------------------------- */

async function bridgeSend(method, params, { timeout, timeoutMessage } = {}) {
  return withTimeout(
    window.vkBridge.send(method, params),
    timeout ?? CONFIG.TIMEOUT.BRIDGE,
    timeoutMessage || `${method} timeout`
  );
}

function normalizeBridgeError(err, { fallback = "Ошибка VK Bridge." } = {}) {
  if (!err) return new Error(fallback);

  if (isBridgeAccessDeniedError(err)) {
    const e = new Error("ACCESS_DENIED");
    e.code = "ACCESS_DENIED";
    e.original = err;
    return e;
  }

  if (isBridgeCancelError(err)) {
    const e = new Error("CANCELLED");
    e.code = "CANCELLED";
    e.original = err;
    return e;
  }

  if (err instanceof Error) return err;

  const e = new Error(extractErrorMessage(err) || fallback);
  e.original = err;
  return e;
}

function normalizeVkApiError(err, method) {
  if (!err) return new Error(`VK API: ${method} — ошибка`);

  const msg = extractErrorMessage(err) || `VK API: ${method} — ошибка`;

  if (err instanceof Error) {
    if (!err.message || err.message === "Error") {
      err.message = msg;
    }
    return err;
  }

  const e = new Error(msg);
  e.original = err;
  return e;
}

function isBridgeAccessDeniedError(err) {
  const s = extractErrorMessage(err).toLowerCase();

  return (
    s.includes("access denied") ||
    s.includes("permission denied") ||
    s.includes("user denied") ||
    s.includes('"error_reason":"user denied"') ||
    s.includes('"error_code":4')
  );
}

function isBridgeCancelError(err) {
  const s = extractErrorMessage(err).toLowerCase();

  return (
    s.includes("cancel") ||
    s.includes("cancelled") ||
    s.includes("canceled") ||
    s.includes("отмен") ||
    s.includes("close") ||
    s.includes("closed")
  );
}

function extractErrorMessage(err) {
  if (!err) return "";

  if (typeof err === "string") return err;

  if (typeof err?.message === "string" && err.message) return err.message;
  if (typeof err?.error_description === "string" && err.error_description) return err.error_description;
  if (typeof err?.error_data?.error_reason === "string" && err.error_data.error_reason) {
    return err.error_data.error_reason;
  }
  if (typeof err?.error_data?.error_message === "string" && err.error_data.error_message) {
    return err.error_data.error_message;
  }
  if (typeof err?.error?.error_msg === "string" && err.error.error_msg) {
    return err.error.error_msg;
  }

  try {
    return JSON.stringify(err);
  } catch {
    return "";
  }
}
