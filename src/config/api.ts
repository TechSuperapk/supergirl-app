// Base URL for the Journal-module Express+MongoDB backend (server/ folder).
//
// Set EXPO_PUBLIC_API_BASE_URL in a `.env` file at the project root (Expo
// SDK auto-inlines any env var prefixed EXPO_PUBLIC_ at build time) to point
// at your running backend, e.g.:
//   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:4000/api
// (use your computer's LAN IP, not localhost, when testing on a physical
// device/Expo Go — the phone can't reach the dev machine's "localhost").
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';
