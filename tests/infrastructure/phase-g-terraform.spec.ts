import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const TERRAFORM_DIR = path.join(ROOT_DIR, 'infrastructure/terraform');

function validateHclSyntax(content: string, filePath: string): void {
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = i + 1 < content.length ? content[i + 1] : '';

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '#' || (char === '/' && nextChar === '/')) {
      inLineComment = true;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
    else if (char === '[') bracketCount++;
    else if (char === ']') bracketCount--;
  }

  assert.strictEqual(braceCount, 0, `Unclosed braces in ${filePath}`);
  assert.strictEqual(bracketCount, 0, `Unclosed brackets in ${filePath}`);
}

describe('Phase G: Terraform Cloud Plumbing Modules Verification', () => {
  const newModules = [
    'modules/pubsub/main.tf',
    'modules/pubsub/variables.tf',
    'modules/pubsub/outputs.tf',
    'modules/cloudtasks/main.tf',
    'modules/cloudtasks/variables.tf',
    'modules/cloudtasks/outputs.tf',
    'modules/scheduler/main.tf',
    'modules/scheduler/variables.tf',
    'modules/scheduler/outputs.tf',
    'modules/bigquery/main.tf',
    'modules/bigquery/variables.tf',
    'modules/bigquery/outputs.tf',
    'modules/secretmanager/main.tf',
    'modules/secretmanager/variables.tf',
    'modules/secretmanager/outputs.tf',
    'modules/cloudarmor/main.tf',
    'modules/cloudarmor/variables.tf',
    'modules/cloudarmor/outputs.tf',
    'modules/loadbalancer/main.tf',
    'modules/loadbalancer/variables.tf',
    'modules/loadbalancer/outputs.tf',
    'modules/storage/main.tf',
    'modules/storage/variables.tf',
    'modules/storage/outputs.tf',
    'modules/kms/main.tf',
    'modules/kms/variables.tf',
    'modules/kms/outputs.tf',
    'environments/staging/main.tf',
    'environments/staging/variables.tf',
    'environments/staging/terraform.tfvars.example',
  ];

  it('should verify all Phase G terraform files exist and have balanced HCL syntax', () => {
    for (const relPath of newModules) {
      const fullPath = path.join(TERRAFORM_DIR, relPath);
      assert.ok(fs.existsSync(fullPath), `Expected ${relPath} to exist`);
      const content = fs.readFileSync(fullPath, 'utf-8');
      assert.ok(content.length > 0, `${relPath} must not be empty`);
      validateHclSyntax(content, relPath);
    }
  });

  it('should verify environments (dev, staging, prod) maintain separation and all cloud modules', () => {
    for (const env of ['dev', 'staging', 'prod']) {
      const mainPath = path.join(TERRAFORM_DIR, `environments/${env}/main.tf`);
      assert.ok(fs.existsSync(mainPath), `${env} main.tf must exist`);
      const content = fs.readFileSync(mainPath, 'utf-8');

      assert.match(content, /module\s+"pubsub"/, `${env} must define pubsub module`);
      assert.match(content, /module\s+"cloudtasks"/, `${env} must define cloudtasks module`);
      assert.match(content, /module\s+"scheduler"/, `${env} must define scheduler module`);
      assert.match(content, /module\s+"bigquery"/, `${env} must define bigquery module`);
      assert.match(content, /module\s+"secretmanager"/, `${env} must define secretmanager module`);
      assert.match(content, /module\s+"cloudarmor"/, `${env} must define cloudarmor module`);
      assert.match(content, /module\s+"loadbalancer"/, `${env} must define loadbalancer module`);
      assert.match(content, /module\s+"storage"/, `${env} must define storage module`);
      assert.match(content, /module\s+"kms"/, `${env} must define kms module`);
    }
  });
});
