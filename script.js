const GITHUB_USER = "kaynrhaast297-byte";
const CONTACT_EMAIL = "kaynrhaast297@gmail.com";
const GITHUB_TIMEOUT_MS = 2500;

function setupNavigation() {
  const nav = document.querySelector(".nav");
  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("nav-links");
  if (!nav || !toggle || !links) return;

  const mobile = window.matchMedia("(max-width: 920px)");
  let open = false;

  function setOpen(value, restoreFocus = false) {
    open = mobile.matches && value;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Fechar menu" : "Menu";
    links.hidden = mobile.matches && !open;
    if (restoreFocus) toggle.focus();
  }

  function syncViewport() {
    const focused = document.activeElement;
    toggle.hidden = !mobile.matches;
    setOpen(false);
    if (mobile.matches && links.contains(focused)) toggle.focus();
    if (!mobile.matches && focused === toggle) links.querySelector("a")?.focus();
  }

  toggle.addEventListener("click", () => setOpen(!open));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false, true);
    }
  });
  document.addEventListener("click", (event) => {
    if (open && !nav.contains(event.target)) setOpen(false);
  });
  nav.addEventListener("focusout", (event) => {
    if (open && !nav.contains(event.relatedTarget)) setOpen(false);
  });
  links.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !open) return;
    setOpen(false);
    document.getElementById(link.hash.slice(1))?.focus({ preventScroll: true });
  });
  mobile.addEventListener("change", syncViewport);
  syncViewport();
}

// Os cards já estão no HTML. A rede só melhora um texto opcional, sem recriar o DOM.
function enhanceProjectUpdates() {
  document.querySelectorAll("[data-github-repo]").forEach(async (label) => {
    const repo = label.dataset.githubRepo;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(repo || "")) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${repo}`, {
        headers: { Accept: "application/vnd.github+json" },
        signal: controller.signal
      });
      if (!response.ok) return;
      const data = await response.json();
      if (controller.signal.aborted || typeof data.pushed_at !== "string") return;
      const date = new Date(data.pushed_at);
      if (Number.isNaN(date.getTime())) return;
      const formatted = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
      label.textContent = `Código atualizado em ${formatted}.`;
    } catch {
      // Falha, indisponibilidade ou timeout mantêm o conteúdo local e os links intactos.
    } finally {
      window.clearTimeout(timeout);
    }
  });
}

function setupContactForm() {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const emailLink = document.getElementById("contact-email-link");
  if (!form || !status || !emailLink) return;
  const initialStatus = status.textContent;
  form.hidden = false;

  form.addEventListener("input", () => {
    emailLink.hidden = true;
    emailLink.removeAttribute("href");
    status.textContent = initialStatus;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const fields = ["nome", "email", "mensagem"];
    const values = fields.map((name) => String(data.get(name) || "").trim());
    const emptyIndex = values.findIndex((value) => !value);
    if (emptyIndex !== -1) {
      status.textContent = "Preencha os campos com seu nome, email e mensagem.";
      form.elements.namedItem(fields[emptyIndex])?.focus();
      return;
    }

    const [nome, email, mensagem] = values;
    const subject = encodeURIComponent("Contato pelo portfólio - oportunidade");
    const body = encodeURIComponent(`Olá Jonathan,\n\n${mensagem}\n\nNome: ${nome}\nEmail: ${email}`);
    emailLink.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    emailLink.hidden = false;
    status.textContent = "Mensagem preparada. Use “Continuar no email” para solicitar a abertura do seu aplicativo e concluir o envio.";
    emailLink.focus();
  });
}

const year = document.getElementById("current-year");
if (year) year.textContent = String(new Date().getFullYear());
setupNavigation();
setupContactForm();
enhanceProjectUpdates();
