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
    onProgress?.(1, `Запрашиваю доступ к «${groupName}»`, 30);

    // Не делаем sleep до токена — чтобы не провоцировать клики во время системного окна VK
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

    // Дальше можно замедлять красиво
    await sleep(400);

    onProgress?.(2, "Настраиваю чат-бота в сообществе", 62);
    await sleep(550);

    try {
      await vkGroupsSetSettings({ groupId, token, v: CONFIG.VK_API_VERSION });
    } catch {}

    await sleep(450);

    onProgress?.(3, "Включаю стабильную связь для сообщений", 90);
    await sleep(600);

    try {
      await vkGroupsSetLongPollSettings({ groupId, token, v: CONFIG.VK_API_VERSION });
    } catch {}

    await sleep(450);

    onProgress?.(4, "Завершаю подключение", 96);
    await sleep(350);

    await saveTokenToStorage(groupId, token);

    return { ok: true };
  } finally {
    window.__hubbot_connect_lock = false;
  }
}

async function saveTokenToStorage(groupId, token) {
  const list = await storageLoadConnections(CONFIG.STORAGE_KEY);
  const now = Date.now();

  const next = [
    { id: groupId, token, createdAt: now },
    ...list.filter((x) => x.id !== groupId),
  ];

  await storageSaveConnections(CONFIG.STORAGE_KEY, next);
}

export async function disconnectGroup(groupId) {
  const list = await storageLoadConnections(CONFIG.STORAGE_KEY);
  const next = list.filter((x) => x.id !== groupId);
  await storageSaveConnections(CONFIG.STORAGE_KEY, next);
}
