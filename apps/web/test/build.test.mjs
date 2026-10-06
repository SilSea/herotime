// Plain JS on purpose: this test uses Node APIs and the web package is type-checked without Node types.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const jsDir = join(root, "public", "js");

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (name.endsWith(".js")) yield p;
  }
}

const specifiers = (source) => [...source.matchAll(/(?:import|export)\s+(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/g)].map((m) => m[1]);

describe("the built browser bundle", () => {
  let files = [];

  beforeAll(() => {
    execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "pipe" });
    files = [...walk(jsDir)];
  }, 60_000);

  it("builds every source file", () => {
    const ts = [];
    const stack = [join(root, "src")];
    while (stack.length) {
      const d = stack.pop();
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) stack.push(p);
        else if (n.endsWith(".ts") && !n.endsWith(".d.ts")) ts.push(p);
      }
    }
    expect(files.length).toBe(ts.length);
    expect(files.length).toBeGreaterThan(10);
  });

  it("only imports relative files, because the browser has no way to resolve a package name", () => {
    for (const file of files) {
      for (const s of specifiers(readFileSync(file, "utf8"))) {
        expect(s.startsWith("./") || s.startsWith("../"), `${file}: ${s}`).toBe(true);
      }
    }
  });

  it("every import points at a file that exists", () => {
    for (const file of files) {
      for (const s of specifiers(readFileSync(file, "utf8"))) {
        expect(existsSync(resolve(dirname(file), s)), `${file} imports ${s}`).toBe(true);
      }
    }
  });

  it("keeps no TypeScript syntax behind", () => {
    for (const file of files) {
      const code = readFileSync(file, "utf8");
      expect(code, file).not.toMatch(/\bimport type\b|:\s*(string|number|boolean)\b\s*[,)=]|\binterface\s+\w+\s*\{/);
    }
  });

  it("only app.js reaches for the global socket.io client", () => {
    const users = files.filter((f) => /\bio\(\{/.test(readFileSync(f, "utf8")));
    expect(users.map((f) => f.replace(jsDir, "").replace(/\\/g, "/"))).toEqual(["/app.js"]);
  });

  it("the page loads the files that exist", () => {
    const html = readFileSync(join(root, "public", "index.html"), "utf8");
    expect(html).toContain('src="/js/main.js"');
    expect(html).toContain('href="/styles.css"');
    expect(html).toContain('src="/socket.io/socket.io.js"');
    expect(existsSync(join(jsDir, "main.js"))).toBe(true);
    expect(existsSync(join(root, "public", "styles.css"))).toBe(true);
    for (const id of ["app", "replay-host", "toasts"]) expect(html).toContain(`id="${id}"`);
  });

  it("every CSS class the UI relies on is styled", () => {
    const css = readFileSync(join(root, "public", "styles.css"), "utf8");
    const used = new Set();
    for (const file of files) {
      for (const m of readFileSync(file, "utf8").matchAll(/class:\s*"([^"$]+)"/g)) m[1].split(/\s+/).forEach((c) => c && used.add(c));
    }
    // classes that exist only as hooks or state flags need no rule of their own
    const hooks = new Set(["spacer", "pname", "pmeta", "gname", "gnum", "tag", "you", "on", "primary", "big", "full", "picked", "locked", "unaffordable", "small", "muted", "win", "loss", "draw", "gear-label", "bad", "me", "dead", "opponent", "mine", "theirs", "hero-options", "factions", "phase", "top-actions", "slot-actions", "energy-num", "end-drop", "active"]);
    const missing = [...used].filter((c) => !hooks.has(c) && !new RegExp(`\\.${c.replace(/[-]/g, "\\-")}\\b`).test(css));
    expect(missing).toEqual([]);
  });
});
