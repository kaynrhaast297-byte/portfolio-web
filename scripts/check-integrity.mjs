import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateProjects } from "./generate-projects.mjs";

const root = new URL("../", import.meta.url);
const files = ["index.html", "projetos/devcheck.html", "projetos/cnc-copilot.html", "evidencias/devcheck/relatorio-evidencias.md", "evidencias/cnc-copilot/relatorio-evidencias.md", "style.css", "script.js", "data/projetos.json", "package.json", "package-lock.json", "vercel.json", "netlify.toml", "portfolio.html", "robots.txt", "sitemap.xml", "README.md", "HOMOLOGACAO.md", "scripts/generate-projects.mjs", "scripts/check-integrity.mjs", "tests/projects.test.mjs", "qa/common.cjs", "qa/browser.cjs", "qa/contrast.cjs", "qa/README.md", "qa/fixtures/baseline/README.md", "qa/fixtures/baseline/index.html", "qa/fixtures/baseline/style.css", "qa/fixtures/baseline/script.js", "qa/fixtures/baseline/data/projetos.json"];
for (const name of files) {
  const bytes = await readFile(new URL(name, root));
  const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  assert(!content.includes("\uFFFD"), `Caractere de substituição em ${name}`);
  if (name.endsWith(".json")) JSON.parse(content);
}
const documents = new Map();
for (const name of ["index.html", "projetos/devcheck.html", "projetos/cnc-copilot.html"]) {
  const html = await readFile(new URL(name, root), "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `IDs duplicados: ${name}`);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `Deve existir um h1: ${name}`);
  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /<main\b/);
  documents.set(new URL(name, root).href, { html, ids: new Set(ids) });
}
for (const [url, { html, ids }] of documents) {
  for (const match of html.matchAll(/\b(?:aria-controls|aria-labelledby|aria-describedby|for)="([^"]+)"/g)) {
    for (const id of match[1].split(/\s+/)) assert(ids.has(id), `Referência sem alvo: ${id}`);
  }
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const href = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
      assert(/^(https:|mailto:)/.test(href), `Protocolo inesperado: ${href}`);
      continue;
    }
    const target = new URL(href, url);
    assert(target.href.startsWith(root.href), `Recurso fora do projeto: ${href}`);
    await access(fileURLToPath(target));
    const hash = target.hash;
    target.hash = "";
    if (hash) assert(documents.get(target.href)?.ids.has(hash.slice(1)), `Âncora inexistente: ${href}`);
  }
  for (const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    assert.match(match[0], /rel="(?=[^"]*\bnoopener\b)(?=[^"]*\bnoreferrer\b)[^"]*"/, "Link externo sem proteção");
  }
}
const image = await readFile(new URL("assets/devcheck-demonstracao.png", root));
assert.equal(image.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "Captura PNG inválida");
const policy = JSON.parse(await readFile(new URL("vercel.json", root), "utf8"));
assert.equal(policy.git.deploymentEnabled["codex/portfolio-publicacao-limpa-20261121"], false, "Bloqueio de deploy da branch ausente");
validateProjects(JSON.parse(await readFile(new URL("data/projetos.json", root), "utf8")));
console.log(`Integridade: ${files.length} arquivos UTF-8, três páginas, PNG, JSON, IDs, referências acessíveis, âncoras entre páginas e bloqueio de deploy válidos.`);
