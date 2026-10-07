import type { Api } from "../net.js";
import type { AuthResult } from "../protocol.js";
import { lang, setLang, tr } from "../i18n.js";
import { h, mount } from "./dom.js";

/** Login / register. `onDone` gets the token once the server accepts it. */
export function renderAuth(root: HTMLElement, api: Api, onDone: (r: AuthResult) => Promise<void>, startMode: "login" | "register" = "login"): void {
  let mode = startMode;

  const draw = (error = ""): void => {
    const username = h("input", { type: "text", placeholder: tr("username", "ชื่อผู้ใช้"), attrs: { autocomplete: "username", maxlength: "20" } });
    const email = h("input", { type: "email", placeholder: tr("email", "อีเมล"), attrs: { autocomplete: "email" } });
    const password = h("input", { type: "password", placeholder: tr("password (8+ characters)", "รหัสผ่าน (8 ตัวขึ้นไป)"), attrs: { autocomplete: mode === "login" ? "current-password" : "new-password" } });
    const status = h("div", { class: "form-error", text: error });
    const submit = h("button", { class: "btn primary", type: "submit", text: mode === "login" ? tr("Log in", "เข้าสู่ระบบ") : tr("Create account", "สร้างบัญชี") });

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
                status.textContent = err instanceof Error ? err.message : tr("something went wrong", "เกิดข้อผิดพลาด");
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
        h("p", { class: "tagline", text: tr("Rider x Sentai auto-battler", "เกม auto-battler Rider x Sentai") }),
        h("div", { class: "lang-toggle" }, ...(["th", "en"] as const).map((l) => h("button", { class: `lang-btn ${lang() === l ? "active" : ""}`, type: "button", text: l.toUpperCase(), on: { click: () => ((setLang(l), draw())) } }))),
        h(
          "div",
          { class: "tabs" },
          h("button", { class: `tab ${mode === "login" ? "active" : ""}`, text: tr("Log in", "เข้าสู่ระบบ"), on: { click: () => ((mode = "login"), draw()) } }),
          h("button", { class: `tab ${mode === "register" ? "active" : ""}`, text: tr("Register", "สมัคร"), on: { click: () => ((mode = "register"), draw()) } }),
        ),
        form,
      ),
    );
    username.focus();
  };

  draw();
}
