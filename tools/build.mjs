import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const JS_ENTRY = path.join(ROOT, 'src', 'main.js');
const HTML_ENTRY = path.join(ROOT, 'index.html');
const CSS_FILES = [
  'styles/tokens.css',
  'styles/base.css',
  'styles/layout.css',
  'styles/components.css',
  'styles/animations.css',
  'styles/modal.css',
  'styles/scrollbars.css',
];

function cleanDist() {
  fs.rmSync(DIST, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
}

function writeHashedFile(baseName, ext, content) {
  const hash = hashContent(content);
  const fileName = `${baseName}.${hash}.${ext}`;
  const outPath = path.join(DIST, fileName);
  fs.writeFileSync(outPath, content, 'utf8');
  return fileName;
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
    return;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

async function buildJs() {
  const esbuild = (await import('esbuild')).default;
  const { minify: terserMinify } = await import('terser');
  const JavaScriptObfuscator = (await import('javascript-obfuscator')).default;

  const bundleResult = await esbuild.build({
    entryPoints: [JS_ENTRY],
    bundle: true,
    format: 'iife',
    write: false,
    platform: 'browser',
    target: ['es2019'],
    sourcemap: false,
    minify: false,
    legalComments: 'none',
  });

  const bundledCode = bundleResult.outputFiles[0].text;

  const terserResult = await terserMinify(bundledCode, {
    compress: {
      drop_console: true,
      drop_debugger: true,
      passes: 2,
    },
    mangle: {
      toplevel: true,
    },
    format: {
      comments: false,
    },
  });

  if (!terserResult.code) {
    throw new Error('Terser produced empty output.');
  }

  const debugProtectionEnabled = process.env.OBFUSCATE_DEBUG_PROTECTION !== 'false';
  const moderateHardening = process.env.OBFUSCATE_MODERATE_HARDENING === 'true';

  const obfuscated = JavaScriptObfuscator.obfuscate(terserResult.code, {
    compact: true,
    selfDefending: true,
    disableConsoleOutput: true,
    debugProtection: debugProtectionEnabled,
    debugProtectionInterval: debugProtectionEnabled ? 15000 : 0,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.8,
    splitStrings: false,
    renameGlobals: false,
    reservedNames: ['^VK$', '^vkBridge$'],
    reservedStrings: ['VKWebApp', 'vkBridge'],
    controlFlowFlattening: moderateHardening,
    controlFlowFlatteningThreshold: moderateHardening ? 0.15 : 0,
    deadCodeInjection: moderateHardening,
    deadCodeInjectionThreshold: moderateHardening ? 0.05 : 0,
  });

  return obfuscated.getObfuscatedCode();
}

async function buildCss() {
  const CleanCSS = (await import('clean-css')).default;
  const content = CSS_FILES
    .map((file) => fs.readFileSync(path.join(ROOT, file), 'utf8'))
    .join('\n');

  const result = new CleanCSS({ level: 2 }).minify(content);
  if (result.errors.length > 0) {
    throw new Error(result.errors.join('\n'));
  }
  return result.styles;
}

async function buildHtml(cssFile, jsFile) {
  const { minify: htmlMinify } = await import('html-minifier-terser');
  let html = fs.readFileSync(HTML_ENTRY, 'utf8');

  html = html.replace(/\n\s*<link rel="stylesheet" href="\.\/styles\/[^\"]+" \/>/g, '');
  html = html.replace(
    /<script type="module" src="\.\/src\/main\.js"><\/script>/,
    `<script defer src="./${jsFile}"></script>`
  );

  html = html.replace(
    '</head>',
    `  <link rel="stylesheet" href="./${cssFile}" />\n</head>`
  );

  return htmlMinify(html, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    minifyJS: false,
    minifyCSS: false,
  });
}

function copyAssets() {
  for (const dir of ['assets', 'public']) {
    const src = path.join(ROOT, dir);
    if (fs.existsSync(src)) {
      copyRecursive(src, path.join(DIST, dir));
    }
  }

  for (const file of ['CNAME']) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(DIST, file));
    }
  }
}

async function runBuild() {
  ensureDir(DIST);
  execFileSync('node', [path.join('scripts', 'check-secrets.mjs')], { stdio: 'inherit' });

  const jsCode = await buildJs();
  const cssCode = await buildCss();

  const jsFile = writeHashedFile('app', 'js', jsCode);
  const cssFile = writeHashedFile('styles', 'css', cssCode);

  const html = await buildHtml(cssFile, jsFile);
  fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');

  copyAssets();

  console.log('[build] done');
  console.log(`[build] js: ${jsFile}`);
  console.log(`[build] css: ${cssFile}`);
}

async function main() {
  const isCleanOnly = process.argv.includes('--clean');
  cleanDist();

  if (isCleanOnly) {
    console.log('[clean] dist removed');
    return;
  }

  await runBuild();
}

main().catch((error) => {
  console.error('[build] failed');
  console.error(error);
  process.exit(1);
});
