const GITHUB_USER = "kaynrhaast297-byte";
const CONTACT_EMAIL = "kaynrhaast297@gmail.com";

const FALLBACK_PROJECTS = [
  {
    repo: "portfolio-web",
    titulo: "Portfólio Pessoal",
    descricao: "Portfólio profissional em HTML, CSS e JavaScript, com foco em apresentação clara para recrutadores.",
    status: "Em evolução",
    tipo: "Front-end",
    impacto: "SEO básico, layout responsivo, dados externos em JSON e deploy público.",
    tecnologias: ["HTML", "CSS", "JavaScript"],
    demo: "https://portfolio-web-five-rouge.vercel.app"
  },
  {
    repo: "imovel-sp-mvp",
    titulo: "Sistema Imobiliário",
    descricao: "MVP imobiliário com busca de imóveis, filtros, painel administrativo e análise de preço justo.",
    status: "Em evolução",
    tipo: "Full-stack",
    impacto: "Projeto usado para praticar Next.js, Supabase, rotas de API, validação e fluxo de leads.",
    tecnologias: ["Next.js", "Supabase", "TypeScript", "Tailwind"],
    demo: "https://imovel-sp-mvp.vercel.app"
  },
  {
    repo: "projeto-star",
    titulo: "Projeto Star",
    descricao: "Protótipo de site moderno para uma empresa industrial, com foco visual e formulários.",
    status: "Em evolução",
    tipo: "Front-end",
    impacto: "Exercício de composição visual, responsividade e estrutura de página institucional.",
    tecnologias: ["Next.js", "TypeScript", "Tailwind"],
    demo: "https://projeto-star-tau.vercel.app"
  },
  {
    repo: "growthlens-dashboard",
    titulo: "GrowthLens Dashboard",
    descricao: "Dashboard estático com visualização de métricas e painéis de acompanhamento.",
    status: "Em evolução",
    tipo: "Dashboard",
    impacto: "Treino de organização de dados, indicadores e visualização com JavaScript.",
    tecnologias: ["HTML", "CSS", "JavaScript", "Chart.js"],
    demo: "https://growthlens-dashboard.vercel.app/"
  }
];

function byId(id) {
  return document.getElementById(id);
}

function createElement(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.className) element.className = options.className;
  if (options.text) element.textContent = options.text;
  if (options.href) element.href = options.href;
  if (options.target) element.target = options.target;
  if (options.rel) element.rel = options.rel;
  if (options.ariaLabel) element.setAttribute("aria-label", options.ariaLabel);

  return element;
}

function formatUpdate(dateStr) {
  if (!dateStr) return "Atualização local";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Atualização local";

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return "Atualizado hoje";
  if (days === 1) return "Atualizado ontem";
  if (days < 30) return `Atualizado há ${days} dias`;

  const months = Math.floor(days / 30);
  if (months < 12) return `Atualizado há ${months} ${months === 1 ? "mês" : "meses"}`;

  const years = Math.floor(months / 12);
  return `Atualizado há ${years} ${years === 1 ? "ano" : "anos"}`;
}

function projectUrl(project) {
  if (project.demo) return project.demo;
  if (project.repo) return `https://github.com/${GITHUB_USER}/${project.repo}`;
  return "#contato";
}

function renderProjects(projects) {
  const container = byId("projects-container");
  const metricProjects = byId("metric-projects");
  if (!container) return;

  container.replaceChildren();

  if (metricProjects) metricProjects.textContent = String(projects.length);

  if (!projects.length) {
    const empty = createElement("div", { className: "empty-state" });
    const text = createElement("p", { text: "Não foi possível carregar os projetos agora. Use os links de contato para pedir mais detalhes." });
    empty.append(text);
    container.append(empty);
    return;
  }

  projects.forEach((project, index) => {
    const href = projectUrl(project);
    const card = createElement("a", {
      className: "project-card",
      href,
      target: href.startsWith("http") ? "_blank" : undefined,
      rel: href.startsWith("http") ? "noopener noreferrer" : undefined,
      ariaLabel: `Abrir projeto ${project.titulo}`
    });

    const head = createElement("div", { className: "project-head" });
    head.append(
      createElement("span", { className: "project-index", text: `Projeto ${String(index + 1).padStart(2, "0")}` }),
      createElement("span", { className: "project-status", text: project.status || "Em evolução" })
    );

    const body = createElement("div");
    body.append(
      createElement("p", { className: "project-type", text: project.tipo || "Projeto web" }),
      createElement("h3", { className: "project-title", text: project.titulo || "Projeto sem título" }),
      createElement("p", { className: "project-desc", text: project.descricao || "Descrição em atualização." })
    );

    if (project.impacto) {
      body.append(createElement("p", { className: "project-impact", text: project.impacto }));
    }

    const tags = createElement("div", { className: "project-tags" });
    (project.tecnologias || []).forEach((tech) => {
      tags.append(createElement("span", { className: "project-tag", text: tech }));
    });
    body.append(tags);

    const footer = createElement("div", { className: "project-footer" });
    footer.append(
      createElement("span", { text: formatUpdate(project.updated_at) }),
      createElement("span", { className: "project-arrow", text: "↗" })
    );

    card.append(head, body, footer);
    container.append(card);
  });
}

async function enrichWithGitHub(projects) {
  const enriched = await Promise.all(projects.map(async (project) => {
    if (!project.repo) return project;

    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${project.repo}`, {
        headers: { Accept: "application/vnd.github+json" }
      });

      if (!response.ok) return project;

      const data = await response.json();
      return {
        ...project,
        updated_at: data.pushed_at || project.updated_at
      };
    } catch {
      return project;
    }
  }));

  return enriched;
}

async function loadProjects() {
  try {
    const response = await fetch("./data/projetos.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Falha ao carregar projetos");
    const projects = await response.json();
    renderProjects(await enrichWithGitHub(projects));
  } catch {
    renderProjects(await enrichWithGitHub(FALLBACK_PROJECTS));
  }
}

function setupContactForm() {
  const form = byId("contact-form");
  const status = byId("form-status");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nome = String(data.get("nome") || "").trim();
    const email = String(data.get("email") || "").trim();
    const mensagem = String(data.get("mensagem") || "").trim();

    const subject = encodeURIComponent("Contato pelo portfólio - oportunidade");
    const body = encodeURIComponent(
      `Olá Jonathan,\n\n${mensagem}\n\nNome: ${nome}\nEmail: ${email}`
    );

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    if (status) {
      status.textContent = "Seu aplicativo de email foi aberto com a mensagem preenchida.";
    }
  });
}

function setupCurrentYear() {
  const year = byId("current-year");
  if (year) year.textContent = String(new Date().getFullYear());
}

setupCurrentYear();
setupContactForm();
loadProjects();
