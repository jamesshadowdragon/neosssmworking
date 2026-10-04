import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, "dist");
const clientDir = path.resolve(distDir, "client");

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

function runPostbuild() {
  if (!fs.existsSync(clientDir)) {
    console.log("[postbuild] No dist/client folder found, skipping.");
    return;
  }

  // 1. Clean old dist/assets to avoid stale bundles
  const targetAssetsDir = path.resolve(distDir, "assets");
  if (fs.existsSync(targetAssetsDir)) {
    fs.rmSync(targetAssetsDir, { recursive: true, force: true });
  }

  // 2. Copy everything from dist/client into dist/ so Vercel finds /assets/... directly
  copyFolderSync(clientDir, distDir);

  // 3. Discover client assets
  const assetsDir = path.resolve(distDir, "assets");
  let entryJs = "";
  let entryCss = "";

  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter((f) => f.startsWith("index-") && f.endsWith(".js"));
    if (jsFiles.length > 0) {
      entryJs = `/assets/${jsFiles[0]}`;
    }
    const cssFiles = files.filter((f) => f.endsWith(".css"));
    if (cssFiles.length > 0) {
      entryCss = `/assets/${cssFiles[0]}`;
    }
  }

  // 3. Generate a robust SPA index.html for Vercel and static hosting
  const htmlContent = `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>NeoSMM Platform — Next-Gen Social Media Marketing Platform</title>
    <meta name="description" content="NeoSMM is a next-generation social media marketing platform for managed growth, content, advertising, and automated order fulfillment." />
    <meta name="author" content="NeoSMM" />
    <meta property="og:site_name" content="NeoSMM" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.png" type="image/png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap" />
    ${entryCss ? `<link rel="stylesheet" href="${entryCss}" />` : ""}
    <script>
      // Runtime shim to guarantee AsyncLocalStorage is never undefined in browser
      if (typeof globalThis !== 'undefined' && !globalThis.AsyncLocalStorage) {
        globalThis.AsyncLocalStorage = class AsyncLocalStorage {
          constructor() { this._store = undefined; }
          getStore() { return this._store; }
          run(store, fn, ...args) {
            const prev = this._store;
            this._store = store;
            try { return fn(...args); } finally { this._store = prev; }
          }
          enterWith(store) { this._store = store; }
          disable() { this._store = undefined; }
        };
      }
      // Immediate theme initialization
      (function(){
        try {
          var t = localStorage.getItem('neo-mart-theme') || 'dark';
          var c = document.documentElement.classList;
          c.remove('dark', 'light');
          c.add(t);
        } catch(e) {}
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    ${entryJs ? `<script type="module" crossorigin src="${entryJs}"></script>` : ""}
  </body>
</html>
`;

  fs.writeFileSync(path.resolve(distDir, "index.html"), htmlContent, "utf-8");
  fs.writeFileSync(path.resolve(clientDir, "index.html"), htmlContent, "utf-8");
  console.log(
    `[postbuild] Generated production index.html with entry: ${entryJs} and css: ${entryCss}`,
  );
}

runPostbuild();
