import { h } from "./dom.js";

/** A CSS background for an image URL. JSON quoting keeps a quote or bracket in the URL from ending the value. */
export const bg = (url: string | undefined): string => (url ? `background-image:url(${JSON.stringify(url)})` : "");

/** Where a card picture sits in its frame: the point kept in view (0-100 %) and the zoom (1 = fill). */
export interface ArtCrop {
  x: number;
  y: number;
  zoom: number;
}

export const NO_CROP: ArtCrop = { x: 50, y: 50, zoom: 1 };

/**
 * The style of a card picture laid over its frame. Zooming scales around the chosen point, so that point stays
 * where it is while the rest grows past the frame's edges.
 */
export function artStyle(url: string, crop: ArtCrop | undefined): string {
  const c = crop ?? NO_CROP;
  return `${bg(url)};background-position:${c.x}% ${c.y}%;transform-origin:${c.x}% ${c.y}%;transform:scale(${c.zoom})`;
}

/** First letters of up to two words: the placeholder when there is no picture. */
export function initialsOf(name: string): string {
  const words = name.split(/[\s_-]+/).filter(Boolean);
  return ((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase();
}

/**
 * A framed picture filling its parent (give the parent the "art-frame" class): the clip follows the parent's
 * rounded corners, so badges on the parent can still stick out past its edge.
 */
export function artLayer(url: string, crop: ArtCrop | undefined): HTMLElement {
  return h("div", { class: "art-clip" }, h("div", { class: "art-img", style: artStyle(url, crop) }));
}

/** A box showing the picture, or the initials when there is none. `cls` sizes and shapes it. */
export function artBox(cls: string, url: string | undefined, name: string, crop?: ArtCrop): HTMLElement {
  return h("div", { class: `${cls} ${url ? "has-art art-frame" : ""}` }, url ? artLayer(url, crop) : h("span", { class: "art-initials", text: initialsOf(name) }));
}
