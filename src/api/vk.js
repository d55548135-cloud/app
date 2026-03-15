import { CONFIG } from "../config.js";
import { withTimeout, retry } from "../utils/async.js";
import { log } from "../utils/logger.js";

export async function vkInit() {
  await bridgeSend("VKWebAppInit", undefined, {
    timeout: CONFIG.TIMEOUT.BRIDGE,
    timeoutMessage: "VK init timeout",
  });
}

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
    throw normalizeBridgeAuthError(e, "Не удалось получить токен пользователя.");
  }
}

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
    throw normalizeBridgeAuthError(e, "Не удалось получить токен сообщества.");
  }
}

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
    throw normalizeBridgeCommonError(e, "Не удалось установить приложение в сообщество.");
  }
}

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

      const errorMsg = res.error?.error_msg || "ошибка";
      const err = new Error(`VK API: ${method} — ${errorMsg}`);
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

export async function vkGroupsSetSettings({ groupId, token, v = CONFIG.VK_API_VERSION }) {
  return vkCall("groups.setSettings", {
    group_id: groupId,
    messages: 1,
    bots_capabilities: 1,
    access_token: token,
    v,
  });
}

export async function vkGroupsSetLongPollSettings({ groupId, token, v = CONFIG.VK_API_VERSION }) {
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

/* helpers */

async function bridgeSend(method, params, { timeout, timeoutMessage } = {}) {
  return withTimeout(
    window.vkBridge.send(method, params),
    timeout ?? CONFIG.TIMEOUT.BRIDGE,
    timeoutMessage || `${method} timeout`
  );
}

function normalizeBridgeAuthError(err, fallback) {
  if (!err) return new Error(fallback);

  const raw = extractErrorMessage(err);
  const s = raw.toLowerCase();

  if (isAccessDeniedString(s)) {
    const e = new Error("Access denied");
    e.code = "ACCESS_DENIED";
    e.original = err;
    return e;
  }

  if (isCancelString(s)) {
    const e = new Error("User denied");
    e.code = "ACCESS_DENIED";
    e.original = err;
    return e;
  }

  if (err instanceof Error) return err;

  const e = new Error(raw || fallback);
  e.original = err;
  return e;
}

function normalizeBridgeCommonError(err, fallback) {
  if (!err) return new Error(fallback);
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

function isAccessDeniedString(s) {
  return (
    s.includes("access denied") ||
    s.includes("permission denied") ||
    s.includes("user denied") ||
    s.includes('"error_code":4') ||
    s.includes('"error_reason":"user denied"') ||
    s.includes("client_error")
  );
}

function isCancelString(s) {
  return (
    s.includes("cancel") ||
    s.includes("cancelled") ||
    s.includes("canceled") ||
    s.includes("отмен") ||
    s.includes("closed") ||
    s.includes("close")
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

  try {
    return JSON.stringify(err);
  } catch {
    return "";
  }
}
