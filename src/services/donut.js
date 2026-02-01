import { vkCall } from "../api/vk.js";
import { CONFIG } from "../config.js";

export async function checkDonut({ ownerId }) {
  // ownerId — ID сообщества HubBot (с минусом)
  try {
    const res = await vkCall("donut.isDon", {
      owner_id: ownerId,
      v: "5.131",
    });

    return !!res?.is_don;
  } catch (e) {
    if (CONFIG.DEBUG) {
      console.warn("donut.isDon failed", e);
    }
    // ❗В проде лучше считать “неизвестно”, а не “нет подписки”
    // но чтобы не усложнять — пока false
    return false;
  }
}
