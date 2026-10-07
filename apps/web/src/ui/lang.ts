import { lang, setLang, tr, type Lang } from "../i18n.js";
import { isMuted, play, setMuted, setVolumes, volumes } from "../sound.js";
import type { Store } from "../store.js";
import { h } from "./dom.js";

let open = false;

/** Sound button: mute on click; the arrow opens volumes for effects and music. All remembered on this device. */
export function muteToggle(store: Store): HTMLElement {
  const v = volumes();
  const slider = (label: string, value: number, set: (n: number) => void): HTMLElement => {
    const input = h("input", { type: "range", value: String(Math.round(value * 100)), attrs: { min: "0", max: "100" } }) as HTMLInputElement;
    input.addEventListener("input", () => set(Number(input.value) / 100));
    input.addEventListener("change", () => play("buy"));
    return h("label", { class: "sound-row" }, h("span", { text: label }), input);
  };
  return h(
    "div",
    { class: "sound-ctl" },
    h("button", {
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
    }),
    h("button", { class: "sound-btn sound-more", text: open ? "▴" : "▾", title: tr("Volume", "ความดัง"), on: { click: () => ((open = !open), store.set({})) } }),
    open &&
      h(
        "div",
        { class: "sound-panel" },
        slider(tr("Effects", "เสียงเอฟเฟค"), v.sfx, (n) => setVolumes({ sfx: n })),
        slider(tr("Music", "เพลง"), v.music, (n) => setVolumes({ music: n })),
      ),
  );
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
