// Turns src/**/*.ts into browser-ready ES modules in public/js. No bundler: every file is
// transpiled on its own (types stripped, imports kept as relative ES module imports).
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const out = join(root, "public", "js");

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) yield path;
  }
}

rmSync(out, { recursive: true, force: true });
let count = 0;
const problems = [];
for (const file of files(src)) {
  const result = ts.transpileModule(readFileSync(file, "utf8"), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, sourceMap: false },
  });
  for (const d of result.diagnostics ?? []) problems.push(`${relative(root, file)}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
  const target = join(out, relative(src, file).replace(/\.ts$/, ".js"));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, result.outputText);
  count++;
}
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`built ${count} files into ${relative(process.cwd(), out)}`);
