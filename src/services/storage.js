import { CONFIG } from "../config.js";
import { withTimeout } from "../utils/async.js";
import { safeJsonParse } from "../utils/safe.js";

export async function storageGet(key) {
  const res = await withTimeout(
    window.vkBridge.send("VKWebAppStorageGet", { keys: [key] }),
    CONFIG.TIMEOUT.BRIDGE,
    "Storage get timeout"
  );

  const raw = res?.keys?.[0]?.value || "";
  return raw;
}

export async function storageSet(key, value) {
  await withTimeout(
    window.vkBridge.send("VKWebAppStorageSet", { key, value }),
    CONFIG.TIMEOUT.BRIDGE,
    "Storage set timeout"
  );
}

export async function storageLoadConnections(storageKey) {
  const raw = await storageGet(storageKey);
  if (!raw) return [];

  // поддержка старого формата "id:token"
  if (raw.includes(":") && !raw.trim().startsWith("[")) {
    const [idStr, token] = raw.split(":");
    const id = parseInt(idStr, 10);
    if (!id || !token) return [];
    return [{ id, token, createdAt: Date.now(), enabled: true }];
  }

  const parsed = safeJsonParse(raw, []);
  if (!Array.isArray(parsed)) return [];

  // нормализация + обратная совместимость
  return parsed
    .map((x) => ({
      id: Number(x?.id),
      token: String(x?.token || ""),
      createdAt: Number(x?.createdAt || Date.now()),
      enabled: typeof x?.enabled === "boolean" ? x.enabled : true, // ✅ default ON
    }))
    .filter((x) => Number.isFinite(x.id) && x.id > 0 && x.token.length > 5);
}


export async function storageSaveConnections(storageKey, list) {
  const normalized = (list || [])
    .slice(0, CONFIG.MAX_CONNECTED)
    .map((x) => ({
      id: Number(x?.id),
      token: String(x?.token || ""),
      createdAt: Number(x?.createdAt || Date.now()),
      enabled: typeof x?.enabled === "boolean" ? x.enabled : true,
    }));

  await storageSet(storageKey, JSON.stringify(normalized));
}
