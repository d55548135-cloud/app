import { vkCall } from "../api/vk.js";

export async function checkDonut({ ownerId }) {
  // ownerId — ID сообщества HubBot (с минусом)
  try {
    const res = await vkCall("donut.isDon", {
      owner_id: ownerId,
      v: "5.131",
    });

    return !!res?.is_don;
  } catch {
    return false;
  }
}
