import { h } from "./dom.js";

/** A CSS background for an image URL. JSON quoting keeps a quote or bracket in the URL from ending the value. */
export const bg = (url: string | undefined): string => (url ? `background-image:url(${JSON.stringify(url)})` : "");

/** First letters of up to two words: the placeholder when there is no picture. */
export function initialsOf(name: string): string {
  const words = name.split(/[\s_-]+/).filter(Boolean);
  return ((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase();
}

/** A box showing the picture, or the initials when there is none. `cls` sizes and shapes it. */
export function artBox(cls: string, url: string | undefined, name: string): HTMLElement {
  return h("div", { class: `${cls} ${url ? "has-art" : ""}`, style: bg(url) }, url ? null : h("span", { class: "art-initials", text: initialsOf(name) }));
}
