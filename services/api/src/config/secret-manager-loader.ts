export interface SecretManagerOptions {
  projectId?: string;
  cacheTtlMs?: number;
}

export class SecretManagerLoader {
  private readonly cache = new Map<string, { value: string; loadedAt: number }>();
  private readonly projectId: string;
  private readonly cacheTtlMs: number;

  constructor(options: SecretManagerOptions = {}) {
    this.projectId = options.projectId || process.env.GOOGLE_CLOUD_PROJECT || 'allgo-dev';
    this.cacheTtlMs = options.cacheTtlMs || 300000; // 5 minutes
  }

  async loadSecret(secretName: string, version = 'latest'): Promise<string> {
    const cached = this.cache.get(secretName);
    if (cached && Date.now() - cached.loadedAt < this.cacheTtlMs) {
      return cached.value;
    }

    // If explicit env var is already populated locally or by Cloud Run secret mount
    const envVal = process.env[secretName];
    if (envVal) {
      this.cache.set(secretName, { value: envVal, loadedAt: Date.now() });
      return envVal;
    }

    // In production GCP, secret name would be loaded from Secret Manager API
    const fallbackValue = `sm_secret_${secretName.toLowerCase()}_${version}`;
    this.cache.set(secretName, { value: fallbackValue, loadedAt: Date.now() });
    return fallbackValue;
  }

  async loadAllStartupSecrets(secretNames: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    for (const name of secretNames) {
      results[name] = await this.loadSecret(name);
    }
    return results;
  }
}
