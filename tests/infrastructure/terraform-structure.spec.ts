import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../');
const TERRAFORM_DIR = path.join(ROOT_DIR, 'infrastructure/terraform');

/**
 * Validates balanced braces and brackets in HCL code, ignoring strings and comments.
 */
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
      if (char === '\n') {
        inLineComment = false;
      }
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
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    // Check comment starters
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
    else if (char === '}') {
      braceCount--;
      assert.ok(
        braceCount >= 0,
        `Unexpected closing brace '}' in ${filePath} at offset ${i}`
      );
    } else if (char === '[') bracketCount++;
    else if (char === ']') {
      bracketCount--;
      assert.ok(
        bracketCount >= 0,
        `Unexpected closing bracket ']' in ${filePath} at offset ${i}`
      );
    }
  }

  assert.strictEqual(
    braceCount,
    0,
    `Unclosed braces in ${filePath}: count is ${braceCount}`
  );
  assert.strictEqual(
    bracketCount,
    0,
    `Unclosed brackets in ${filePath}: count is ${bracketCount}`
  );
}

describe('Parameterized GCP Terraform Skeleton & IAM Plan', () => {
  const expectedFiles = [
    'modules/vpc/main.tf',
    'modules/vpc/variables.tf',
    'modules/vpc/outputs.tf',
    'modules/cloudsql/main.tf',
    'modules/cloudsql/variables.tf',
    'modules/cloudsql/outputs.tf',
    'modules/redis/main.tf',
    'modules/redis/variables.tf',
    'modules/redis/outputs.tf',
    'modules/cloudrun/main.tf',
    'modules/cloudrun/variables.tf',
    'modules/cloudrun/outputs.tf',
    'modules/iam/main.tf',
    'modules/iam/variables.tf',
    'modules/iam/outputs.tf',
    'modules/monitoring/main.tf',
    'modules/monitoring/variables.tf',
    'environments/dev/main.tf',
    'environments/dev/variables.tf',
    'environments/dev/terraform.tfvars.example',
    'environments/prod/main.tf',
    'environments/prod/variables.tf',
    'environments/prod/terraform.tfvars.example',
  ];

  describe('File Existence & Completeness', () => {
    for (const relPath of expectedFiles) {
      it(`should have terraform file: ${relPath}`, () => {
        const fullPath = path.join(TERRAFORM_DIR, relPath);
        assert.ok(fs.existsSync(fullPath), `Expected file to exist: ${relPath}`);
        const content = fs.readFileSync(fullPath, 'utf-8');
        assert.ok(content.trim().length > 0, `File should not be empty: ${relPath}`);
      });
    }
  });

  describe('HCL Syntax & Structural Integrity', () => {
    for (const relPath of expectedFiles) {
      it(`should have balanced braces and brackets in ${relPath}`, () => {
        const fullPath = path.join(TERRAFORM_DIR, relPath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          validateHclSyntax(content, relPath);
        } else {
          assert.fail(`Missing file for syntax check: ${relPath}`);
        }
      });
    }
  });

  describe('VPC Module (infrastructure/terraform/modules/vpc)', () => {
    it('should define VPC network, subnet, private service connection, and VPC connector', () => {
      const mainPath = path.join(TERRAFORM_DIR, 'modules/vpc/main.tf');
      assert.ok(fs.existsSync(mainPath), 'modules/vpc/main.tf must exist');
      const content = fs.readFileSync(mainPath, 'utf-8');

      assert.match(content, /resource\s+"google_compute_network"/, 'VPC network resource required');
      assert.match(content, /resource\s+"google_compute_subnetwork"/, 'Subnetwork resource required');
      assert.match(
        content,
        /resource\s+"google_service_networking_connection"/,
        'Private service networking connection required for Cloud SQL and Redis'
      );
      assert.match(
        content,
        /resource\s+"google_vpc_access_connector"/,
        'Serverless VPC Access connector required for Cloud Run egress'
      );
    });

    it('should export network_id, subnet_id, and vpc_connector_id', () => {
      const outputsPath = path.join(TERRAFORM_DIR, 'modules/vpc/outputs.tf');
      assert.ok(fs.existsSync(outputsPath), 'modules/vpc/outputs.tf must exist');
      const content = fs.readFileSync(outputsPath, 'utf-8');

      assert.match(content, /output\s+"network_id"/, 'output network_id required');
      assert.match(content, /output\s+"subnet_id"/, 'output subnet_id required');
      assert.match(content, /output\s+"vpc_connector_id"/, 'output vpc_connector_id required');
    });
  });

  describe('Cloud SQL Module (infrastructure/terraform/modules/cloudsql)', () => {
    it('should configure PostgreSQL 15, private IP, and PostGIS extension flags', () => {
      const mainPath = path.join(TERRAFORM_DIR, 'modules/cloudsql/main.tf');
      assert.ok(fs.existsSync(mainPath), 'modules/cloudsql/main.tf must exist');
      const content = fs.readFileSync(mainPath, 'utf-8');

      assert.match(content, /resource\s+"google_sql_database_instance"/, 'Cloud SQL instance resource required');
      assert.match(content, /POSTGRES_15/, 'PostgreSQL 15 required');
      assert.match(content, /ipv4_enabled\s*=\s*false/, 'Public IPv4 must be disabled (private IP only)');
      assert.match(content, /private_network/, 'Private network configuration required');
      assert.match(content, /availability_type/, 'availability_type must be parameterized');
      assert.match(content, /point_in_time_recovery_enabled/, 'PITR must be parameterized');
    });

    it('should define variables for environment, tier, availability_type, and pitr_enabled', () => {
      const varsPath = path.join(TERRAFORM_DIR, 'modules/cloudsql/variables.tf');
      assert.ok(fs.existsSync(varsPath), 'modules/cloudsql/variables.tf must exist');
      const content = fs.readFileSync(varsPath, 'utf-8');

      assert.match(content, /variable\s+"availability_type"/, 'availability_type variable required');
      assert.match(content, /variable\s+"pitr_enabled"/, 'pitr_enabled variable required');
      assert.match(content, /variable\s+"tier"/, 'tier variable required');
    });
  });

  describe('Memorystore Redis Module (infrastructure/terraform/modules/redis)', () => {
    it('should configure Redis 7.0 with private service access and parameterized tier', () => {
      const mainPath = path.join(TERRAFORM_DIR, 'modules/redis/main.tf');
      assert.ok(fs.existsSync(mainPath), 'modules/redis/main.tf must exist');
      const content = fs.readFileSync(mainPath, 'utf-8');

      assert.match(content, /resource\s+"google_redis_instance"/, 'Redis instance resource required');
      assert.match(content, /REDIS_7_0/, 'Redis 7.0 required');
      assert.match(content, /connect_mode\s*=\s*"PRIVATE_SERVICE_ACCESS"/, 'Private Service Access required');
      assert.match(content, /memory_size_gb/, 'memory_size_gb must be parameterized');
      assert.match(content, /tier/, 'tier must be parameterized');
    });

    it('should export host and port', () => {
      const outputsPath = path.join(TERRAFORM_DIR, 'modules/redis/outputs.tf');
      assert.ok(fs.existsSync(outputsPath), 'modules/redis/outputs.tf must exist');
      const content = fs.readFileSync(outputsPath, 'utf-8');

      assert.match(content, /output\s+"host"/, 'output host required');
      assert.match(content, /output\s+"port"/, 'output port required');
    });
  });

  describe('Cloud Run Module (infrastructure/terraform/modules/cloudrun)', () => {
    it('should configure consolidated 3 services with VPC access and scaling bounds', () => {
      const mainPath = path.join(TERRAFORM_DIR, 'modules/cloudrun/main.tf');
      assert.ok(fs.existsSync(mainPath), 'modules/cloudrun/main.tf must exist');
      const content = fs.readFileSync(mainPath, 'utf-8');

      assert.match(content, /resource\s+"google_cloud_run_v2_service"/, 'Cloud Run v2 service resource required');
      assert.match(content, /min_instance_count/, 'min_instance_count scaling required');
      assert.match(content, /max_instance_count/, 'max_instance_count scaling required');
      assert.match(content, /vpc_access/, 'VPC access egress configuration required');
    });

    it('should declare variables for services map and service accounts', () => {
      const varsPath = path.join(TERRAFORM_DIR, 'modules/cloudrun/variables.tf');
      assert.ok(fs.existsSync(varsPath), 'modules/cloudrun/variables.tf must exist');
      const content = fs.readFileSync(varsPath, 'utf-8');

      assert.match(content, /variable\s+"services"/, 'services variable required');
      assert.match(content, /variable\s+"service_accounts"/, 'service_accounts variable required');
    });
  });

  describe('IAM Module (infrastructure/terraform/modules/iam)', () => {
    it('should provision sa-api, sa-dispatch, sa-webhooks, and sa-worker with least privilege', () => {
      const mainPath = path.join(TERRAFORM_DIR, 'modules/iam/main.tf');
      assert.ok(fs.existsSync(mainPath), 'modules/iam/main.tf must exist');
      const content = fs.readFileSync(mainPath, 'utf-8');

      assert.match(content, /sa-api/, 'Service account sa-api required');
      assert.match(content, /sa-dispatch/, 'Service account sa-dispatch required');
      assert.match(content, /sa-webhooks/, 'Service account sa-webhooks required');
      assert.match(content, /sa-worker/, 'Service account sa-worker required');

      // Least-privilege roles
      assert.match(content, /roles\/cloudsql\.client/, 'roles/cloudsql.client required');
      assert.match(content, /roles\/secretmanager\.secretAccessor/, 'roles/secretmanager.secretAccessor required');
      assert.match(content, /roles\/pubsub\.publisher/, 'roles/pubsub.publisher required');
    });

    it('should output all service account emails', () => {
      const outputsPath = path.join(TERRAFORM_DIR, 'modules/iam/outputs.tf');
      assert.ok(fs.existsSync(outputsPath), 'modules/iam/outputs.tf must exist');
      const content = fs.readFileSync(outputsPath, 'utf-8');

      assert.match(content, /output\s+"service_account_emails"/, 'output service_account_emails required');
      assert.match(content, /output\s+"sa_api_email"/, 'output sa_api_email required');
      assert.match(content, /output\s+"sa_dispatch_email"/, 'output sa_dispatch_email required');
      assert.match(content, /output\s+"sa_webhooks_email"/, 'output sa_webhooks_email required');
      assert.match(content, /output\s+"sa_worker_email"/, 'output sa_worker_email required');
    });
  });

  describe('Monitoring Module (infrastructure/terraform/modules/monitoring)', () => {
    it('should configure budget alerts at 50%, 80%, and 100%, quotas, and overnight scheduler', () => {
      const mainPath = path.join(TERRAFORM_DIR, 'modules/monitoring/main.tf');
      assert.ok(fs.existsSync(mainPath), 'modules/monitoring/main.tf must exist');
      const content = fs.readFileSync(mainPath, 'utf-8');

      assert.match(content, /resource\s+"google_billing_budget"/, 'google_billing_budget resource required');
      // Verify threshold percentages
      assert.match(content, /threshold_percent\s*=\s*0\.5/, '50% budget threshold rule required');
      assert.match(content, /threshold_percent\s*=\s*0\.8/, '80% budget threshold rule required');
      assert.match(content, /threshold_percent\s*=\s*1\.0/, '100% budget threshold rule required');

      // Scheduler for dev overnight shutdown
      assert.match(content, /resource\s+"google_cloud_scheduler_job"/, 'google_cloud_scheduler_job required');

      // Quotas / alert policies for Google Maps and Firebase Auth
      assert.match(content, /resource\s+"google_monitoring_alert_policy"/, 'Monitoring alert policy required');
    });
  });

  describe('Dev Environment (infrastructure/terraform/environments/dev)', () => {
    it('should configure asia-south1, single-zone DB, Basic Redis (1GB), scale-to-zero (min_instances=0), and overnight shutdown', () => {
      const mainPath = path.join(TERRAFORM_DIR, 'environments/dev/main.tf');
      assert.ok(fs.existsSync(mainPath), 'environments/dev/main.tf must exist');
      const content = fs.readFileSync(mainPath, 'utf-8');

      // Region check
      assert.match(content, /asia-south1/, 'Region must be asia-south1 (Mumbai)');

      // Cloud SQL check: ZONAL, pitr_enabled = false
      assert.match(content, /availability_type\s*=\s*"ZONAL"/, 'Dev DB must be ZONAL (single-zone)');
      assert.match(content, /pitr_enabled\s*=\s*false/, 'Dev DB must have PITR disabled');

      // Redis check: BASIC, 1 GB
      assert.match(content, /tier\s*=\s*"BASIC"/, 'Dev Redis must be BASIC tier');
      assert.match(content, /memory_size_gb\s*=\s*1\b/, 'Dev Redis must be 1 GB');

      // Cloud Run: min_instances = 0 for api, dispatch, webhooks
      assert.match(content, /api\s*=\s*{[\s\S]*?min_instances\s*=\s*0/, 'Dev api must have min_instances = 0');
      assert.match(content, /dispatch\s*=\s*{[\s\S]*?min_instances\s*=\s*0/, 'Dev dispatch must have min_instances = 0');
      assert.match(content, /webhooks\s*=\s*{[\s\S]*?min_instances\s*=\s*0/, 'Dev webhooks must have min_instances = 0');

      // Overnight shutdown enabled
      assert.match(content, /enable_overnight_shutdown\s*=\s*true/, 'Dev must enable overnight shutdown');
    });

    it('should have dev variables and tfvars.example defining budget ceiling', () => {
      const varsPath = path.join(TERRAFORM_DIR, 'environments/dev/variables.tf');
      const tfvarsPath = path.join(TERRAFORM_DIR, 'environments/dev/terraform.tfvars.example');
      assert.ok(fs.existsSync(varsPath), 'variables.tf must exist');
      assert.ok(fs.existsSync(tfvarsPath), 'terraform.tfvars.example must exist');

      const varsContent = fs.readFileSync(varsPath, 'utf-8');
      assert.match(varsContent, /variable\s+"budget_amount_inr"/, 'budget_amount_inr variable required');
      assert.match(varsContent, /default\s*=\s*"asia-south1"/, 'Default region must be asia-south1');
    });
  });

  describe('Prod Environment (infrastructure/terraform/environments/prod)', () => {
    it('should configure asia-south1, Regional HA DB + PITR, Standard HA Redis, min_instances=1 (api & dispatch), and overnight shutdown disabled', () => {
      const mainPath = path.join(TERRAFORM_DIR, 'environments/prod/main.tf');
      assert.ok(fs.existsSync(mainPath), 'environments/prod/main.tf must exist');
      const content = fs.readFileSync(mainPath, 'utf-8');

      // Region check
      assert.match(content, /asia-south1/, 'Region must be asia-south1 (Mumbai)');

      // Cloud SQL check: REGIONAL, pitr_enabled = true
      assert.match(content, /availability_type\s*=\s*"REGIONAL"/, 'Prod DB must be REGIONAL (HA)');
      assert.match(content, /pitr_enabled\s*=\s*true/, 'Prod DB must have PITR enabled');

      // Redis check: STANDARD_HA
      assert.match(content, /tier\s*=\s*"STANDARD_HA"/, 'Prod Redis must be STANDARD_HA tier');

      // Cloud Run: min_instances = 1 for api and dispatch, 0 for webhooks
      assert.match(content, /api\s*=\s*{[\s\S]*?min_instances\s*=\s*1/, 'Prod api must have min_instances = 1');
      assert.match(content, /dispatch\s*=\s*{[\s\S]*?min_instances\s*=\s*1/, 'Prod dispatch must have min_instances = 1');
      assert.match(content, /webhooks\s*=\s*{[\s\S]*?min_instances\s*=\s*0/, 'Prod webhooks can have min_instances = 0');

      // Overnight shutdown disabled (24x7)
      assert.match(content, /enable_overnight_shutdown\s*=\s*false/, 'Prod must have overnight shutdown disabled');
    });

    it('should have prod variables and tfvars.example defining budget ceiling', () => {
      const varsPath = path.join(TERRAFORM_DIR, 'environments/prod/variables.tf');
      const tfvarsPath = path.join(TERRAFORM_DIR, 'environments/prod/terraform.tfvars.example');
      assert.ok(fs.existsSync(varsPath), 'variables.tf must exist');
      assert.ok(fs.existsSync(tfvarsPath), 'terraform.tfvars.example must exist');

      const varsContent = fs.readFileSync(varsPath, 'utf-8');
      assert.match(varsContent, /variable\s+"budget_amount_inr"/, 'budget_amount_inr variable required');
      assert.match(varsContent, /default\s*=\s*"asia-south1"/, 'Default region must be asia-south1');
    });
  });
});
