import type { Field, RefKind, Row } from "./admin-schema.js";
import { h } from "./dom.js";

/** What the form needs from the screen around it. */
export interface FormEnv {
  /** Keys that exist, for suggestions and the "unknown key" warning. */
  refs(kind: RefKind): readonly string[];
  /** Something was edited. */
  changed(): void;
  /** Upload an image and return the file name to store (absent when uploads are not available). */
  upload?(file: File): Promise<string>;
}

/** A starting value for a field that has just been switched on or added. */
export function defaultFor(field: Field): unknown {
  switch (field.kind) {
    case "text":
    case "ref":
      return "";
    case "int":
      return field.min ?? 0;
    case "num":
      return 0;
    case "bool":
      return false;
    case "enum":
      return field.options[0];
    case "tags":
      return [];
    case "list":
      return Array.from({ length: field.min ?? 0 }, () => field.make());
    case "object":
      return field.make ? field.make() : rowsDefault(field.rows);
    case "union":
      return field.make(Object.keys(field.variants)[0] as string);
  }
}

/** Every non-optional row filled with its default. */
export function rowsDefault(rows: Row[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const r of rows) if (!r.optional) out[r.key] = defaultFor(r.field);
  return out;
}

/** The inputs for one object, edited in place. */
export function renderRows(rows: Row[], obj: Record<string, unknown>, env: FormEnv): HTMLElement {
  const wrap = h("div", { class: "form-rows" });
  for (const row of rows) wrap.append(renderRow(row, obj, env));
  return wrap;
}

function renderRow(row: Row, obj: Record<string, unknown>, env: FormEnv): HTMLElement {
  const holder = h("div", { class: "frow-body" });
  const present = (): boolean => obj[row.key] !== undefined;
  const draw = (): void => {
    holder.replaceChildren();
    if (row.optional && !present()) return;
    if (obj[row.key] === undefined) obj[row.key] = defaultFor(row.field); // old data may lack a field the form shows
    holder.append(
      renderField(row.field, obj[row.key], (v) => {
        obj[row.key] = v;
        env.changed();
      }, env),
    );
  };

  let toggle: HTMLInputElement | undefined;
  if (row.optional) {
    toggle = h("input", { type: "checkbox", checked: present(), title: "Use this field" });
    toggle.addEventListener("change", () => {
      if (toggle?.checked) obj[row.key] = defaultFor(row.field);
      else delete obj[row.key];
      draw();
      env.changed();
    });
  }
  draw();
  return h("div", { class: `frow ${row.field.kind === "list" || row.field.kind === "object" || row.field.kind === "union" ? "frow-block" : ""}` }, h("label", { class: "flabel", title: row.hint ?? "" }, toggle, row.label ?? row.key), holder, row.hint && h("div", { class: "fhint", text: row.hint }));
}

/** One input (or a small group of them) for `value`. `set` stores a replaced value; objects and lists are edited in place. */
export function renderField(field: Field, value: unknown, set: (v: unknown) => void, env: FormEnv): HTMLElement {
  switch (field.kind) {
    case "text": {
      const el = field.area ? h("textarea", { value: String(value ?? ""), attrs: { rows: "3" } }) : h("input", { type: "text", value: String(value ?? ""), ...(field.placeholder ? { placeholder: field.placeholder } : {}) });
      el.addEventListener("input", () => set(el.value));
      if (field.upload && env.upload) {
        const pick = h("input", { type: "file", attrs: { accept: field.audio ? "audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav" : "image/png,image/jpeg,image/gif,image/webp" } });
        pick.addEventListener("change", () => {
          const file = pick.files?.[0];
          if (!file) return;
          void env.upload?.(file).then((name) => {
            el.value = name;
            set(name);
          }, () => undefined); // the screen already told the user why it failed
        });
        return h("div", { class: "upload-row" }, el, pick);
      }
      return el;
    }
    case "int":
    case "num": {
      const el = h("input", { type: "number", value: String(value ?? 0), attrs: field.kind === "int" ? { step: "1", ...(field.min !== undefined ? { min: String(field.min) } : {}), ...(field.max !== undefined ? { max: String(field.max) } : {}) } : { step: "any" } });
      el.addEventListener("input", () => {
        const n = el.valueAsNumber;
        if (Number.isFinite(n)) set(field.kind === "int" ? Math.trunc(n) : n);
      });
      return el;
    }
    case "bool": {
      const el = h("input", { type: "checkbox", checked: value === true });
      el.addEventListener("change", () => set(el.checked));
      return el;
    }
    case "enum": {
      const el = h("select", null, ...field.options.map((o) => h("option", { value: o, text: o, selected: o === value })));
      if (typeof value === "string" && !field.options.includes(value)) el.prepend(h("option", { value, text: `${value} (unknown)`, selected: true }));
      el.addEventListener("change", () => set(el.value));
      return el;
    }
    case "ref": {
      // Type a key or part of a name: the list (a datalist labelled with names) narrows as you type.
      const el = h("input", { type: "search", value: String(value ?? ""), placeholder: "type to search…", attrs: { list: `dl-${field.to}` } });
      const label = (k: string): string => document.querySelector<HTMLOptionElement>(`#dl-${field.to} option[value="${CSS.escape(k)}"]`)?.textContent ?? "";
      const shown = h("span", { class: "muted small ref-name" });
      const check = (): void => {
        const ok = el.value === "" || env.refs(field.to).includes(el.value);
        el.classList.toggle("bad", !ok);
        shown.textContent = ok && el.value ? label(el.value) : el.value ? "not found" : "";
      };
      el.addEventListener("input", () => {
        set(el.value);
        check();
      });
      queueMicrotask(check);
      return h("span", { class: "ref-field" }, el, shown);
    }
    case "tags": {
      const chosen = Array.isArray(value) ? ([...value] as string[]) : [];
      const options = [...(field.options ?? (field.to ? env.refs(field.to) : []))];
      const extra = chosen.filter((c) => !options.includes(c));
      const wrap = h("div", { class: "tags" });
      for (const o of [...options, ...extra]) {
        const box = h("input", { type: "checkbox", checked: chosen.includes(o) });
        box.addEventListener("change", () => {
          const i = chosen.indexOf(o);
          if (box.checked && i < 0) chosen.push(o);
          if (!box.checked && i >= 0) chosen.splice(i, 1);
          set([...chosen]);
        });
        wrap.append(h("label", { class: `tag-pick ${extra.includes(o) ? "bad" : ""}`, title: extra.includes(o) ? "No such key" : "" }, box, o));
      }
      if (options.length + extra.length === 0) wrap.append(h("span", { class: "muted", text: "(none defined yet)" }));
      return wrap;
    }
    case "list": {
      const arr = Array.isArray(value) ? (value as unknown[]) : [];
      if (!Array.isArray(value)) set(arr);
      const body = h("div", { class: "flist" });
      const draw = (): void => {
        body.replaceChildren();
        arr.forEach((item, i) => {
          const head = h(
            "div",
            { class: "fitem-head" },
            h("strong", { text: `${i + 1}. ${field.title?.(item, i) ?? ""}` }),
            h("span", { class: "spacer" }),
            h("button", { class: "mini", text: "↑", title: "Move up", disabled: i === 0, on: { click: () => move(i, -1) } }),
            h("button", { class: "mini", text: "↓", title: "Move down", disabled: i === arr.length - 1, on: { click: () => move(i, 1) } }),
            h("button", { class: "mini", text: "✕", title: "Remove", disabled: arr.length <= (field.min ?? 0), on: { click: () => remove(i) } }),
          );
          body.append(h("div", { class: "fitem" }, head, renderField(field.of, item, (v) => { arr[i] = v; env.changed(); }, env)));
        });
        body.append(h("button", { class: "mini add", text: "+ Add", on: { click: () => { arr.push(field.make()); draw(); env.changed(); } } }));
      };
      const move = (i: number, d: number): void => {
        const [it] = arr.splice(i, 1);
        arr.splice(i + d, 0, it);
        draw();
        env.changed();
      };
      const remove = (i: number): void => {
        arr.splice(i, 1);
        draw();
        env.changed();
      };
      draw();
      return body;
    }
    case "object": {
      let obj = value as Record<string, unknown> | undefined;
      if (typeof obj !== "object" || obj === null) {
        obj = defaultFor(field) as Record<string, unknown>;
        set(obj);
      }
      return renderRows(field.rows, obj, env);
    }
    case "union": {
      let obj = value as Record<string, unknown> | undefined;
      if (typeof obj !== "object" || obj === null) {
        obj = defaultFor(field) as Record<string, unknown>;
        set(obj);
      }
      const tags = Object.keys(field.variants);
      const body = h("div", { class: "funion-body" });
      let current = obj;
      const draw = (): void => {
        const rows = field.variants[String(current[field.tag])] ?? [];
        body.replaceChildren(renderRows(rows, current, env));
      };
      const select = h("select", null, ...tags.map((t) => h("option", { value: t, text: t, selected: t === current[field.tag] })));
      if (typeof current[field.tag] === "string" && !tags.includes(current[field.tag] as string)) select.prepend(h("option", { value: String(current[field.tag]), text: `${String(current[field.tag])} (unknown)`, selected: true }));
      select.addEventListener("change", () => {
        current = field.make(select.value);
        set(current);
        draw();
      });
      draw();
      return h("div", { class: "funion" }, select, body);
    }
  }
}
