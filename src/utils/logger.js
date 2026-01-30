import { CONFIG } from "../config.js";

export function log(...args) {
  if (!CONFIG.DEBUG) return;
  // eslint-disable-next-line no-console
  console.log("[HubBot]", ...args);
}
