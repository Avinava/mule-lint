import * as fs from 'node:fs';
import * as path from 'node:path';
import validator from '@aml-org/amf-custom-validator';
import type { ApiContractFinding, ApiContractSeverity } from './types';

let initialized: Promise<void> | undefined;
let queue: Promise<void> = Promise.resolve();

function initialize(): Promise<void> {
  initialized ??= new Promise((resolve, reject) => {
    validator.initialize((error?: Error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  return initialized;
}

function run(profile: string, jsonLd: string): Promise<string> {
  const operation = queue.then(async () => {
    await initialize();
    return new Promise<string>((resolve, reject) => {
      validator.validate(profile, jsonLd, false, (report?: string, error?: Error) => {
        if (error) reject(error);
        else if (report === undefined) reject(new Error('Custom validator returned no report'));
        else resolve(report);
      });
    });
  });
  queue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

function severity(value: unknown): ApiContractSeverity {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  if (normalized.includes('violation') || normalized.includes('error')) return 'error';
  if (normalized.includes('info')) return 'info';
  return 'warning';
}

function stringField(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  }
  return undefined;
}

export async function validateRuleset(
  rulesetPath: string,
  jsonLd: string,
  projectRoot: string,
  fallbackFile: string,
): Promise<{ conforms: boolean; findings: ApiContractFinding[] }> {
  const profile = fs.readFileSync(rulesetPath, 'utf8');
  const raw = JSON.parse(await run(profile, jsonLd)) as Array<Record<string, unknown>>;
  const document = raw[0]?.['doc:encodes'];
  const report =
    Array.isArray(document) && document[0] && typeof document[0] === 'object'
      ? (document[0] as Record<string, unknown>)
      : {};
  const results = Array.isArray(report.result) ? report.result : [];
  const findings = results.flatMap((value): ApiContractFinding[] => {
    if (!value || typeof value !== 'object') return [];
    const item = value as Record<string, unknown>;
    const location = stringField(item, 'source', 'focusNode', 'targetNode');
    let file = fallbackFile;
    if (location?.startsWith('file:')) {
      try {
        const urlPath = decodeURIComponent(new URL(location).pathname);
        file = path.relative(projectRoot, urlPath);
      } catch {
        file = fallbackFile;
      }
    }
    return [
      {
        engine: 'governance',
        id:
          stringField(item, 'sourceConstraintComponent', 'validationId', '@id') ??
          path.basename(rulesetPath),
        severity: severity(item.resultSeverity),
        file,
        line: 1,
        column: 1,
        message: stringField(item, 'resultMessage', 'message') ?? 'Governance rule failed',
      },
    ];
  });
  return { conforms: report.conforms === true, findings };
}
