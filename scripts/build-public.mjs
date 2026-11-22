import { lstat, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const publicFiles = [
  "index.html",
  "portfolio.html",
  "style.css",
  "script.js",
  "data/projetos.json",
  "assets/devcheck-demonstracao.png",
  "projetos/devcheck.html",
  "projetos/cnc-copilot.html",
  "evidencias/devcheck/relatorio-evidencias.md",
  "evidencias/cnc-copilot/relatorio-evidencias.md",
  "robots.txt",
  "sitemap.xml",
];

const root = await realpath(fileURLToPath(new URL("../", import.meta.url)));
const files = await Promise.all(publicFiles.map(async (name) => [name, await readFile(join(root, name))]));
const output = join(root, "output");
await mkdir(output, { recursive: true });
if (await realpath(output) !== output) throw new Error("A pasta output precisa estar dentro do repositório.");

const destination = join(output, "public");
const existing = await lstat(destination).catch((error) => {
  if (error.code !== "ENOENT") throw error;
  return null;
});
if (existing) {
  if (!existing.isDirectory() || await realpath(destination) !== destination) {
    throw new Error("output/public precisa ser um diretório local do repositório.");
  }
  await rm(destination, { recursive: true });
}
await mkdir(destination);

for (const [name, bytes] of files) {
  const target = join(destination, name);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
}
console.log(`Saída pública gerada em output/public (${files.length} arquivos).`);
