import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { escapeHtml, renderProjects, updateHtml, validateProjects } from "../scripts/generate-projects.mjs";

const projects = JSON.parse(await readFile(new URL("../data/projetos.json", import.meta.url), "utf8"));
const copy = () => structuredClone(projects);

test("conteúdo local permanece no HTML sem depender de JavaScript ou da API", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const project of projects) {
    assert(html.includes(`id="projeto-${project.id}"`));
    assert(html.includes(`<h3 class="project-title" id="titulo-${project.id}">${escapeHtml(project.titulo)}</h3>`));
  }
  assert.equal(updateHtml(html, projects), html);
  assert(!html.includes("Carregando projetos"));
});

for (const { title, expected } of [
  { title: "Portfólio Pessoal & Web", expected: "Portfólio Pessoal &amp; Web" },
  { title: 'API <web> "Python"', expected: "API &lt;web&gt; &quot;Python&quot;" },
  { title: "Projeto d'automação", expected: "Projeto d&#39;automação" },
  { title: "Texto literal &amp;", expected: "Texto literal &amp;amp;" },
  { title: "Ação, precisão e evolução", expected: "Ação, precisão e evolução" }
]) {
  test(`título válido é preservado como texto: ${title}`, () => {
    const data = copy();
    data[0].titulo = title;
    const html = renderProjects([data[0]]);
    assert(html.includes(`<h3 class="project-title" id="titulo-${data[0].id}">${expected}</h3>`));
    assert.equal(escapeHtml(title), expected);
  });
}

test("geração é determinística e não altera outras seções", () => {
  const html = '<p>antes</p>\n<dd id="metric-projects">0</dd>\n        <!-- projects:start -->\n        <!-- projects:end -->\n<p>depois</p>';
  const generated = updateHtml(html, projects);
  assert(generated.startsWith("<p>antes</p>"));
  assert(generated.endsWith("<p>depois</p>"));
  assert.equal(updateHtml(generated, projects), generated);
});

test("HTML com CRLF permanece sincronizado após checkout no Windows", async () => {
  const html = (await readFile(new URL("../index.html", import.meta.url), "utf8")).replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
  const generated = updateHtml(html, projects);
  assert.equal(generated, html);
  assert(!generated.replace(/\r\n/g, "").includes("\n"));
});

test("cada projeto oferece ações independentes e detalhes nativos", () => {
  for (const project of projects) {
    const html = renderProjects([project]);
    assert.match(html, /<article\b/);
    if (project.demo) assert.match(html, /Ver demonstração<\/a>/);
    if (project.repo) assert.match(html, /Ver código<\/a>/);
    if (project.estudo) assert.match(html, /Ver estudo de caso<\/a>/);
    assert.match(html, /<details\b/);
    assert.match(html, /<dt>Evidências<\/dt>/);
  }
});

test("ausência de demonstração não produz link falso", () => {
  const data = copy();
  delete data[0].demo;
  const html = renderProjects([data[0]]);
  assert(!html.includes("Ver demonstração"));
  assert(html.includes("Ver código"));
});

test("links inseguros e credenciais em URLs são rejeitados", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "http://example.com", "https://user:password@example.com"]) {
    const data = copy();
    data[0].demo = url;
    assert.throws(() => validateProjects(data));
  }
});

test("conteúdo editorial é escapado antes de entrar no HTML", () => {
  const data = copy();
  data[0].titulo = '<img src=x onerror="alert(1)"> & texto';
  const html = renderProjects([data[0]]);
  assert(!html.includes("<img"));
  assert(html.includes("&lt;img"));
  assert(html.includes("&amp; texto"));
  assert(html.includes(`<h3 class="project-title" id="titulo-${data[0].id}">&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; texto</h3>`));
  assert(!/<(?:img|script|iframe)\b/i.test(html));
});

test("IDs duplicados e falta de evidências ou limitações bloqueiam a geração", () => {
  const duplicate = copy();
  duplicate[1].id = duplicate[0].id;
  assert.throws(() => validateProjects(duplicate));
  for (const key of ["evidencias", "limitacoes"]) {
    const data = copy();
    data[0][key] = [];
    assert.throws(() => validateProjects(data));
  }
});

test("marcadores ausentes não permitem sobrescrever o documento", () => {
  assert.throws(() => updateHtml("<main>conteúdo</main>", projects));
});

test("ImovelSP abre a seleção e DevCheck privado oferece somente recursos existentes", () => {
  assert.equal(projects[0].id, "imovelsp");
  assert.equal(projects[1].id, "devcheck");
  const project = projects[1];
  assert(!project.repo && !project.demo);
  const html = renderProjects([project]);
  assert.match(html, /Ver estudo de caso<\/a>/);
  assert(!html.includes("Ver código") && !html.includes("Ver demonstração"));
  assert(!html.includes("data-github-repo") && !html.includes('target="_blank"'));
});

test("links locais rejeitam travessia de diretórios, origens externas e URLs codificadas", () => {
  for (const url of ["../segredo.html", "./../segredo.html", "./projetos/../../segredo.html", "//example.com/pagina.html", "./%2e%2e/segredo.html", "./projetos\\segredo.html", "javascript:alert(1)", "https://example.com/caso.html"]) {
    const data = copy();
    data[1].estudo = url;
    assert.throws(() => validateProjects(data));
  }
});

test("evidências locais inseguras e projetos sem acesso ao conteúdo são rejeitados", () => {
  const data = copy();
  data[1].evidencias[0].url = "./../segredo.md";
  assert.throws(() => validateProjects(data));
  const inaccessible = copy();
  delete inaccessible[1].estudo;
  assert.throws(() => validateProjects(inaccessible));
});

test("CNC Copilot ocupa a terceira posição com estudo privado e sem acesso operacional", () => {
  const project = projects[2];
  assert.equal(project.id, "cnc-copilot");
  assert(!project.repo && !project.demo);
  assert.equal(project.estudo, "./projetos/cnc-copilot.html");
  const html = renderProjects([project]);
  assert.match(html, /Protótipo/);
  assert.match(html, /IA em toda a implementação/);
  assert(!html.includes("data-github-repo") && !html.includes("Ver código") && !html.includes("Ver demonstração"));
});

test("estudo CNC mantém limites e não oferece arquivos de programa ou instrução operacional", async () => {
  const html = await readFile(new URL("../projetos/cnc-copilot.html", import.meta.url), "utf8");
  assert.match(html, /sem homologação para fabricação ou operação de máquina/);
  assert.match(html, /sete permissões operacionais permanecem bloqueadas/);
  assert.match(html, /IA em todas as etapas da implementação/);
  assert(!/<a\b[^>]*href="[^"]*\.(?:ngc|nc|tap|gcode)(?:[?#][^"]*)?"/i.test(html));
  assert(!/<pre\b/i.test(html));
});
