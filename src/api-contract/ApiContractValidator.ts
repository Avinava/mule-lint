import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OASConfiguration, RAMLConfiguration, type AMFConfiguration } from 'amf-client-js';
import { createSafeResourceLoader } from './SafeResourceLoader';
import { detectMainFile } from './detection';
import { validateRuleset } from './CustomRulesetValidator';
import type {
  ApiContractFinding,
  ApiContractFormat,
  ApiContractReport,
  ApiContractSeverity,
  ValidateApiContractOptions,
} from './types';

function configuration(format: ApiContractFormat): AMFConfiguration {
  switch (format) {
    case 'raml-1.0':
      return RAMLConfiguration.RAML10();
    case 'raml-0.8':
      return RAMLConfiguration.RAML08();
    case 'oas-3.0':
      return OASConfiguration.OAS30();
    case 'oas-2.0':
      return OASConfiguration.OAS20();
  }
}

function severity(level: string): ApiContractSeverity {
  const normalized = level.toLowerCase();
  if (normalized.includes('violation') || normalized.includes('error')) return 'error';
  if (normalized.includes('info')) return 'info';
  return 'warning';
}

function relativeLocation(
  projectRoot: string,
  location: string | undefined,
  fallback: string,
): string {
  if (!location) return fallback;
  try {
    const filePath = location.startsWith('file:')
      ? decodeURIComponent(new URL(location).pathname)
      : location;
    const relative = path.relative(projectRoot, filePath);
    return relative.startsWith('..') ? fallback : relative;
  } catch {
    return fallback;
  }
}

export async function validateApiContract(
  options: ValidateApiContractOptions,
): Promise<ApiContractReport> {
  const started = Date.now();
  const projectRoot = fs.realpathSync(path.resolve(options.projectPath));
  const detected = await detectMainFile(projectRoot, options.mainFile);
  const mainFile = path.relative(projectRoot, detected.absolutePath);
  const dependencyRoots = (options.dependencyRoots ?? []).map((root) =>
    fs.realpathSync(path.resolve(root)),
  );
  const config = configuration(detected.format).withResourceLoaders([
    createSafeResourceLoader([projectRoot, ...dependencyRoots]),
  ]);
  const client = config.baseUnitClient();
  const parsed = await client.parseDocument(pathToFileURL(detected.absolutePath).href);
  const validation = await client.validate(parsed.document);
  const functionalResults = [...parsed.results, ...validation.results];
  const seen = new Set<string>();
  const findings: ApiContractFinding[] = functionalResults.flatMap((result) => {
    const line = result.position.start.line + 1;
    const column = result.position.start.column + 1;
    const finding: ApiContractFinding = {
      engine: 'amf',
      id: result.validationId || 'AMF-VALIDATION',
      severity: severity(result.severityLevel),
      file: relativeLocation(projectRoot, result.location, mainFile),
      line,
      column,
      message: result.message,
    };
    const key = JSON.stringify(finding);
    if (seen.has(key)) return [];
    seen.add(key);
    return [finding];
  });

  let governanceConforms: boolean | 'not-run' = 'not-run';
  if ((options.rulesetPaths?.length ?? 0) > 0 && parsed.conforms && validation.conforms) {
    const jsonLd = client.render(parsed.document, 'application/ld+json');
    governanceConforms = true;
    for (const requested of options.rulesetPaths ?? []) {
      const rulesetPath = fs.realpathSync(path.resolve(requested));
      const result = await validateRuleset(rulesetPath, jsonLd, projectRoot, mainFile);
      governanceConforms = governanceConforms && result.conforms;
      findings.push(...result.findings);
    }
  }

  return {
    projectRoot,
    mainFile,
    format: detected.format,
    functionalConforms: parsed.conforms && validation.conforms,
    governanceConforms,
    findings,
    durationMs: Date.now() - started,
  };
}
