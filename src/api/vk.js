import { CONFIG } from "../config.js";
import { withTimeout, retry } from "../utils/async.js";
import { log } from "../utils/logger.js";

export async function vkInit() {
  // VKWebAppInit нужен всегда
  await withTimeout(window.vkBridge.send("VKWebAppInit"), CONFIG.TIMEOUT.BRIDGE, "VK init timeout");
}

export async function vkGetUserToken(appId, scope) {
  const res = await retry(
    () =>
      withTimeout(
        window.vkBridge.send("VKWebAppGetAuthToken", { app_id: appId, scope }),
        CONFIG.TIMEOUT.BRIDGE,
        "User token timeout"
      ),
    { retries: 1, delayMs: 350 }
  );
  console.log(res)
  if (!res?.access_token) throw new Error("Не удалось получить токен пользователя.");
  return res.access_token;
}

export async function vkGetCommunityToken({ appId, groupId, scope }) {
  const res = await withTimeout(
    window.vkBridge.send("VKWebAppGetCommunityToken", {
      app_id: appId,
      group_id: groupId,
      scope,
    }),
    CONFIG.TIMEOUT.BRIDGE,
    "Community token timeout"
  );

  if (!res?.access_token) throw new Error("Не удалось получить токен сообщества.");
  return res.access_token;
}

export async function vkAddToCommunity(groupId) {
  const res = await withTimeout(
    window.vkBridge.send("VKWebAppAddToCommunity", { group_id: groupId }),
    CONFIG.TIMEOUT.BRIDGE,
    "Add to community timeout"
  );

  const newGroupId = parseInt(res?.group_id, 10);
  if (!newGroupId) throw new Error("Установка приложения в сообщество отменена или не завершилась.");
  return newGroupId;
}

export async function vkCall(method, params) {
  const payload = {
    method,
    params: {
      ...params,
      v: params?.v || CONFIG.VK_API_VERSION,
    },
  };

  const res = await withTimeout(
    window.vkBridge.send("VKWebAppCallAPIMethod", payload),
    CONFIG.TIMEOUT.API,
    `${method} timeout`
  );

  if (res?.error) {
    log("VK API error", res.error);
    throw new Error(`VK API: ${method} — ${res.error?.error_msg || "ошибка"}`);
  }
  return res?.response;
}

export async function vkGroupsGetAdmin(userToken, v) {
  const resp = await vkCall("groups.get", {
    filter: "admin",
    extended: 1,
    count: 200,
    access_token: userToken,
    v,
  });

  const items = resp?.items || [];
  return items.map((g) => ({
    id: g.id,
    name: g.name,
    photo: g.photo_100 || g.photo_50 || "",
  }));
}

export async function vkGroupsSetSettings({ groupId, token, v }) {
  return vkCall("groups.setSettings", {
    group_id: groupId,
    messages: 1,
    bots_capabilities: 1,
    // bots_start_button: 1 — можно включать, но не всем нужно
    access_token: token,
    v,
  });
}

export async function vkGroupsSetLongPollSettings({ groupId, token, v }) {
  return vkCall("groups.setLongPollSettings", {
    group_id: groupId,
    enabled: 1,
    api_version: v,
    message_new: 1,
    message_allow: 1,
    message_deny: 1,
    // остальные события — по желанию
    access_token: token,
    v,
  });
}
