export const CONFIG = {
  APP_ID: 54433980,
  BOT_GROUP_ID: 225034017,

  HOW_IT_WORKS_URL: "https://vk.com/@yourcommunity-your-article",

  STORAGE_KEY: "hub_connect_data",
  MAX_CONNECTED: 2, // можно лимитировать, если нужно

  VK_API_VERSION: "5.131",

  // минимальный scope для подключения бота (лучше не просить лишнего)
  COMMUNITY_SCOPE: "messages,manage",

  // user token (чтобы прочитать список групп админа)
  USER_SCOPE: "groups",

  // UX
  CONNECT_REDIRECT_DELAY_MS: 900,

  // таймауты
  TIMEOUT: {
    BRIDGE: 12000,
    API: 14000,
  },

  DEBUG: false,
};
