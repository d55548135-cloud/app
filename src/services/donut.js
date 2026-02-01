import { vkCall } from "../api/vk.js";
import { CONFIG } from "../config.js";

export async function checkDonut({ userToken, groupId }) {
  const ownerId = -Math.abs(groupId);

  try {
    const isDon = await vkCall("donut.isDon", {
      owner_id: ownerId,
      v: CONFIG.VK_API_VERSION,
      access_token: userToken, // ✅ ЯВНО user token
    });

    if (CONFIG.DEBUG) {
      console.warn("donut.isDon:", isDon);
    }

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
