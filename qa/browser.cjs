const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { configuration, launchBrowser, configureFonts, renderedFonts, environment, createServer } = require("./common.cjs");
const { root: repo, output, options } = configuration("browser");
const baseline = path.join(__dirname, "fixtures", "baseline");
const projects = JSON.parse(require("node:fs").readFileSync(path.join(repo, "data/projetos.json"), "utf8"));
const results = { startedAt: new Date().toISOString(), checks: [], screenshots: [], accessibility: [], fonts: [], errors: [], filter: options.filter };
const contexts = new Set();
let browser;
let baseUrl;
const server = createServer(repo);

async function check(name, fn) {
  if (options.filter && !name.includes(options.filter)) return;
  const started = Date.now();
  try {
    await fn();
    results.checks.push({ name, status: "PASS", durationMs: Date.now() - started });
    console.log("PASS " + name);
  } catch (error) {
    results.checks.push({ name, status: "FAIL", error: error.stack, durationMs: Date.now() - started });
    console.log("FAIL " + name + ": " + error.message);
    process.exitCode = 1;
  }
}

async function open({ width = 1440, height = 1000, javaScript = true, api = "ok", old = false, route = "/" } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: javaScript, reducedMotion: "reduce", locale: "pt-BR" });
  contexts.add(context);
  const pending = [];
  await context.addInitScript(() => {
    window.__githubSettled = 0;
    window.__githubStarted = 0;
    const original = window.fetch;
    window.fetch = function (...args) {
      const promise = original.apply(this, args);
      if (String(args[0]).startsWith("https://api.github.com/")) { window.__githubStarted++; return promise.finally(() => { window.__githubSettled++; }); }
      return promise;
    };
  });
  await context.route("https://api.github.com/**", async (route) => {
    if (api === "pending") { pending.push(route); return; }
    if (api === "offline") return route.abort("internetdisconnected");
    if (api === "rate-limit") return route.fulfill({ status: 403, contentType: "application/json", body: '{"message":"API rate limit exceeded"}' });
    if (api === "not-found") return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    if (api === "invalid-json") return route.fulfill({ status: 200, contentType: "application/json", body: "not-json" });
    if (api === "invalid-date") return route.fulfill({ status: 200, contentType: "application/json", body: '{"pushed_at":"invalid"}' });
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"pushed_at":"2026-11-17T12:00:00Z"}' });
  });
  await configureFonts(context, options);
  const page = await context.newPage();
  const errors = [];
  const consoleErrors = [];
  const failures = [];
  page.on("pageerror", (error) => { errors.push(error.message); results.errors.push(error.message); });
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => failures.push({ url: request.url(), error: request.failure()?.errorText }));
  const before = Date.now();
  await page.goto(baseUrl + (old ? "/baseline/" : route), { waitUntil: "domcontentloaded" });
  const navigationMs = Date.now() - before;
  return { context, page, pending, errors, consoleErrors, failures, navigationMs };
}

async function close(surface) {
  await surface.context.close(); contexts.delete(surface.context);
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(output, name), fullPage: false, animations: "disabled" });
  results.screenshots.push(name);
}

async function assertCards(page) {
  assert.equal(await page.locator(".project-card").count(), projects.length);
  assert.equal(await page.locator(".project-actions a").count(), projects.reduce((total, project) => total + Boolean(project.demo) + Boolean(project.repo) + Boolean(project.estudo), 0));
  assert.equal(await page.locator(".project-card > .project-footer details").count(), projects.length);
}

async function assertFonts(page, name) {
  const loaded = await renderedFonts(page);
  results.fonts.push({ name, loaded, fallbackRequested: options["offline-fonts"] });
  if (!options["offline-fonts"]) {
    for (const family of ["Syne", "Inter", "DM Mono"]) assert(loaded.includes(family), `Fonte não carregada: ${family}`);
  }
}

async function axeCheck(page, name) {
  const source = await fs.readFile(require.resolve("axe-core/axe.js"), "utf8");
  await page.evaluate(source);
  const report = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
  const violations = report.violations.map((v) => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map((n) => ({ target: n.target, failureSummary: n.failureSummary })) }));
  results.accessibility.push({ name, violations, passes: report.passes.length, incomplete: report.incomplete.map((v) => v.id), version: report.testEngine.version });
  await fs.writeFile(path.join(output, `axe-${name}.json`), JSON.stringify(report, null, 2));
  assert.equal(violations.length, 0, JSON.stringify(violations));
}

async function main() {
  for (const name of ["index.html", "style.css", "script.js", "data/projetos.json"]) await fs.access(path.join(baseline, name));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await launchBrowser(options);
  results.environment = { ...(await environment(browser, options, repo)), github: "Respostas simuladas por interceptação de rede", csp: "Cabeçalhos do vercel.json aplicados pelo servidor local", baseline: "Fixture do commit 235168a9cd791beedbfae4f54da2fc8182698de9" };

  await check("Capturas de referência do commit preservado", async () => {
    const desktop = await open({ old: true });
    await desktop.page.locator(".project-card").first().waitFor();
    await screenshot(desktop.page, "01-antes-desktop.png");
    await close(desktop);
    const mobile = await open({ old: true, width: 390, height: 844 });
    await mobile.page.locator(".project-card").first().waitFor();
    await screenshot(mobile.page, "02-antes-mobile.png");
    await close(mobile);
  });

  await check("Identidade, conteúdo, links e console no desktop", async () => {
    const surface = await open(); const { page } = surface;
    assert.match(await page.title(), /Jonathan Medeiros.*Web e Python/);
    assert.equal(new URL(page.url()).pathname, "/");
    await assertCards(page);
    assert.equal(await page.locator("h1").count(), 1);
    assert(await page.locator("#nav-links").isVisible());
    assert(!(await page.locator("#nav-toggle").isVisible()));
    assert.equal(await page.locator("a a").count(), 0);
    await assertFonts(page, "home");
    assert.equal(await page.locator("nextjs-portal, #webpack-dev-server-client-overlay").count(), 0);
    const invalid = await page.locator("a[href]").evaluateAll((links) => links.filter((a) => a.getAttribute("href") === "#" || (a.hash && a.origin === location.origin && a.pathname === location.pathname && !document.getElementById(a.hash.slice(1)))).map((a) => a.href));
    assert.deepEqual(invalid, []);
    await page.waitForFunction(() => window.__githubSettled === 4);
    assert.deepEqual(surface.errors, []);
    assert.deepEqual(surface.consoleErrors, []);
    await screenshot(page, "03-depois-desktop.png");
    await page.locator("#projetos").evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
    await screenshot(page, "04-projetos-desktop.png");
    await axeCheck(page, "desktop");
    await close(surface);
  });

  await check("Títulos especiais e tentativas de HTML permanecem texto no DOM", async () => {
    const { renderProjects } = await import("../scripts/generate-projects.mjs");
    const projects = JSON.parse(await fs.readFile(path.join(repo, "data/projetos.json"), "utf8"));
    const surface = await open();
    for (const title of ["Portfólio Pessoal & Web", 'API <web> "Python"', "Projeto d'automação", "Texto literal &amp;", '<img src=x onerror="alert(1)"> & texto']) {
      const sample = { ...projects[0], titulo: title };
      const parsed = await surface.page.evaluate((markup) => {
        const template = document.createElement("template");
        template.innerHTML = markup;
        return { title: template.content.querySelector("h3").textContent, injectedElements: template.content.querySelectorAll("img,script,iframe").length };
      }, renderProjects([sample]));
      assert.equal(parsed.title, title);
      assert.equal(parsed.injectedElements, 0);
    }
    assert.deepEqual(surface.errors, []);
    await close(surface);
  });

  await check("Menu mobile: Enter, Tab, Escape, espaço e foco", async () => {
    const surface = await open({ width: 390, height: 844 }); const { page } = surface;
    const toggle = page.locator("#nav-toggle"); const links = page.locator("#nav-links");
    assert(await toggle.isVisible()); assert(!(await links.isVisible()));
    assert.equal(await toggle.getAttribute("aria-controls"), "nav-links");
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    await toggle.focus(); await page.keyboard.press("Enter");
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    assert(await links.isVisible());
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.hash), "#sobre");
    await page.keyboard.press("Escape");
    assert(!(await links.isVisible()));
    assert.equal(await page.evaluate(() => document.activeElement.id), "nav-toggle");
    await page.keyboard.press("Space"); assert(await links.isVisible());
    await screenshot(page, "05-menu-mobile.png");
    await axeCheck(page, "mobile-menu");
    await links.locator('a[href="#projetos"]').click();
    assert(!(await links.isVisible()));
    assert.equal(new URL(page.url()).hash, "#projetos");
    assert.equal(await page.evaluate(() => document.activeElement.id), "projetos");
    const top = await page.locator("#projetos").evaluate((el) => el.getBoundingClientRect().top);
    const bottom = await page.locator(".site-header").evaluate((el) => el.getBoundingClientRect().bottom);
    assert(top >= bottom - 1, `Âncora coberta pelo cabeçalho: ${top}/${bottom}`);
    await screenshot(page, "06-projetos-mobile.png");
    await close(surface);
  });

  await check("Menu fecha ao sair e adapta foco ao redimensionamento", async () => {
    const surface = await open({ width: 390 }); const { page } = surface;
    await page.locator("#nav-toggle").click();
    await page.locator('#nav-links a[href="#contato"]').focus();
    await page.keyboard.press("Tab");
    assert(!(await page.locator("#nav-links").isVisible()));
    await page.locator("#nav-toggle").click();
    await page.locator("h1").click();
    assert(!(await page.locator("#nav-links").isVisible()));
    await page.locator("#nav-toggle").focus();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForFunction(() => document.getElementById("nav-toggle").hidden);
    assert(await page.locator("#nav-links").isVisible());
    assert.equal(await page.evaluate(() => document.activeElement.hash), "#sobre");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => !document.getElementById("nav-toggle").hidden);
    assert.equal(await page.evaluate(() => document.activeElement.id), "nav-toggle");
    assert(!(await page.locator("#nav-links").isVisible()));
    await close(surface);
  });

  await check("Skip link move o foco para o conteúdo", async () => {
    const surface = await open({ width: 390 }); const { page } = surface;
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.className), "skip-link");
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => document.activeElement.id), "conteudo");
    await close(surface);
  });

  await check("GitHub pendente não bloqueia os cards e é cancelado pelo timeout", async () => {
    const surface = await open({ width: 390, api: "pending" }); const { page } = surface;
    await assertCards(page);
    assert.equal(await page.locator(".loading-state").count(), 0);
    await page.waitForFunction(() => window.__githubSettled === 4, null, { timeout: 6000 });
    assert.equal(await page.locator(".project-update", { hasText: "Código disponível no GitHub." }).count(), 4);
    await assertCards(page);
    assert.deepEqual(surface.errors, []);
    results.slowApi = { navigationMs: surface.navigationMs, failures: surface.failures.filter((f) => f.url.includes("api.github.com")) };
    await page.locator("#projetos").evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
    await screenshot(page, "07-github-indisponivel-mobile.png");
    await close(surface);
  });

  for (const api of ["offline", "rate-limit", "not-found", "invalid-json", "invalid-date"]) {
    await check(`GitHub ${api}: conteúdo, links e detalhes preservados`, async () => {
      const surface = await open({ api }); const { page } = surface;
      await page.waitForFunction(() => window.__githubSettled === 4);
      await assertCards(page);
      assert.equal(await page.locator(".project-update", { hasText: "Código disponível no GitHub." }).count(), 4);
      assert.deepEqual(surface.errors, []);
      await page.locator(".project-card summary").first().click();
      assert(await page.locator(".project-card details").first().getAttribute("open") !== null);
      await close(surface);
    });
  }

  await check("Resposta tardia só altera a data e preserva foco e detalhes", async () => {
    const surface = await open({ api: "pending" }); const { page } = surface;
    await assertCards(page);
    const summary = page.locator(".project-card summary").first();
    await summary.focus(); await page.keyboard.press("Enter");
    const card = await page.locator(".project-card").first().elementHandle();
    await page.waitForFunction(() => window.__githubStarted === 4 && window.__githubSettled === 0);
    assert.equal(surface.pending.length, 4);
    await Promise.all(surface.pending.map((route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"pushed_at":"2026-11-16T08:00:00Z"}' })));
    await page.waitForFunction(() => [...document.querySelectorAll(".project-update")].every((el) => el.textContent.includes("16/11/2026")));
    assert(await card.evaluate((el) => el === document.querySelector(".project-card")));
    assert(await page.locator(".project-card details").first().getAttribute("open") !== null);
    assert(await summary.evaluate((el) => el === document.activeElement));
    await axeCheck(page, "desktop-details");
    await screenshot(page, "08-detalhes-desktop.png");
    await close(surface);
  });

  await check("JavaScript desativado: projetos, menu, detalhes e contato utilizáveis", async () => {
    const surface = await open({ width: 390, height: 844, javaScript: false }); const { page } = surface;
    await assertCards(page);
    assert(await page.locator("#nav-links").isVisible());
    assert(!(await page.locator("#nav-toggle").isVisible()));
    assert(!(await page.locator("#contact-form").isVisible()));
    assert(await page.locator('.contact-links a[href^="mailto:"]').isVisible());
    await page.locator(".project-card summary").first().click();
    assert(await page.locator(".project-card details").first().getAttribute("open") !== null);
    await screenshot(page, "09-sem-javascript-mobile.png");
    await close(surface);
  });

  await check("Formulário valida, prepara email e não inicia envio ou aplicativo", async () => {
    const surface = await open({ width: 390, height: 844 }); const { page } = surface;
    const originalUrl = page.url(); const draft = page.locator("#contact-email-link");
    await page.locator('button[type="submit"]').click();
    assert(!(await draft.isVisible()));
    await page.locator("#nome").fill("   ");
    await page.locator("#email").fill("revisao@example.test");
    await page.locator("#mensagem").fill("Teste local & revisão.\nSem envio.");
    await page.locator('button[type="submit"]').click();
    assert(!(await draft.isVisible()));
    assert.equal(await page.evaluate(() => document.activeElement.id), "nome");
    await page.locator("#nome").fill("Pessoa de teste");
    await page.locator("#email").fill("invalido");
    await page.locator('button[type="submit"]').click();
    assert(!(await draft.isVisible()));
    await page.locator("#email").fill("revisao@example.test");
    await page.locator('button[type="submit"]').click();
    assert(await draft.isVisible());
    assert.equal(page.url(), originalUrl);
    assert.equal(await page.evaluate(() => document.activeElement.id), "contact-email-link");
    const mail = new URL(await draft.getAttribute("href"));
    assert.equal(mail.protocol, "mailto:"); assert.equal(mail.pathname, "kaynrhaast297@gmail.com");
    assert(mail.searchParams.get("body").includes("Teste local & revisão.\nSem envio."));
    assert(mail.searchParams.get("body").includes("Nome: Pessoa de teste"));
    assert(!(await page.locator("#form-status").innerText()).includes("foi aberto"));
    await screenshot(page, "10-contato-mobile.png");
    await axeCheck(page, "mobile-contact");
    await page.locator("#mensagem").fill("Mensagem revisada");
    assert(!(await draft.isVisible())); assert.equal(await draft.getAttribute("href"), null);
    assert.deepEqual(surface.errors, []);
    await close(surface);
  });

  await check("Responsividade sem rolagem horizontal em 8 larguras", async () => {
    const surface = await open(); const { page } = surface;
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 375, 390, 560, 768, 920, 921, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.locator(".project-card details").evaluateAll((elements) => elements.forEach((el) => { el.open = true; }));
      const size = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
      if (size.content > size.viewport) {
        const overflowing = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 2).map((el) => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0, 80), right: el.getBoundingClientRect().right, width: el.getBoundingClientRect().width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth })).slice(0, 30));
        console.log(JSON.stringify({ width, overflowing }));
        await page.evaluate(() => scrollTo(0, 0));
        await screenshot(page, `overflow-${width}.png`);
      }
      assert(size.content <= size.viewport, `Overflow em ${width}px: ${JSON.stringify(size)}`);
    }
    await page.setViewportSize({ width: 320, height: 844 });
    await page.locator("#projetos").evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
    await screenshot(page, "11-detalhes-320px.png");
    await close(surface);
  });

  await check("ImovelSP em primeiro e DevCheck alpha privado sem links públicos presumidos", async () => {
    const surface = await open(); const { page } = surface;
    assert.equal(await page.locator(".project-card").first().getAttribute("id"), "projeto-imovelsp");
    const card = page.locator("#projeto-devcheck");
    assert.equal(await page.locator(".project-card").nth(1).getAttribute("id"), "projeto-devcheck");
    assert.match(await card.innerText(), /Alpha.*privado/i);
    assert.match(await card.innerText(), /IA em todas as etapas/);
    assert.equal(await card.locator('[data-github-repo], a[href^="https://"]').count(), 0);
    assert.equal(await card.getByText("Ver código", { exact: true }).count(), 0);
    assert.equal(await card.getByText("Ver demonstração", { exact: true }).count(), 0);
    assert.equal(await page.locator('a[href*="devcheck-professional"]').count(), 0);
    assert.equal(await page.locator(".project-card").nth(2).getAttribute("id"), "projeto-cnc-copilot");
    await card.getByRole("link", { name: /Ver estudo de caso/ }).click();
    assert.equal(new URL(page.url()).pathname, "/projetos/devcheck.html");
    assert.match(await page.title(), /DevCheck.*Jonathan Medeiros/);
    assert.equal(await page.locator("h1").count(), 1);
    assert.match(await page.locator("main").innerText(), /Idealizei o DevCheck/);
    assert.deepEqual(surface.errors, []);
    await screenshot(page, "12-devcheck-desktop.png");
    await close(surface);
  });

  await check("Estudo de caso: evidências, captura, teclado e retorno funcionam", async () => {
    const surface = await open({ route: "/projetos/devcheck.html", api: "offline" }); const { page } = surface;
    await assertFonts(page, "devcheck");
    assert.equal(await page.evaluate(() => window.__githubStarted), 0);
    assert.equal(await page.locator("nextjs-portal, #webpack-dev-server-client-overlay").count(), 0);
    const evidenceLink = page.getByRole("link", { name: "Consultar evidências", exact: true });
    await evidenceLink.focus(); await page.keyboard.press("Enter");
    assert.equal(new URL(page.url()).hash, "#evidencias");
    assert.match(await page.locator("#evidencias").innerText(), /196 testes contabilizados/);
    assert.match(await page.locator("#evidencias").innerText(), /cinco registros de skip/);
    for (const resource of ["/evidencias/devcheck/relatorio-evidencias.md", "/assets/devcheck-demonstracao.png"]) {
      const response = await page.request.get(baseUrl + resource);
      assert.equal(response.status(), 200, resource);
      if (resource.endsWith(".png")) {
        assert.match(response.headers()["content-type"], /image\/png/);
        assert.deepEqual(await response.body(), await fs.readFile(path.join(repo, resource.slice(1))));
      } else {
        assert.match(await response.text(), /83,0147%/);
        assert(!/[A-Z]:[\\/]/.test(await response.text()));
      }
    }
    const image = page.locator(".case-figure img");
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element) => element.decode());
    assert.equal(await image.evaluate((element) => element.naturalWidth), 1440);
    assert.match(await page.locator("figcaption").innerText(), /dados fictícios/);
    assert.deepEqual(surface.errors, []); assert.deepEqual(surface.consoleErrors, []);
    await axeCheck(page, "devcheck-desktop");
    await screenshot(page, "13-devcheck-captura-desktop.png");
    await page.getByRole("link", { name: "Explorar os outros projetos", exact: true }).click();
    assert.equal(new URL(page.url()).pathname, "/index.html");
    assert.equal(new URL(page.url()).hash, "#projetos");
    await assertCards(page);
    await close(surface);
  });

  await check("Estudo de caso: menu mobile, foco, acessibilidade e 8 larguras", async () => {
    const surface = await open({ route: "/projetos/devcheck.html", width: 390, height: 844 }); const { page } = surface;
    const toggle = page.locator("#nav-toggle");
    await toggle.focus(); await page.keyboard.press("Enter");
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.hash), "#visao-geral");
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.activeElement.id), "nav-toggle");
    await toggle.click();
    await page.locator('#nav-links a[href="#evidencias"]').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), "evidencias");
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    await page.locator(".case-figure img").scrollIntoViewIfNeeded();
    await page.locator(".case-figure img").evaluate((element) => element.decode());
    for (const width of [320, 375, 390, 560, 768, 920, 921, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const size = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
      assert(size.content <= size.viewport, `Estudo de caso com overflow em ${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#demonstracao").evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
    await axeCheck(page, "devcheck-mobile");
    await screenshot(page, "14-devcheck-mobile.png");
    assert.deepEqual(surface.errors, []);
    await close(surface);
  });

  await check("Estudo de caso sem JavaScript mantém apresentação, navegação e evidências", async () => {
    const surface = await open({ route: "/projetos/devcheck.html", width: 390, height: 844, javaScript: false }); const { page } = surface;
    assert(await page.locator("#nav-links").isVisible());
    assert(!(await page.locator("#nav-toggle").isVisible()));
    assert.match(await page.locator("#visao-geral").innerText(), /usando IA em todas as etapas/);
    await page.locator('#nav-links a[href="#evidencias"]').click();
    assert.equal(new URL(page.url()).hash, "#evidencias");
    assert(await page.getByRole("link", { name: /Ler relatório sanitizado completo/ }).isVisible());
    await screenshot(page, "15-devcheck-sem-javascript.png");
    await close(surface);
  });

  await check("CNC Copilot: terceiro projeto, limites, evidências, teclado e mobile", async () => {
    const desktop = await open();
    const card = desktop.page.locator("#projeto-cnc-copilot");
    assert.match(await card.innerText(), /Protótipo.*privado/i);
    assert.equal(await card.locator('[data-github-repo], a[href^="https://"]').count(), 0);
    await card.getByRole("link", { name: /Ver estudo de caso/ }).click();
    const page = desktop.page;
    assert.equal(new URL(page.url()).pathname, "/projetos/cnc-copilot.html");
    assert.match(await page.title(), /CNC Copilot.*Jonathan Medeiros/);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("nextjs-portal, #webpack-dev-server-client-overlay").count(), 0);
    await assertFonts(page, "cnc-copilot");
    assert.equal(await page.evaluate(() => window.__githubStarted), 0);
    assert.match(await page.locator("main").innerText(), /usando IA em todas as etapas/);
    assert.match(await page.locator("#limites").innerText(), /não está concluído nem homologado para fabricação/);
    assert.equal(await page.locator('a[href$=".ngc"], a[href$=".nc"], pre').count(), 0);
    const evidence = await page.request.get(baseUrl + "/evidencias/cnc-copilot/relatorio-evidencias.md");
    assert.equal(evidence.status(), 200);
    assert.match(await evidence.text(), /1[.]300 testes aprovados/);
    assert(!/\b[A-Za-z]:[\\/]/.test(await evidence.text()));
    assert.deepEqual(desktop.errors, []); assert.deepEqual(desktop.consoleErrors, []);
    await axeCheck(page, "cnc-desktop");
    await screenshot(page, "16-cnc-desktop.png");
    await close(desktop);

    const mobile = await open({ route: "/projetos/cnc-copilot.html", width: 390, height: 844 });
    const toggle = mobile.page.locator("#nav-toggle");
    await toggle.focus(); await mobile.page.keyboard.press("Enter");
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    await mobile.page.keyboard.press("Tab");
    assert.equal(await mobile.page.evaluate(() => document.activeElement.hash), "#visao-geral");
    await mobile.page.keyboard.press("Escape");
    assert.equal(await mobile.page.evaluate(() => document.activeElement.id), "nav-toggle");
    await toggle.click();
    await mobile.page.locator('#nav-links a[href="#limites"]').click();
    assert.equal(await mobile.page.evaluate(() => document.activeElement.id), "limites");
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    for (const width of [320, 375, 390, 560, 768, 920, 921, 1440]) {
      await mobile.page.setViewportSize({ width, height: 1000 });
      const size = await mobile.page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
      assert(size.content <= size.viewport, `CNC Copilot com overflow em ${width}px`);
    }
    await mobile.page.setViewportSize({ width: 390, height: 844 });
    await mobile.page.evaluate(() => scrollTo(0, 0));
    await axeCheck(mobile.page, "cnc-mobile");
    await screenshot(mobile.page, "17-cnc-mobile.png");
    assert.deepEqual(mobile.errors, []);
    await close(mobile);

    const withoutJs = await open({ route: "/projetos/cnc-copilot.html", width: 390, height: 844, javaScript: false });
    assert(await withoutJs.page.locator("#nav-links").isVisible());
    await withoutJs.page.locator('#nav-links a[href="#evidencias"]').click();
    assert.equal(new URL(withoutJs.page.url()).hash, "#evidencias");
    assert(await withoutJs.page.getByRole("link", { name: /Ler relatório sanitizado de software/ }).isVisible());
    await close(withoutJs);
  });
}

main().catch((error) => { results.fatal = error.stack; console.error(error); process.exitCode = 1; }).finally(async () => {
  for (const context of contexts) await context.close().catch(() => {});
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
  results.finishedAt = new Date().toISOString();
  results.summary = { passed: results.checks.filter((c) => c.status === "PASS").length, failed: results.checks.filter((c) => c.status === "FAIL").length, pageErrors: results.errors.length };
  if (!results.checks.length || results.errors.length) process.exitCode = 1;
  results.completeSuite = !options.filter && results.checks.length === 21 && !results.fatal;
  await fs.writeFile(path.join(output, "qa-results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.summary));
});
