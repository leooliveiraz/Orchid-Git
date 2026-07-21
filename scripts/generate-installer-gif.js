const fs = require("fs");
const path = require("path");
const os = require("os");
const GIFEncoder = require("gif-encoder");
const { chromium } = require("playwright");

const FPS = 24;
const SECONDS = 1.5;
const TOTAL_FRAMES = FPS * SECONDS;

function buildHtml(css, iconBase64) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Orchid Git</title>
<style>${css}</style>
</head>
<body>
<div class="loading-container">
  <img alt="Orchid Git Logo" class="app-icon" src="data:image/png;base64,${iconBase64}">
  <h1 class="app-title">Orchid Git</h1>
  <div class="loader-wrapper">
    <div class="loader-bar"></div>
  </div>
</div>
</body>
</html>`;
}

async function generateIco() {
  const assetsDir = path.join(__dirname, "..", "src", "assets");
  const pngPath = path.join(assetsDir, "icon.png");
  const icoPath = path.join(assetsDir, "icon.ico");
  const icoStat = fs.existsSync(icoPath) ? fs.statSync(icoPath) : null;
  const pngStat = fs.statSync(pngPath);
  if (icoStat && icoStat.mtimeMs >= pngStat.mtimeMs) {
    console.log("ICO up-to-date");
    return;
  }
  console.log("Generating ICO...");
  const icoBuf = await import("png-to-ico").then(m => m.default(pngPath));
  fs.writeFileSync(icoPath, icoBuf);
  console.log(`Generated: ${icoPath} (${(icoBuf.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  const assetsDir = path.join(__dirname, "..", "src", "assets");
  const outPath = path.join(assetsDir, "installer-loading.gif");

  await generateIco();

  const css = fs.readFileSync(path.join(__dirname, "..", "src", "loading.css"), "utf8");
  const iconBytes = fs.readFileSync(path.join(assetsDir, "icon.png"));
  const iconBase64 = iconBytes.toString("base64");

  const html = buildHtml(css, iconBase64);
  const htmlPath = path.join(os.tmpdir(), `orchid-loading-${Date.now()}.html`);
  fs.writeFileSync(htmlPath, html, "utf8");

  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 360, height: 220 } });

  await page.goto("file://" + htmlPath, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const enc = new GIFEncoder(360, 220);
  enc.setRepeat(0);
  enc.setDelay(1000 / FPS);
  enc.setQuality(1);
  const chunks = [];
  enc.on("data", (c) => chunks.push(c));
  enc.on("end", () => {
    const gif = Buffer.concat(chunks);
    fs.writeFileSync(outPath, gif);
    console.log(`Generated: ${outPath} (${(gif.length / 1024).toFixed(1)} KB, ${TOTAL_FRAMES} frames, ${SECONDS}s)`);
  });
  enc.writeHeader();

  await page.evaluate(() => {
    const bar = document.querySelector(".loader-bar");
    bar.style.animationPlayState = "paused";
  });

  console.log("Capturing frames...");
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const totalTime = (f / TOTAL_FRAMES) * SECONDS;
    const cyclePosition = totalTime % 1.5;
    await page.evaluate((pos) => {
      document.querySelector(".loader-bar").style.animationDelay = `-${pos}s`;
    }, cyclePosition);
    await page.waitForTimeout(20);
    const buf = await page.screenshot({ type: "png" });
    const { PNG } = require("pngjs");
    const png = PNG.sync.read(buf);
    const rgba = Buffer.alloc(360 * 220 * 4);
    for (let y = 0; y < 220; y++) {
      for (let x = 0; x < 360; x++) {
        const si = (y * png.width + x) * 4;
        const di = (y * 360 + x) * 4;
        rgba[di] = png.data[si];
        rgba[di + 1] = png.data[si + 1];
        rgba[di + 2] = png.data[si + 2];
        rgba[di + 3] = 255;
      }
    }
    enc.addFrame(rgba);
  }

  enc.finish();
  await browser.close();
  try { fs.unlinkSync(htmlPath); } catch (e) {}
  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
