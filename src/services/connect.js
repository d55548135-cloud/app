import { CONFIG } from "../config.js";
import {
  vkGetCommunityToken,
  vkGroupsSetSettings,
  vkGroupsSetLongPollSettings,
} from "../api/vk.js";
import { storageLoadConnections, storageSaveConnections } from "./storage.js";
import { sleep } from "../utils/async.js";

/**
 * Вариант без VKWebAppAddToCommunity:
 * - Получаем токен только через VKWebAppGetCommunityToken
 * - Если VK просит подтверждение — покажет окно (это неизбежно)
 * - Если пользователь отменил/не дал права — возвращаем понятную ошибку
 *
 * onProgress(step, label, targetPercent)
 */
export async function connectFlow({ groupId, groupName, onProgress }) {
  // Защита от двойного старта
  if (window.__hubbot_connect_lock) {
    throw new Error("Подключение уже выполняется.");
  }
  window.__hubbot_connect_lock = true;

  try {
    onProgress?.(1, "Запрашиваю доступ к сообществу", 22);

    // Тут НЕ делаем sleep до запроса токена — иначе человек кликает,
    // а VK в этот момент ждёт подтверждения.
    let token;
    try {
      token = await vkGetCommunityToken({
        appId: CONFIG.APP_ID,
        groupId,
        scope: CONFIG.COMMUNITY_SCOPE,
      });
    } catch (e) {
      // Пользователь отменил / не дал права / VK вернул ошибку
      throw new Error(
        "Нужно подтвердить доступ в окне ВКонтакте. Нажмите «Подключить» и разрешите доступ."
      );
    }

    onProgress?.(2, "Настраиваю чат-бота в сообществе", 55);
    await sleep(650);

    try {
      await vkGroupsSetSettings({ groupId, token, v: CONFIG.VK_API_VERSION });
    } catch {}

    await sleep(500);

    onProgress?.(3, "Включаю стабильную связь для сообщений", 85);
    await sleep(700);

    try {
      await vkGroupsSetLongPollSettings({ groupId, token, v: CONFIG.VK_API_VERSION });
    } catch {}

    await sleep(450);

    onProgress?.(4, "Завершаю подключение", 100);
    await sleep(550);

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
