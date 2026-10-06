export type Child = Node | string | number | false | null | undefined;

type Handlers = { [K in keyof HTMLElementEventMap]?: (e: HTMLElementEventMap[K]) => void };

export interface Props {
  class?: string;
  id?: string;
  text?: string;
  title?: string;
  style?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  checked?: boolean;
  selected?: boolean;
  disabled?: boolean;
  draggable?: boolean;
  data?: Record<string, string>;
  attrs?: Record<string, string>;
  on?: Handlers;
}

/** Create an element: `h("button", { class: "btn", on: { click } }, "Buy")`. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    if (props.class) el.className = props.class;
    if (props.id) el.id = props.id;
    if (props.text !== undefined) el.textContent = props.text;
    if (props.title) el.title = props.title;
    if (props.style) el.setAttribute("style", props.style);
    const input = el as unknown as HTMLInputElement & HTMLOptionElement;
    if (props.type) (el as unknown as HTMLInputElement).type = props.type;
    if (props.value !== undefined) input.value = props.value;
    if (props.placeholder) input.placeholder = props.placeholder;
    if (props.checked !== undefined) input.checked = props.checked;
    if (props.selected !== undefined) input.selected = props.selected;
    if (props.disabled) input.disabled = true;
    if (props.draggable) el.draggable = true;
    for (const [k, v] of Object.entries(props.data ?? {})) el.dataset[k] = v;
    for (const [k, v] of Object.entries(props.attrs ?? {})) el.setAttribute(k, v);
    for (const [name, fn] of Object.entries(props.on ?? {})) el.addEventListener(name, fn as EventListener);
  }
  append(el, children);
  return el;
}

export function append(el: Node, children: readonly Child[]): void {
  for (const c of children) {
    if (c === false || c === null || c === undefined) continue;
    el.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
  }
}

/** Replace everything inside `el`. */
export function mount(el: Element, ...children: Child[]): void {
  el.replaceChildren();
  append(el, children);
}
