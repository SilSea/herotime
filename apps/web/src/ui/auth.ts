import type { Api } from "../net.js";
import type { AuthResult } from "../protocol.js";
import { h, mount } from "./dom.js";

/** Login / register. `onDone` gets the token once the server accepts it. */
export function renderAuth(root: HTMLElement, api: Api, onDone: (r: AuthResult) => Promise<void>, startMode: "login" | "register" = "login"): void {
  let mode = startMode;

  const draw = (error = ""): void => {
    const username = h("input", { type: "text", placeholder: "username", attrs: { autocomplete: "username", maxlength: "20" } });
    const email = h("input", { type: "email", placeholder: "email", attrs: { autocomplete: "email" } });
    const password = h("input", { type: "password", placeholder: "password (8+ characters)", attrs: { autocomplete: mode === "login" ? "current-password" : "new-password" } });
    const status = h("div", { class: "form-error", text: error });
    const submit = h("button", { class: "btn primary", type: "submit", text: mode === "login" ? "Log in" : "Create account" });

    const form = h(
      "form",
      {
        class: "auth-form",
        on: {
          submit: (e) => {
            e.preventDefault();
            submit.disabled = true;
            status.textContent = "";
            const run = mode === "login" ? api.login(username.value.trim(), password.value) : api.register(username.value.trim(), email.value.trim(), password.value);
            run
              .then((r) => onDone(r))
              .catch((err: unknown) => {
                submit.disabled = false;
                status.textContent = err instanceof Error ? err.message : "something went wrong";
              });
          },
        },
      },
      username,
      mode === "register" && email,
      password,
      status,
      submit,
    );

    mount(
      root,
      h(
        "div",
        { class: "auth-screen" },
        h("h1", { class: "logo", text: "HeroTime" }),
        h("p", { class: "tagline", text: "Rider x Sentai auto-battler - prototype" }),
        h(
          "div",
          { class: "tabs" },
          h("button", { class: `tab ${mode === "login" ? "active" : ""}`, text: "Log in", on: { click: () => ((mode = "login"), draw()) } }),
          h("button", { class: `tab ${mode === "register" ? "active" : ""}`, text: "Register", on: { click: () => ((mode = "register"), draw()) } }),
        ),
        form,
      ),
    );
    username.focus();
  };

  draw();
}
