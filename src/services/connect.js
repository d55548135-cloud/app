import { CONFIG } from "../config.js";
import {
  vkGetCommunityToken,
  vkAddToCommunity,
  vkGroupsSetSettings,
  vkGroupsSetLongPollSettings,
} from "../api/vk.js";
import { storageLoadConnections, storageSaveConnections } from "./storage.js";
import { sleep } from "../utils/async.js";

/**
 * ВАЖНО:
 * onProgress(step, label, targetPercent)
 * targetPercent — до какого процента должен дойти прогресс
 */
export async function connectFlow({ groupId, groupName, onProgress }) {
  // === ШАГ 1: доступ ===
  onProgress?.(1, "Запрашиваю доступ к сообществу", 25);
  await sleep(600); // визуальная пауза

  let token;
  try {
    token = await vkGetCommunityToken({
      appId: CONFIG.APP_ID,
      groupId,
      scope: CONFIG.COMMUNITY_SCOPE,
    });
  } catch {
    onProgress?.(1, "Устанавливаю HubBot в сообщество", 25);
    await sleep(800);

    const newGroupId = await vkAddToCommunity(groupId);
    await sleep(600);

    token = await vkGetCommunityToken({
      appId: CONFIG.APP_ID,
      groupId: newGroupId,
      scope: CONFIG.COMMUNITY_SCOPE,
    });

    groupId = newGroupId;
  }

  // === ШАГ 2: чат-бот ===
  onProgress?.(2, "Настраиваю чат-бота в сообществе", 55);
  await sleep(700);

  try {
    await vkGroupsSetSettings({
      groupId,
      token,
      v: CONFIG.VK_API_VERSION,
    });
  } catch {
    // не блокируем UX
  }

  await sleep(600);

  // === ШАГ 3: связь ===
  onProgress?.(3, "Включаю стабильную связь для сообщений", 85);
  await sleep(800);

  try {
    await vkGroupsSetLongPollSettings({
      groupId,
      token,
      v: CONFIG.VK_API_VERSION,
    });
  } catch {}

  await sleep(600);

  // === ШАГ 4: сохранение ===
  onProgress?.(4, "Завершаю подключение", 100);
  await sleep(700);

  await saveTokenToStorage(groupId, token);

  return { ok: true };
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
