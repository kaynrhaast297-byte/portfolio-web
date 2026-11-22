import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const githubUser = "kaynrhaast297-byte";
const start = "        <!-- projects:start -->";
const end = "        <!-- projects:end -->";

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function validateProjects(projects) {
  if (!Array.isArray(projects) || !projects.length) throw new Error("A lista de projetos deve conter projetos.");
  const ids = new Set();
  for (const project of projects) {
    if (!project || typeof project !== "object") throw new Error("Projeto inválido.");
    if (!/^[a-z][a-z0-9-]*$/.test(project.id || "") || ids.has(project.id)) throw new Error("ID de projeto inválido ou duplicado.");
    ids.add(project.id);
    for (const key of ["titulo", "descricao", "status", "tipo", "problema", "solucao"]) {
      if (typeof project[key] !== "string" || !project[key].trim()) throw new Error(`Campo obrigatório: ${project.id}.${key}`);
    }
    for (const key of ["tecnologias", "decisoes", "limitacoes"]) {
      if (!Array.isArray(project[key]) || !project[key].length || project[key].some((value) => typeof value !== "string" || !value.trim())) {
        throw new Error(`Lista obrigatória: ${project.id}.${key}`);
      }
    }
    if (project.repo && !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(project.repo)) throw new Error("Repositório inválido.");
    if (!project.repo && !project.demo && !project.estudo) throw new Error("Projeto sem código, demonstração ou estudo de caso.");
    if (project.estudo) validateLocalUrl(project.estudo, "html");
    if (!Array.isArray(project.evidencias) || !project.evidencias.length) throw new Error("Projeto sem evidência.");
    for (const evidence of project.evidencias) {
      if (typeof evidence.rotulo !== "string" || !evidence.rotulo.trim()) throw new Error("Evidência sem rótulo.");
      validateUrl(evidence.url);
    }
    if (project.demo) validateUrl(project.demo);
  }
  return projects;
}

function validateUrl(value) {
  if (typeof value !== "string") throw new Error("Link de projeto inválido.");
  if (value.startsWith("./")) return validateLocalUrl(value);
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Links de projeto devem usar HTTPS sem credenciais.");
}

function validateLocalUrl(value, extension = "html|md|png") {
  const pattern = new RegExp(`^\\./(?:[a-z0-9][a-z0-9_-]*/)*[a-z0-9][a-z0-9._-]*\\.(?:${extension})(?:#[a-z][a-z0-9-]*)?$`);
  if (typeof value !== "string" || !pattern.test(value)) throw new Error("Recurso local de projeto inválido.");
}

function link(href, text, title) {
  const external = href.startsWith("https://");
  return `<a class="project-link" href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""} aria-label="${escapeHtml(`${text}: ${title}${external ? " (nova aba)" : ""}`)}">${escapeHtml(text)}</a>`;
}

export function renderProjects(projects) {
  validateProjects(projects);
  return projects.map((project, index) => {
    const title = escapeHtml(project.titulo);
    const list = (items) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    const actions = [];
    if (project.demo) actions.push(link(project.demo, "Ver demonstração", project.titulo));
    if (project.repo) actions.push(link(`https://github.com/${githubUser}/${project.repo}`, "Ver código", project.titulo));
    if (project.estudo) actions.push(link(project.estudo, "Ver estudo de caso", project.titulo));
    const evidenceLinks = project.evidencias.map((item) => link(item.url, item.rotulo, project.titulo)).join("");
    return `        <article class="project-card" id="projeto-${project.id}" aria-labelledby="titulo-${project.id}">
          <div class="project-head">
            <span class="project-index">Projeto ${String(index + 1).padStart(2, "0")}</span>
            <span class="project-status">${escapeHtml(project.status)}</span>
          </div>
          <div>
            <p class="project-type">${escapeHtml(project.tipo)}</p>
            <h3 class="project-title" id="titulo-${project.id}">${title}</h3>
            <p class="project-desc">${escapeHtml(project.descricao)}</p>
            <ul class="project-tags" aria-label="Tecnologias de ${title}">${project.tecnologias.map((tech) => `<li class="project-tag">${escapeHtml(tech)}</li>`).join("")}</ul>
          </div>
          <div class="project-footer">
            <div class="project-actions">${actions.join("")}</div>
            <details class="project-details">
              <summary>Detalhes técnicos<span class="sr-only"> de ${title}</span></summary>
              <dl class="project-facts">
                <div><dt>Problema</dt><dd>${escapeHtml(project.problema)}</dd></div>
                <div><dt>Solução</dt><dd>${escapeHtml(project.solucao)}</dd></div>
                <div><dt>Decisões técnicas</dt><dd>${list(project.decisoes)}</dd></div>
                <div><dt>Limitações</dt><dd>${list(project.limitacoes)}</dd></div>
                <div><dt>Evidências</dt><dd class="project-evidence">${evidenceLinks}</dd></div>
              </dl>
            </details>${project.repo ? `
            <p class="project-update" data-github-repo="${escapeHtml(project.repo)}">Código disponível no GitHub.</p>` : ""}
          </div>
        </article>`;
  }).join("\n");
}

export function updateHtml(html, projects) {
  validateProjects(projects);
  const newline = html.includes("\r\n") ? "\r\n" : "\n";
  html = html.replace(/\r\n/g, "\n");
  if (html.split(start).length !== 2 || html.split(end).length !== 2 || html.indexOf(start) > html.indexOf(end)) {
    throw new Error("Marcadores de projetos ausentes ou duplicados.");
  }
  if (!/<dd id="metric-projects">\d+<\/dd>/.test(html)) throw new Error("Contador de projetos ausente.");
  const before = html.slice(0, html.indexOf(start) + start.length);
  const after = html.slice(html.indexOf(end));
  const generated = `${before}\n${renderProjects(projects)}\n${after}`.replace(/(<dd id="metric-projects">)\d+(<\/dd>)/, (_, a, b) => `${a}${projects.length}${b}`);
  return newline === "\r\n" ? generated.replace(/\n/g, "\r\n") : generated;
}

async function main() {
  const projects = JSON.parse(await readFile(new URL("data/projetos.json", root), "utf8"));
  const path = new URL("index.html", root);
  const html = (await readFile(path, "utf8")).replace(/\r\n/g, "\n");
  const generated = updateHtml(html, projects);
  if (process.argv.includes("--check")) {
    if (html !== generated) throw new Error("HTML desatualizado. Execute npm run build.");
    console.log(`HTML sincronizado com ${projects.length} projetos locais.`);
  } else {
    await writeFile(path, generated);
    console.log(`HTML gerado com ${projects.length} projetos locais.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
