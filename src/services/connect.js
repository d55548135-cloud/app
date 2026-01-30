import { CONFIG } from "../config.js";
import {
  vkGetCommunityToken,
  vkAddToCommunity,
  vkGroupsSetSettings,
  vkGroupsSetLongPollSettings,
} from "../api/vk.js";
import { storageLoadConnections, storageSaveConnections } from "./storage.js";

/**
 * Основной flow:
 * 1) пробуем получить community token
 * 2) если нет — просим установить в сообщество, затем снова токен
 * 3) авто-настройка (messages + bots + longpoll)
 * 4) сохраняем в storage
 */
export async function connectFlow({ groupId, groupName, onProgress }) {
  onProgress?.(1, `Запрашиваю доступ для «${groupName}»`);

  let token;
  try {
    token = await vkGetCommunityToken({
      appId: CONFIG.APP_ID,
      groupId,
      scope: CONFIG.COMMUNITY_SCOPE,
    });
  } catch {
    onProgress?.(1, `Устанавливаю приложение в «${groupName}»`);
    const newGroupId = await vkAddToCommunity(groupId);

    onProgress?.(1, `Запрашиваю доступ для «${groupName}»`);
    token = await vkGetCommunityToken({
      appId: CONFIG.APP_ID,
      groupId: newGroupId,
      scope: CONFIG.COMMUNITY_SCOPE,
    });

    groupId = newGroupId;
  }

    onProgress?.(2, "Настраиваю чат-бота в сообществе");
  try {
    await vkGroupsSetSettings({ groupId, token, v: CONFIG.VK_API_VERSION });
  } catch {
    // не блокируем пользователя — иногда VK отвечает нестабильно
  }

  onProgress?.(3, "Включаю стабильную связь для сообщений");
  try {
    await vkGroupsSetLongPollSettings({ groupId, token, v: CONFIG.VK_API_VERSION });
  } catch {
    // тоже не блокируем, токен всё равно сохраняем
  }

  onProgress?.(4, "Сохраняю подключение");
  await saveTokenToStorage(groupId, token);

  return { ok: true, message: "Сообщество подключено" };
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
