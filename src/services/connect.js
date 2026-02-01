import { CONFIG } from "../config.js";
import {
  vkGetCommunityToken,
  vkGroupsSetSettings,
  vkGroupsSetLongPollSettings,
} from "../api/vk.js";
import { storageLoadConnections, storageSaveConnections } from "./storage.js";
import { sleep } from "../utils/async.js";

// Единый код причины — чтобы app.js мог красиво различать отмену
export const CONNECT_ERRORS = {
  PERMISSION_DENIED: "PERMISSION_DENIED",
};

export async function connectFlow({ groupId, groupName, onProgress }) {
  if (window.__hubbot_connect_lock) {
    throw new Error("Подключение уже выполняется.");
  }
  window.__hubbot_connect_lock = true;

  try {
    // ✅ ШАГ 1: Доступ — ОЖИДАНИЕ пользователя
    // ВАЖНО: cap маленький, чтобы прогресс не “убежал” пока окно VK открыто
    onProgress?.(1, `Ожидаю подтверждение доступа к «${groupName}»`, 39);

    let token;
    try {
      token = await vkGetCommunityToken({
        appId: CONFIG.APP_ID,
        groupId,
        scope: CONFIG.COMMUNITY_SCOPE,
      });
    } catch (e) {
      // ❗ Это не "ошибка" — это отмена/запрет/закрытие окна
      const err = new Error(CONNECT_ERRORS.PERMISSION_DENIED);
      err.code = CONNECT_ERRORS.PERMISSION_DENIED;
      throw err;
    }

    // Мини-пауза после подтверждения — чтобы UI не “дернулся”
    await sleep(180);

    // ✅ ШАГ 2: чат-бот
    onProgress?.(2, "Настраиваю чат-бота в сообществе", 60);
    await sleep(250);
    try {
      await vkGroupsSetSettings({ groupId, token, v: CONFIG.VK_API_VERSION });
    } catch {}

    await sleep(220);

    // ✅ ШАГ 3: связь
    onProgress?.(3, "Включаю стабильную связь для сообщений", 94);
    await sleep(250);
    try {
      await vkGroupsSetLongPollSettings({ groupId, token, v: CONFIG.VK_API_VERSION });
    } catch {}

    await sleep(180);

    // ✅ ШАГ 4: завершение (без “скачка”)
    onProgress?.(4, "Завершаю подключение", 97);
    await sleep(180);

    await saveTokenToStorage(groupId, token);

    return { ok: true };
  } finally {
    window.__hubbot_connect_lock = false;
  }
}

async function saveTokenToStorage(groupId, token) {
  const list = await storageLoadConnections(CONFIG.STORAGE_KEY);
  const now = Date.now();

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
