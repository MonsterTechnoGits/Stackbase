import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface FeatureManifest {
  backend?: {
    base: string[];
    always: string[];
  };
  frontend?: {
    base: string[];
    always: string[];
  };
  auth?: { backend: string[]; frontend: string[] };
  roles?: { backend: string[] };
  redux?: { frontend: string[] };
  exampleDomain?: { note?: string; backend: string[]; frontend: string[] };
  scannerHaptic?: { frontend: string[] };
  database?: {
    drizzle: { backend: string[] };
    prisma: { note?: string; backend: string[] };
  };
}

export function loadManifest(): FeatureManifest {
  const raw = readFileSync(join(__dirname, '..', 'manifest.json'), 'utf-8');
  return JSON.parse(raw) as FeatureManifest;
}
