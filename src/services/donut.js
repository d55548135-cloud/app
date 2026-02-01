import { vkCall } from "../api/vk.js";
import { CONFIG } from "../config.js";

export async function checkDonut({ userToken, groupId }) {
  const ownerId = -Math.abs(groupId);

  try {
    const res = await vkCall("donut.isDon", {
      owner_id: ownerId,
      v: CONFIG.VK_API_VERSION,
      access_token: userToken, // ✅ ЯВНО user token
    });

    // Обычно ответ: { response: { is_don: 1 } } или { is_don: 1 } — зависит от vkCall
    const isDon =
      res?.is_don ??
      res?.response?.is_don ??
      res?.response ??
      0;

    return Number(isDon) === 1;
  } catch (e) {
    if (CONFIG.DEBUG) {
      console.warn("donut.isDon failed", e);
    }
    // ❗В проде лучше считать “неизвестно”, а не “нет подписки”
    // но чтобы не усложнять — пока false
    return false;
  }
}
