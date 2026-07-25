/**
 * Backend endpoints for the AI Digital Wardrobe.
 *
 * These hit the app's existing Express backend (`API_BASE_URL`, see
 * src/config/api.ts) — specifically the Milestone-2 AI/weather proxy, which
 * holds the OpenAI / remove.bg / OpenWeather keys server-side so they are never
 * bundled into the app. Wardrobe DATA (clothes, outfits, planner, trips) stays
 * in Firestore via fitsDbService — only AI + weather go through the proxy.
 */
export const FitsEndpoints = {
  ai: {
    detect:   '/ai/detect',
    removeBg: '/ai/remove-bg',
    suggest:  '/ai/suggest',
    ootd:     '/ai/ootd',
  },
  weather: {
    current:  '/weather/current',
    forecast: '/weather/forecast',
  },
} as const;
