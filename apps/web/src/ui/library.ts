import { stars } from "../format.js";
import { artBox } from "./art.js";
import { cardEl } from "./card.js";
import type { Ctx } from "./ctx.js";
import { h, mount } from "./dom.js";

/** Browse everything in the content: handy while playtesting and balancing. */
export function renderLibrary(root: HTMLElement, ctx: Ctx): void {
  const { ix } = ctx;
  let faction = "";
  let rank = 0;
  let query = "";
  let tab: "cards" | "heroes" | "relics" = "cards";

  const draw = (): void => {
    const list = h("div", { class: "library-grid" });

    if (tab === "cards") {
      const cards = [...ix.cards.values()]
        .filter((c) => (faction ? (faction === "_neutral" ? c.factions.length === 0 : c.factions.includes(faction)) : true))
        .filter((c) => (rank ? c.rank === rank : true))
        .filter((c) => (query ? `${c.name} ${c.text}`.toLowerCase().includes(query.toLowerCase()) : true))
        .sort((a, b) => Number(a.kind !== "UNIT" || a.token) - Number(b.kind !== "UNIT" || b.token) || a.rank - b.rank || a.name.localeCompare(b.name));
      for (const c of cards) {
        list.append(h("div", { class: "lib-item" }, cardEl(ix, { key: c.key }), (c.token || c.kind !== "UNIT") && h("div", { class: "muted tag", text: c.kind === "GEAR" ? "gear" : c.kind === "GIANT" ? "giant robo" : "token" })));
      }
      if (cards.length === 0) list.append(h("p", { class: "muted", text: "No cards match." }));
    } else if (tab === "heroes") {
      for (const hero of ix.heroes.values()) {
        list.append(h("div", { class: "info-card" }, artBox("hero-art", ix.heroArt(hero.key), hero.name), h("h3", { text: hero.name }), h("p", { text: hero.text || "No hero power." }), hero.armor > 0 && h("p", { class: "muted", text: `${hero.armor} armor` })));
      }
    } else {
      for (const r of ix.relics.values()) {
        list.append(
          h(
            "div",
            { class: "info-card" },
            artBox("relic-art", ix.relicArt(r.key), r.name),
            h("h3", { text: r.name }),
            h("p", { class: "muted", text: `${r.tier === "LESSER" ? "Lesser" : "Greater"} relic - ${r.cost} Energy${r.factions.length ? ` - ${r.factions.map(ix.factionName).join(", ")}` : ""}` }),
            h("p", { text: r.text }),
          ),
        );
      }
    }

    const tabButton = (id: typeof tab, label: string) => h("button", { class: `tab ${tab === id ? "active" : ""}`, text: label, on: { click: () => ((tab = id), draw()) } });
    const factionSelect = h(
      "select",
      { on: { change: (e) => ((faction = (e.target as HTMLSelectElement).value), draw()) } },
      h("option", { value: "", text: "All factions" }),
      ...[...ix.factions.values()].map((f) => h("option", { value: f.key, text: f.name, selected: faction === f.key })),
      h("option", { value: "_neutral", text: "Neutral", selected: faction === "_neutral" }),
    );
    const rankSelect = h(
      "select",
      { on: { change: (e) => ((rank = Number((e.target as HTMLSelectElement).value)), draw()) } },
      h("option", { value: "0", text: "All ranks" }),
      ...[1, 2, 3, 4, 5, 6].map((n) => h("option", { value: String(n), text: stars(n), selected: rank === n })),
    );
    const search = h("input", { type: "search", placeholder: "search name or text", value: query, on: { input: (e) => ((query = (e.target as HTMLInputElement).value), drawKeepFocus()) } });

    const drawKeepFocus = (): void => {
      draw();
      const box = root.querySelector<HTMLInputElement>("input[type=search]");
      box?.focus();
      box?.setSelectionRange(query.length, query.length);
    };

    mount(
      root,
      h(
        "div",
        { class: "library" },
        h("div", { class: "tabs" }, tabButton("cards", "Cards"), tabButton("heroes", "Heroes"), tabButton("relics", "Relics")),
        tab === "cards" && h("div", { class: "row filters" }, factionSelect, rankSelect, search),
        list,
      ),
    );
  };

  draw();
}
