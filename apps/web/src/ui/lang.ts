import { lang, setLang, tr, type Lang } from "../i18n.js";
import { isMuted, play, setMuted } from "../sound.js";
import type { Store } from "../store.js";
import { h } from "./dom.js";

/** Sound on / off, remembered on this device. */
export function muteToggle(store: Store): HTMLElement {
  return h("button", {
    class: `sound-btn ${isMuted() ? "off" : ""}`,
    title: isMuted() ? tr("Sound is off", "ปิดเสียงอยู่") : tr("Sound is on", "เปิดเสียงอยู่"),
    text: isMuted() ? "🔇" : "🔊",
    on: {
      click: () => {
        setMuted(!isMuted());
        if (!isMuted()) play("buy");
        store.set({});
      },
    },
  });
}

/** TH / EN switch: remembered on this device; setting it in the store redraws every screen at once. */
export function langToggle(store: Store): HTMLElement {
  return h(
    "div",
    { class: "lang-toggle", title: tr("Language", "ภาษา") },
    ...(["th", "en"] as const).map((l: Lang) =>
      h("button", {
        class: `lang-btn ${lang() === l ? "active" : ""}`,
        text: l.toUpperCase(),
        on: {
          click: () => {
            setLang(l);
            store.set({ lang: l });
          },
        },
      }),
    ),
  );
}
