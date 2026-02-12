import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const BLOCKED_PATTERN = /\b(API_KEY|SECRET|TOKEN)\b/g;
const ALLOWED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.json', '.html', '.css']);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(fullPath));
      continue;
    }

    if (ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(fullPath);
    }
  }
  return out;
}

if (!fs.existsSync(SRC_DIR)) {
  console.log('[check:secrets] src directory does not exist, skipping check.');
  process.exit(0);
}

const violations = [];
for (const filePath of walk(SRC_DIR)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    BLOCKED_PATTERN.lastIndex = 0;
    if (BLOCKED_PATTERN.test(lines[i])) {
      violations.push(`${path.relative(ROOT, filePath)}:${i + 1}: ${lines[i].trim()}`);
    }
  }
}

if (violations.length > 0) {
  console.error('[check:secrets] Found suspicious secret markers:');
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log('[check:secrets] OK');
