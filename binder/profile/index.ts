import type { Folio } from "../src/profile/folio";
import { profileZh } from "./zh";

/*
 * Your page's content: this folder and the pictures in public/photos are all you need to change (README, "Make it yours").
 * The demo is one persona in two languages: English (en.ts, in the entry chunk) and Simplified Chinese (zh.ts, its own chunk,
 * fetched the first time a visitor picks 中文 or arrives with ?lang=zh). One language only: export
 * `{ primary: "en", profiles: { en: profile } }` and delete zh.ts; the page then shows no language switch.
 */
/* 纸桌 2026-11-02: one language, Chinese (the page shows no language switch). The persona's English profile stays in en.ts. */
export const folio: Folio = {
  primary: "zh",
  profiles: {
    zh: profileZh,
  },
};
