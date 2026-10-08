import { tr } from "../i18n.js";
import { NO_CROP, type ArtCrop } from "./art.js";
import { h } from "./dom.js";

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
const round = (c: ArtCrop): ArtCrop => ({ x: Math.round(c.x), y: Math.round(c.y), zoom: Math.round(c.zoom * 100) / 100 });
const same = (a: ArtCrop, b: ArtCrop): boolean => a.x === b.x && a.y === b.y && a.zoom === b.zoom;

/** Show a framing on every picture of this card on the page without redrawing anything. */
function paint(root: ParentNode, c: ArtCrop): void {
  for (const img of root.querySelectorAll<HTMLElement>(".card .art .art-img")) {
    img.style.backgroundPosition = `${c.x}% ${c.y}%`;
    img.style.transformOrigin = `${c.x}% ${c.y}%`;
    img.style.transform = `scale(${c.zoom})`;
  }
}

/**
 * Framing controls for a card picture. `scope` holds the preview cards: their big picture can be dragged to
 * move it and scrolled to zoom, and every picture in `scope` follows live. `save` gets the result once a
 * gesture ends (undefined = the default framing), so the editor can store it and redraw.
 */
export function artCropTools(scope: HTMLElement, crop: ArtCrop | undefined, save: (c: ArtCrop | undefined) => void): HTMLElement {
  let c: ArtCrop = { ...NO_CROP, ...crop };
  const commit = (): void => save(same(round(c), NO_CROP) ? undefined : round(c));
  const show = (): void => {
    paint(scope, c);
    vals.x.textContent = `${Math.round(c.x)}%`;
    vals.y.textContent = `${Math.round(c.y)}%`;
    vals.zoom.textContent = `${c.zoom.toFixed(2)}×`;
    sliders.x.value = String(c.x);
    sliders.y.value = String(c.y);
    sliders.zoom.value = String(c.zoom);
  };

  const slider = (min: number, max: number, step: number, value: number, set: (v: number) => void): HTMLInputElement => {
    const el = h("input", { type: "range", attrs: { min: String(min), max: String(max), step: String(step) }, value: String(value) }) as HTMLInputElement;
    el.addEventListener("input", () => (set(el.valueAsNumber), show()));
    el.addEventListener("change", commit);
    return el;
  };
  // A picture fills the frame ("cover"): along the side where it fits exactly there is nothing to move until it is
  // zoomed in. Moving along such a side zooms in a little by itself, so the move shows.
  const fits = { x: false, y: false };
  const roomFor = (axis: "x" | "y"): void => {
    if (fits[axis] && c.zoom < 1.2) c.zoom = 1.3;
  };
  const sliders = {
    x: slider(0, 100, 1, c.x, (v) => ((c.x = v), roomFor("x"))),
    y: slider(0, 100, 1, c.y, (v) => ((c.y = v), roomFor("y"))),
    zoom: slider(1, 4, 0.05, c.zoom, (v) => (c.zoom = v)),
  };
  const vals = { x: h("span", { class: "crop-val" }), y: h("span", { class: "crop-val" }), zoom: h("span", { class: "crop-val" }) };
  const hint = h("p", { class: "muted small crop-row" });
  hint.hidden = true;

  // The big preview picture: drag to move, scroll to zoom.
  const frame = scope.querySelector<HTMLElement>(".card .art");
  const pic = frame?.querySelector<HTMLElement>(".art-img");
  if (frame && pic) {
    // Which side the picture fits exactly: compare its shape with the frame's.
    const url = /url\("?(.*?)"?\)/.exec(pic.style.backgroundImage)?.[1];
    if (url) {
      const img = new Image();
      img.onload = () => {
        const box = frame.getBoundingClientRect();
        if (!img.naturalWidth || !box.height) return;
        const wider = img.naturalWidth / img.naturalHeight > box.width / box.height;
        fits.y = wider; // a wide picture fills the height exactly
        fits.x = !wider;
        hint.textContent = wider
          ? tr("A wide picture: it moves up/down only when zoomed in (moving it that way zooms in a little by itself).", "ภาพแนวกว้าง: เลื่อนขึ้น/ลงได้เมื่อซูมเข้า (เลื่อนแนวนี้แล้วระบบซูมให้นิดหน่อยเอง)")
          : tr("A tall picture: it moves left/right only when zoomed in (moving it that way zooms in a little by itself).", "ภาพแนวสูง: เลื่อนซ้าย/ขวาได้เมื่อซูมเข้า (เลื่อนแนวนี้แล้วระบบซูมให้นิดหน่อยเอง)");
        hint.hidden = false;
      };
      img.src = url;
    }
    frame.classList.add("adjustable");
    frame.title = tr("Drag to move the picture, scroll to zoom", "ลากเพื่อเลื่อนภาพ, scroll เพื่อซูม");
    frame.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      frame.setPointerCapture(e.pointerId);
      const start = { px: e.clientX, py: e.clientY, x: c.x, y: c.y };
      const box = frame.getBoundingClientRect();
      const move = (ev: PointerEvent): void => {
        // Dragging the picture right shows more of its left side; zoomed in, the same drag moves it less.
        c.x = clamp(start.x - ((ev.clientX - start.px) / box.width) * 60 / c.zoom, 0, 100);
        c.y = clamp(start.y - ((ev.clientY - start.py) / box.height) * 60 / c.zoom, 0, 100);
        if (Math.abs(ev.clientY - start.py) > 6) roomFor("y");
        if (Math.abs(ev.clientX - start.px) > 6) roomFor("x");
        show();
      };
      const up = (): void => {
        frame.removeEventListener("pointermove", move);
        frame.removeEventListener("pointerup", up);
        frame.removeEventListener("pointercancel", up);
        commit();
      };
      frame.addEventListener("pointermove", move);
      frame.addEventListener("pointerup", up);
      frame.addEventListener("pointercancel", up);
    });
    let wheelTimer: number | undefined;
    frame.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        c.zoom = clamp(c.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), 1, 4);
        show();
        // Save once the scrolling stops, not on every notch.
        window.clearTimeout(wheelTimer);
        wheelTimer = window.setTimeout(commit, 350);
      },
      { passive: false },
    );
  }

  const tools = h(
    "div",
    { class: "crop-tools" },
    h("div", { class: "crop-row" }, h("strong", { text: tr("Picture framing", "ปรับภาพในการ์ด") }), h("button", { class: "mini", type: "button", text: tr("Reset", "รีเซ็ต"), on: { click: () => ((c = { ...NO_CROP }), show(), commit()) } })),
    h("span", { text: tr("Left/right", "ซ้าย/ขวา") }), sliders.x, vals.x,
    h("span", { text: tr("Up/down", "บน/ล่าง") }), sliders.y, vals.y,
    h("span", { text: tr("Zoom", "ซูม") }), sliders.zoom, vals.zoom,
    h("p", { class: "muted small crop-row", text: tr("Or drag the picture on the big card, and scroll on it to zoom.", "หรือลากภาพบนการ์ดใบใหญ่ และ scroll บนภาพเพื่อซูม") }),
    hint,
  );
  show();
  return tools;
}
