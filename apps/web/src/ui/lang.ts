import { lang, setLang, tr, type Lang } from "../i18n.js";
import type { Store } from "../store.js";
import { h } from "./dom.js";

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
