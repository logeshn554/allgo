import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const ROOT_DIR = path.resolve(import.meta.dirname, '../../../');

export const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  '.dart_tool',
  'build',
  '.git',
  '.agents',
  '.gemini',
  'coverage',
  '.turbo',
  'out',
]);

export const TARGET_PROJECTS = {
  mobileShared: path.join(ROOT_DIR, 'packages/mobile_shared'),
  customerMobile: path.join(ROOT_DIR, 'apps/customer_mobile'),
  partnerMobile: path.join(ROOT_DIR, 'apps/partner_mobile'),
  merchantMobile: path.join(ROOT_DIR, 'apps/merchant_mobile'),
  admin: path.join(ROOT_DIR, 'apps/admin'),
  api: path.join(ROOT_DIR, 'services/api'),
} as const;

export const REORG_FEATURES = [
  {
    id: 1,
    name: 'mobile_shared API Client Decomposition',
    project: 'packages/mobile_shared',
    milestone: 'M1',
  },
  {
    id: 2,
    name: 'mobile_shared Models & Structure Reorg',
    project: 'packages/mobile_shared',
    milestone: 'M1',
  },
  {
    id: 3,
    name: 'customer_mobile Home & Outlets Modularization',
    project: 'apps/customer_mobile',
    milestone: 'M2',
  },
  {
    id: 4,
    name: 'customer_mobile Mobility & Parcels Modularization',
    project: 'apps/customer_mobile',
    milestone: 'M2',
  },
  {
    id: 5,
    name: 'customer_mobile Checkout & Orders Modularization',
    project: 'apps/customer_mobile',
    milestone: 'M2',
  },
  {
    id: 6,
    name: 'customer_mobile Directory Structure R1 Migration',
    project: 'apps/customer_mobile',
    milestone: 'M2',
  },
  {
    id: 7,
    name: 'partner_mobile Home Shell & Registration Decomposition',
    project: 'apps/partner_mobile',
    milestone: 'M3',
  },
  {
    id: 8,
    name: 'merchant_mobile Dashboard Shell Decomposition',
    project: 'apps/merchant_mobile',
    milestone: 'M3',
  },
  {
    id: 9,
    name: 'merchant_mobile Operating Hours & Registration Decomposition',
    project: 'apps/merchant_mobile',
    milestone: 'M3',
  },
  {
    id: 10,
    name: 'Partner & Merchant R1 Directory Migration',
    project: 'apps/partner_mobile & apps/merchant_mobile',
    milestone: 'M3',
  },
  {
    id: 11,
    name: 'admin API Client & State Modularization',
    project: 'apps/admin',
    milestone: 'M4',
  },
  { id: 12, name: 'admin Heavy Pages Decomposition', project: 'apps/admin', milestone: 'M4' },
  {
    id: 13,
    name: 'api Merchant & Catalog Services Decomposition',
    project: 'apps/api',
    milestone: 'M5',
  },
  {
    id: 14,
    name: 'api Parcels & Orders Services Decomposition',
    project: 'apps/api',
    milestone: 'M5',
  },
  {
    id: 15,
    name: 'api Mobility, Zones & Finance Decomposition',
    project: 'apps/api',
    milestone: 'M5',
  },
  { id: 16, name: 'api ESM NodeNext Extension Compliance', project: 'apps/api', milestone: 'M5' },
  {
    id: 17,
    name: 'Comprehensive Monorepo Verification & Test Suites',
    project: 'All 6 Targets',
    milestone: 'M6',
  },
] as const;

export interface LineMetrics {
  totalLines: number;
  nonEmptyLines: number;
  trimmedLength: number;
  rawContent: string;
}

export interface DartImportInfo {
  packageImports: string[];
  relativeImports: string[];
  exports: string[];
}

export interface RelativeImportCheck {
  importPath: string;
  hasJsExtension: boolean;
  line: number;
}

export interface BoundaryValidationResult {
  filePath: string;
  totalLines: number;
  nonEmptyLines: number;
  isWithinLimit: boolean;
  isNonEmpty: boolean;
  isNonWhitespace: boolean;
  error?: string;
}

export interface ProjectAuditResult {
  projectDir: string;
  totalFiles: number;
  filesWithinLimit: string[];
  filesExceedingLimit: { filePath: string; lines: number }[];
  maxLines: number;
  maxLineFile?: string;
}

/**
 * Calculates exact line count handling CRLF and LF uniformly.
 */
export function getLineCount(filePath: string): number {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.length === 0) {
    return 0;
  }
  return content.split(/\r?\n/).length;
}

/**
 * Retrieves line count and content metrics.
 */
export function getLineMetrics(filePath: string): LineMetrics {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const lines = rawContent.split(/\r?\n/);
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0).length;
  return {
    totalLines: rawContent.length === 0 ? 0 : lines.length,
    nonEmptyLines,
    trimmedLength: rawContent.trim().length,
    rawContent,
  };
}

/**
 * Validates that a file contains non-trivial code (trimmed length > 0).
 */
export function isNonTrivialFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    return false;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.trim().length > 0;
}

/**
 * Recursively scans a directory for source files matching given extensions,
 * ignoring build artifacts, caches, and tooling directories.
 */
export function findSourceFiles(
  dirPath: string,
  extensions: string[] = ['.dart', '.ts', '.tsx'],
): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dirPath)) {
    return results;
  }

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          walk(path.join(currentDir, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          results.push(path.join(currentDir, entry.name));
        }
      }
    }
  }

  walk(dirPath);
  return results;
}

/**
 * Extracts Dart package imports, relative imports, and export declarations.
 */
export function extractDartImports(sourceCode: string): DartImportInfo {
  const packageImports: string[] = [];
  const relativeImports: string[] = [];
  const exports: string[] = [];

  const importRegex = /import\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(sourceCode)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('package:')) {
      packageImports.push(importPath);
    } else {
      relativeImports.push(importPath);
    }
  }

  const exportRegex = /export\s+['"]([^'"]+)['"]/g;
  while ((match = exportRegex.exec(sourceCode)) !== null) {
    exports.push(match[1]);
  }

  return { packageImports, relativeImports, exports };
}

/**
 * Inspects all relative imports in a TypeScript / JavaScript file and checks
 * whether they include explicit `.js` extensions (ESM NodeNext requirement).
 */
export function inspectRelativeImports(sourceCode: string): RelativeImportCheck[] {
  const checks: RelativeImportCheck[] = [];
  const lines = sourceCode.split(/\r?\n/);

  const importExportRegex = /(?:import|export)\s+(?:[\w*\s{},]*\s+from\s+)?['"](\.[^'"]+)['"]/g;

  lines.forEach((lineText, index) => {
    // Ignore pure comments
    const trimmed = lineText.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      return;
    }

    let match: RegExpExecArray | null;
    while ((match = importExportRegex.exec(lineText)) !== null) {
      const importPath = match[1];
      const hasJs = importPath.endsWith('.js') || importPath.endsWith('.json');
      checks.push({
        importPath,
        hasJsExtension: hasJs,
        line: index + 1,
      });
    }
  });

  return checks;
}

/**
 * Verifies that a re-export bridge exists and points to the new destination.
 */
export function verifyReexportBridge(
  bridgeFilePath: string,
  targetPattern: string | RegExp,
): { exists: boolean; validExport: boolean; content: string } {
  if (!fs.existsSync(bridgeFilePath)) {
    return { exists: false, validExport: false, content: '' };
  }
  const content = fs.readFileSync(bridgeFilePath, 'utf-8');
  const validExport =
    typeof targetPattern === 'string'
      ? content.includes(targetPattern)
      : targetPattern.test(content);

  return {
    exists: true,
    validExport,
    content,
  };
}

/**
 * Validates a single file against boundary limits (LOC <= maxLoc, non-empty, non-whitespace).
 */
export function validateFileBoundaries(filePath: string, maxLoc = 300): BoundaryValidationResult {
  const metrics = getLineMetrics(filePath);
  const isWithinLimit = metrics.totalLines <= maxLoc;
  const isNonEmpty = metrics.totalLines > 0;
  const isNonWhitespace = metrics.trimmedLength > 0;

  let error: string | undefined;
  if (!isNonEmpty) {
    error = `File is empty (0 LOC)`;
  } else if (!isNonWhitespace) {
    error = `File contains only whitespace/empty lines`;
  } else if (!isWithinLimit) {
    error = `File exceeds ${maxLoc} LOC (${metrics.totalLines} lines)`;
  }

  return {
    filePath,
    totalLines: metrics.totalLines,
    nonEmptyLines: metrics.nonEmptyLines,
    isWithinLimit,
    isNonEmpty,
    isNonWhitespace,
    error,
  };
}

/**
 * Audits all source files in a project against the LOC ceiling.
 */
export function auditProjectLOC(projectDir: string, maxLoc = 300): ProjectAuditResult {
  const files = findSourceFiles(projectDir);
  const filesWithinLimit: string[] = [];
  const filesExceedingLimit: { filePath: string; lines: number }[] = [];
  let maxLines = 0;
  let maxLineFile: string | undefined;

  for (const f of files) {
    const lines = getLineCount(f);
    if (lines > maxLines) {
      maxLines = lines;
      maxLineFile = f;
    }
    if (lines <= maxLoc) {
      filesWithinLimit.push(f);
    } else {
      filesExceedingLimit.push({ filePath: f, lines });
    }
  }

  return {
    projectDir,
    totalFiles: files.length,
    filesWithinLimit,
    filesExceedingLimit,
    maxLines,
    maxLineFile,
  };
}

/**
 * Helper to run child command synchronously and capture results cleanly.
 */
export function runCommand(
  cmd: string,
  args: string[],
  cwd: string = ROOT_DIR,
  timeoutMs = 60000,
): { status: number | null; stdout: string; stderr: string; error?: Error } {
  const res = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf-8',
    shell: true,
    timeout: timeoutMs,
    env: process.env,
  });

  return {
    status: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    error: res.error,
  };
}
