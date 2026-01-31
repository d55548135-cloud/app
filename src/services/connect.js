import { CONFIG } from "../config.js";
import {
  vkGetCommunityToken,
  vkGroupsSetSettings,
  vkGroupsSetLongPollSettings,
} from "../api/vk.js";
import { storageLoadConnections, storageSaveConnections } from "./storage.js";
import { sleep } from "../utils/async.js";

export async function connectFlow({ groupId, groupName, onProgress }) {
  if (window.__hubbot_connect_lock) {
    throw new Error("Подключение уже выполняется.");
  }
  window.__hubbot_connect_lock = true;

  try {
    // Шаг 1: подтверждение прав (может быть долгим)
    // ✅ Подняли потолок, чтобы прогресс жил, пока человек подтверждает
    onProgress?.(1, `Запрашиваю доступ к «${groupName}»`, 55);

    let token;
    try {
      token = await vkGetCommunityToken({
        appId: CONFIG.APP_ID,
        groupId,
        scope: CONFIG.COMMUNITY_SCOPE,
      });
    } catch {
      throw new Error("Подтвердите доступ в окне ВКонтакте и попробуйте ещё раз.");
    }

    // Дальше можно “чуть-чуть” замедлять — но без тормозов
    await sleep(250);

    // Шаг 2
    onProgress?.(2, "Настраиваю чат-бота в сообществе", 78);
    await sleep(350);
    try {
      await vkGroupsSetSettings({ groupId, token, v: CONFIG.VK_API_VERSION });
    } catch {}

    await sleep(260);

    // Шаг 3
    onProgress?.(3, "Включаю стабильную связь для сообщений", 94);
    await sleep(350);
    try {
      await vkGroupsSetLongPollSettings({ groupId, token, v: CONFIG.VK_API_VERSION });
    } catch {}

    await sleep(200);

    // Шаг 4 — почти финиш, чтобы не было скачка
    onProgress?.(4, "Завершаю подключение", 97);
    await sleep(200);

    // ✅ Тут мы НЕ вытесняем старые записи — лимит контролируем в app.js
    await saveTokenToStorage(groupId, token);

    return { ok: true };
  } finally {
    window.__hubbot_connect_lock = false;
  }
}

async function saveTokenToStorage(groupId, token) {
  const list = await storageLoadConnections(CONFIG.STORAGE_KEY);
  const now = Date.now();

  // обновляем, если уже есть — иначе добавляем
  const exists = list.some((x) => x.id === groupId);
  const next = exists
    ? list.map((x) => (x.id === groupId ? { ...x, token, updatedAt: now } : x))
    : [{ id: groupId, token, createdAt: now }, ...list];

  await storageSaveConnections(CONFIG.STORAGE_KEY, next);
}

export async function disconnectGroup(groupId) {
  const list = await storageLoadConnections(CONFIG.STORAGE_KEY);
  const next = list.filter((x) => x.id !== groupId);
  await storageSaveConnections(CONFIG.STORAGE_KEY, next);
}
