/**
 * Aiming a gear at a unit: a line from the card to the pointer, ending in a reticle that locks on when it is
 * over a unit the gear can go on. Shown while a targeted gear is dragged from the hand, or while one waits
 * for a click (never while buying). Purely visual: the drop / click handlers decide what happens.
 */

const SVG = "http://www.w3.org/2000/svg";
let layer: SVGSVGElement | undefined;
let from = { x: 0, y: 0 };
let valid: (number | "GIANT")[] = [];
let stop: (() => void) | undefined;
let mode: "drag" | "click" | undefined;
/** Where the pointer was last seen, so a redrawn click-aim starts where the player is pointing. */
let last: { x: number; y: number } | undefined;

/** An invisible drag image, so the reticle (not a copy of the card) follows the pointer. */
let blank: HTMLCanvasElement | undefined;
export function hideDragImage(e: DragEvent): void {
  blank ??= Object.assign(document.createElement("canvas"), { width: 1, height: 1 });
  e.dataTransfer?.setDragImage(blank, 0, 0);
}

const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string> = {}): SVGElementTagNameMap[K] => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

const boardSlots = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(".board-cards > .slot")];
/** Everything a gear can be aimed at: the board slots by index, and the Giant Robo as "GIANT". */
const aimTargets = (): [number | "GIANT", HTMLElement][] => {
  const out: [number | "GIANT", HTMLElement][] = boardSlots().map((s, i) => [i, s]);
  const giant = document.querySelector<HTMLElement>(".giant-slot > .giant-target");
  if (giant) out.push(["GIANT", giant]);
  return out;
};

/** The target under a point, by position (works during a drag, when the event target may be the overlay). */
function slotAt(x: number, y: number): number | "GIANT" | undefined {
  return aimTargets().find(([, s]) => {
    const r = s.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  })?.[0];
}

function draw(x: number, y: number): void {
  if (!layer) return;
  // The board went away (another screen, the match ended): nothing to aim at.
  if (!document.querySelector(".board-cards")) return stopAim();
  const over = slotAt(x, y);
  const locked = over !== undefined && valid.includes(over);
  // Lock onto the middle of a valid unit; otherwise follow the pointer.
  let tx = x;
  let ty = y;
  if (locked) {
    const r = (aimTargets().find(([k]) => k === over)?.[1] as HTMLElement).getBoundingClientRect();
    tx = r.left + r.width / 2;
    ty = r.top + r.height / 2;
  }
  // A gentle arc from the card up to the target.
  const mx = (from.x + tx) / 2;
  const my = Math.min(from.y, ty) - Math.abs(tx - from.x) * 0.25 - 30;
  layer.querySelector(".aim-path")?.setAttribute("d", `M ${from.x} ${from.y} Q ${mx} ${my} ${tx} ${ty}`);
  layer.querySelector(".aim-reticle")?.setAttribute("transform", `translate(${tx} ${ty})`);
  layer.classList.toggle("locked", locked);
  for (const [k, s] of aimTargets()) s.classList.toggle("aim-hot", locked && k === over);
}

/** Start aiming from `source` (the gear card) at the board slots in `targets`. */
export function startAim(source: HTMLElement, targets: (number | "GIANT")[], how: "drag" | "click"): void {
  stopAim();
  valid = targets;
  const r = source.getBoundingClientRect();
  from = { x: r.left + r.width / 2, y: r.top + r.height * 0.3 };
  layer = svg("svg", { class: "aim-layer" });
  const ret = svg("g", { class: "aim-reticle" });
  ret.append(svg("circle", { r: "22" }), svg("circle", { r: "6", class: "aim-dot" }), svg("path", { d: "M -34 0 H -14 M 14 0 H 34 M 0 -34 V -14 M 0 14 V 34" }));
  layer.append(svg("path", { class: "aim-path" }), ret);
  document.body.append(layer);
  for (const [k, s] of aimTargets()) s.classList.add(targets.includes(k) ? "aim-ok" : "aim-no");
  document.body.classList.add("aiming");
  mode = how;
  if (how === "click" && last) draw(last.x, last.y);
  else draw(from.x, from.y - 60);

  const move = (e: MouseEvent): void => {
    // Some browsers report 0,0 for the last dragover; ignore it.
    if (e.clientX === 0 && e.clientY === 0) return;
    last = { x: e.clientX, y: e.clientY };
    draw(e.clientX, e.clientY);
  };
  const ev = how === "drag" ? "dragover" : "mousemove";
  document.addEventListener(ev, move as EventListener, true);
  stop = () => document.removeEventListener(ev, move as EventListener, true);
}

export function stopAim(): void {
  mode = undefined;
  stop?.();
  stop = undefined;
  layer?.remove();
  layer = undefined;
  document.body.classList.remove("aiming");
  for (const [, s] of aimTargets()) s.classList.remove("aim-ok", "aim-no", "aim-hot");
}

/** How the current aim was started, if one is on screen. */
export const aimMode = (): "drag" | "click" | undefined => mode;
