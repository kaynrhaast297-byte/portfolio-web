const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { parseArgs } = require("node:util");

function configuration(kind) {
  const { values } = parseArgs({ options: {
    channel: { type: "string" }, executable: { type: "string" },
    output: { type: "string", default: `output/homologacao/${kind}` },
    "offline-fonts": { type: "boolean", default: false },
    filter: { type: "string", default: "" }, help: { type: "boolean", default: false }
  } });
  if (values.help) {
    console.log("Opções: --channel=chrome|msedge --executable=<arquivo> --output=<pasta> --offline-fonts --filter=<nome>");
    process.exit(0);
  }
  const root = path.resolve(__dirname, "..");
  const output = path.resolve(root, values.output);
  const temp = path.join(output, "tmp");
  fsSync.mkdirSync(temp, { recursive: true });
  // Isola temporários de navegador e permite executar sem depender do disco do sistema.
  for (const name of ["TEMP", "TMP", "TMPDIR"]) process.env[name] = temp;
  return { root, output, options: values };
}

async function launchBrowser(options) {
  const { chromium } = require("playwright");
  const launch = { headless: true };
  if (options.channel) launch.channel = options.channel;
  if (options.executable) launch.executablePath = options.executable;
  try { return await chromium.launch(launch); }
  catch (error) {
    throw new Error("Navegador indisponível. Execute npx playwright install chromium ou use --channel=chrome com Chrome já instalado. " + error.message);
  }
}

async function configureFonts(context, options) {
  if (options["offline-fonts"]) {
    await context.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  }
}

async function renderedFonts(page) {
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => [...new Set([...document.fonts].filter((font) => font.status === "loaded").map((font) => font.family.replace(/["']/g, "")))].sort());
}

async function environment(browser, options, root) {
  const sourceSha256 = {};
  for (const name of ["index.html", "projetos/devcheck.html", "projetos/cnc-copilot.html", "evidencias/devcheck/relatorio-evidencias.md", "evidencias/cnc-copilot/relatorio-evidencias.md", "assets/devcheck-demonstracao.png", "style.css", "script.js", "data/projetos.json", "qa/browser.cjs", "qa/contrast.cjs", "qa/common.cjs"]) {
    sourceSha256[name] = crypto.createHash("sha256").update(await fs.readFile(path.join(root, name))).digest("hex");
  }
  return {
    node: process.version, platform: process.platform, browser: browser.version(),
    playwright: require("playwright/package.json").version,
    axe: require("axe-core/package.json").version,
    pngjs: require("pngjs/package.json").version,
    channel: options.channel || (options.executable ? "executable" : "chromium"),
    fonts: options["offline-fonts"] ? "fallback local solicitado; não valida Google Fonts" : "Google Fonts por leitura de rede",
    sourceSha256
  };
}

function createServer(root) {
  const policy = JSON.parse(fsSync.readFileSync(path.join(root, "vercel.json"), "utf8")).headers[0].headers;
  const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".md": "text/plain" };
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const baseline = url.pathname.startsWith("/baseline/");
      const relative = decodeURIComponent(url.pathname.replace(baseline ? /^\/baseline\// : /^\//, "")) || "index.html";
      if (relative.split(/[\\/]/).some((part) => part.startsWith(".")) || !mime[path.extname(relative)]) { res.writeHead(404).end(); return; }
      const directory = baseline ? path.join(root, "qa", "fixtures", "baseline") : root;
      const filename = path.resolve(directory, relative);
      if (!filename.startsWith(path.resolve(directory) + path.sep)) { res.writeHead(403).end(); return; }
      const bytes = await fs.readFile(filename);
      for (const header of policy) res.setHeader(header.key, header.value);
      res.setHeader("Content-Type", mime[path.extname(filename)] + (path.extname(filename) === ".png" ? "" : "; charset=utf-8"));
      res.writeHead(200).end(bytes);
    } catch { res.writeHead(404).end(); }
  });
}

module.exports = { configuration, launchBrowser, configureFonts, renderedFonts, environment, createServer };
