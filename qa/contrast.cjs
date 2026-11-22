const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const { PNG } = require("pngjs");
const { configuration, launchBrowser, configureFonts, renderedFonts, environment, createServer } = require("./common.cjs");
const { root, output, options } = configuration("contrast");
const results = { method: "Cores de texto computadas comparadas ao fundo renderizado, com o texto temporariamente transparente e geometria preservada. Amostragem a cada 2 pixels em cada fragmento de texto; estados com todos os detalhes abertos. Limiares: 4,5 para texto normal, 3 para texto grande e limites dos campos. Não verifica leitores de tela nem toda combinação de estados.", states: [] };
const server = createServer(root);
const cache = new Map();
function luminance(rgb) {
  const key = rgb.slice(0, 3).join(",");
  if (!cache.has(key)) {
    const values = rgb.slice(0, 3).map((n) => n / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    cache.set(key, values.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0));
  }
  return cache.get(key);
}
function contrast(a, b) { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + 0.05) / (values[1] + 0.05); }
let browser;
async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  browser = await launchBrowser(options);
  results.environment = await environment(browser, options, root);
  for (const route of ["/", "/projetos/devcheck.html", "/projetos/cnc-copilot.html"]) {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    await context.route("https://api.github.com/**", (route) => route.fulfill({ status: 403, contentType: "application/json", body: "{}" }));
    await configureFonts(context, options);
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}${route}`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const fonts = await renderedFonts(page);
    if (!options["offline-fonts"]) {
      for (const family of ["Syne", "Inter", "DM Mono"]) assert(fonts.includes(family), `Fonte não carregada: ${family}`);
    }
    await page.locator("details").evaluateAll((elements) => elements.forEach((el) => { el.open = true; }));
    if (width < 921) await page.locator("#nav-toggle").click();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const texts = await page.evaluate(() => {
      const records = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentElement;
        if (!node.textContent.trim() || parent.closest("script,style,noscript,.sr-only") || !parent.checkVisibility()) continue;
        const style = getComputedStyle(parent);
        if (style.visibility !== "visible") continue;
        const color = style.color.match(/[\d.]+/g).map(Number);
        if (color.length === 4 && color[3] === 0) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        const size = parseFloat(style.fontSize);
        const large = size >= 24 || (size >= 18.6667 && parseInt(style.fontWeight) >= 700);
        for (const rect of range.getClientRects()) {
          if (rect.width <= 1 || rect.height <= 1 || rect.right < 0 || rect.bottom < 0) continue;
          records.push({ text: node.textContent.trim().slice(0, 100), color, threshold: large ? 3 : 4.5, x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height });
        }
      }
      for (const input of document.querySelectorAll("input,textarea")) {
        const style = getComputedStyle(input); const placeholder = getComputedStyle(input, "::placeholder"); const box = input.getBoundingClientRect();
        records.push({ text: "Placeholder: " + input.placeholder, color: placeholder.color.match(/[\d.]+/g).map(Number), threshold: 4.5, x: box.x + scrollX + parseFloat(style.paddingLeft) + 2, y: box.y + scrollY + parseFloat(style.paddingTop) + 2, width: Math.min(180, box.width - parseFloat(style.paddingLeft) * 2 - 4), height: parseFloat(style.fontSize) });
      }
      return records;
    });
    const controls = await page.locator("input,textarea").evaluateAll((els) => els.map((el) => { const style = getComputedStyle(el), rect = el.getBoundingClientRect(); return { id: el.id, x: rect.x + scrollX, y: rect.y + scrollY, height: rect.height, border: style.borderLeftColor.match(/[\d.]+/g).map(Number) }; }));
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("body,body *")) { el.style.setProperty("color", "transparent", "important"); el.style.setProperty("text-shadow", "none", "important"); }
      const sheet = [...document.styleSheets].find((s) => s.href && new URL(s.href).origin === location.origin);
      sheet.insertRule("input::placeholder,textarea::placeholder{color:transparent!important}", sheet.cssRules.length);
    });
    const screenshot = path.join(output, `contrast-background-${route === "/" ? "home" : path.basename(route, ".html")}-${width}.png`);
    await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled" });
    const { data, width: pixelWidth, height: pixelHeight } = PNG.sync.read(await fs.readFile(screenshot));
    const info = { width: pixelWidth, height: pixelHeight, channels: 4 };
    const pixel = (x, y) => { const offset = (Math.min(info.height - 1, Math.max(0, y)) * info.width + Math.min(info.width - 1, Math.max(0, x))) * info.channels; return [data[offset], data[offset + 1], data[offset + 2]]; };
    const observations = texts.map((record) => {
      let min = Infinity; let background;
      for (let y = Math.max(0, Math.ceil(record.y)); y < Math.min(info.height, record.y + record.height); y += 2) {
        for (let x = Math.max(0, Math.ceil(record.x)); x < Math.min(info.width, record.x + record.width); x += 2) {
          const bg = pixel(x, y), ratio = contrast(record.color, bg);
          if (ratio < min) { min = ratio; background = bg; }
        }
      }
      return { ...record, ratio: Number(min.toFixed(2)), background, pass: min >= record.threshold };
    });
    const borders = controls.map((control) => { const y = Math.round(control.y + control.height / 2); const backgrounds = [pixel(Math.floor(control.x) - 2, y), pixel(Math.ceil(control.x) + 2, y)]; const ratio = Math.min(...backgrounds.map((bg) => contrast(control.border, bg))); return { ...control, backgrounds, ratio: Number(ratio.toFixed(2)), pass: ratio >= 3 }; });
    const failed = observations.filter((record) => !record.pass);
    const state = { route, width, fonts, sampledFragments: observations.length, minimumTextRatio: Math.min(...observations.map((r) => r.ratio)), failures: failed, controls: borders, observations };
    results.states.push(state);
    console.log(JSON.stringify({ route, width, sampled: observations.length, failures: failed, borders }));
    await context.close();
  }
  }
  assert(results.states.every((state) => state.failures.length === 0 && state.controls.every((control) => control.pass)), "Há contrastes que precisam de revisão.");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); await new Promise((resolve) => server.close(resolve)); await fs.writeFile(path.join(output, "contrast-rendered.json"), JSON.stringify(results, null, 2)); });
