/**
 * Renders /preview/add, /preview/health, /preview/export in production mode and
 * writes PNGs to public/marketing/ for the landing page static tiles.
 *
 * Prerequisites: `npm run build` then run this script (or use npm run capture:marketing-static).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "marketing");
const port = process.env.CAPTURE_PORT || "4017";
const base = `http://127.0.0.1:${port}`;

const shots = [
  { route: "/preview/add", light: "preview-add-light.png", dark: "preview-add-dark.png" },
  { route: "/preview/health", light: "preview-health-light.png", dark: "preview-health-dark.png" },
  { route: "/preview/export", light: "preview-export-light.png", dark: "preview-export-dark.png" },
];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitReady() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(base, { method: "GET" });
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await delay(500);
  }
  throw new Error(`Server at ${base} did not become ready in time`);
}

function applyThemeInPage(mode) {
  const rootEl = document.documentElement;
  rootEl.classList.remove("light", "dark");
  rootEl.classList.add(mode);
  rootEl.classList.remove("theme-gold", "theme-blue", "theme-red", "theme-yellow");
  rootEl.classList.add("theme-gold");
}

(async () => {
  if (!fs.existsSync(path.join(root, ".next"))) {
    console.error("Missing .next — run `npm run build` first.");
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const server = spawn("npx", ["next", "start", "-p", port], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PORT: port },
  });

  let exitCode = 0;
  try {
    await waitReady();

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
      deviceScaleFactor: 2,
    });

    for (const s of shots) {
      for (const mode of ["light", "dark"]) {
        const page = await context.newPage();
        const url = `${base}${s.route}`;
        await page.goto(url, { waitUntil: "load", timeout: 180000 });
        await page.evaluate(applyThemeInPage, mode);
        await delay(mode === "dark" ? 3200 : 2800);
        const filename = mode === "light" ? s.light : s.dark;
        await page.screenshot({
          path: path.join(outDir, filename),
          fullPage: false,
          type: "png",
        });
        await page.close();
        console.log("Wrote", path.join("public/marketing", filename));
      }
    }

    await browser.close();
  } catch (err) {
    console.error(err);
    exitCode = 1;
  } finally {
    server.kill("SIGTERM");
    await delay(500);
    if (!server.killed) {
      server.kill("SIGKILL");
    }
  }

  process.exit(exitCode);
})();
