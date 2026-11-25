import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

const BANNED_BRAND_PATTERN =
  /\b(swiggy|blinkit|blinkgrocery|rapido|porter|zomato|zepto|uber|dunzo)\b/i;

const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  '.dart_tool',
  '.git',
  'coverage',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.dart',
  '.json',
  '.arb',
  '.yaml',
  '.yml',
]);

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, acc);
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Brand Naming Guardrail', () => {
  it('contains zero third-party competitor brand names across apps, packages, and services', () => {
    const roots = [
      path.join(ROOT, 'apps'),
      path.join(ROOT, 'packages'),
      path.join(ROOT, 'services'),
    ];
    const violations: string[] = [];

    for (const root of roots) {
      for (const file of walkFiles(root)) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const match = lines[i].match(BANNED_BRAND_PATTERN);
          if (match) {
            const rel = path.relative(ROOT, file).replace(/\\/g, '/');
            violations.push(`${rel}:${i + 1} matched "${match[0]}": ${lines[i].trim()}`);
          }
        }
      }
    }

    assert.deepEqual(violations, []);
  });
});
