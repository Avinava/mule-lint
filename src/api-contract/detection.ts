import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import { load } from 'js-yaml';
import type { ApiContractFormat } from './types';

interface DetectedMain {
  absolutePath: string;
  format: ApiContractFormat;
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
}

function resolveInside(root: string, requested: string): string {
  const candidate = path.resolve(root, requested);
  if (!inside(root, candidate)) {
    throw new Error(`API main file escapes the project root: ${requested}`);
  }
  const realRoot = fs.realpathSync(root);
  const realCandidate = fs.realpathSync(candidate);
  if (!inside(realRoot, realCandidate)) {
    throw new Error(`API main file resolves outside the project root: ${requested}`);
  }
  return realCandidate;
}

export function detectFormat(filePath: string): ApiContractFormat | undefined {
  const source = fs.readFileSync(filePath, 'utf8');
  const firstLine = source.split(/\r?\n/, 1)[0]?.trim() ?? '';
  if (
    /^#%RAML\s+1\.0(?:\s|$)/i.test(firstLine) &&
    !/\b(?:DataType|Library|Trait|ResourceType|NamedExample|DocumentationItem|SecurityScheme)\b/i.test(
      firstLine,
    )
  ) {
    return 'raml-1.0';
  }
  if (/^#%RAML\s+0\.8(?:\s|$)/i.test(firstLine)) {
    return 'raml-0.8';
  }
  try {
    const parsed = load(source) as Record<string, unknown> | undefined;
    if (typeof parsed?.openapi === 'string' && /^3\.0(?:\.|$)/.test(parsed.openapi))
      return 'oas-3.0';
    if (parsed?.swagger === '2.0') return 'oas-2.0';
  } catch {
    return undefined;
  }
  return undefined;
}

function exchangeMain(projectRoot: string): string | undefined {
  const exchangePath = path.join(projectRoot, 'exchange.json');
  if (!fs.existsSync(exchangePath)) return undefined;
  let metadata: unknown;
  try {
    metadata = JSON.parse(fs.readFileSync(exchangePath, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(
      `Cannot parse exchange.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!metadata || typeof metadata !== 'object') return undefined;
  const record = metadata as Record<string, unknown>;
  const specification = record.apiSpecification;
  const candidates = [
    record.main,
    record.mainFile,
    specification && typeof specification === 'object'
      ? (specification as Record<string, unknown>).main
      : undefined,
  ];
  return candidates.find((value): value is string => typeof value === 'string' && value.length > 0);
}

export async function detectMainFile(
  projectPath: string,
  requestedMain?: string,
): Promise<DetectedMain> {
  const projectRoot = fs.realpathSync(path.resolve(projectPath));
  const selected = requestedMain ?? exchangeMain(projectRoot);
  if (selected) {
    const absolutePath = resolveInside(projectRoot, selected);
    const format = detectFormat(absolutePath);
    if (!format) throw new Error(`Unsupported or unrecognized API contract: ${selected}`);
    return { absolutePath, format };
  }

  const files = await fg(['**/*.{raml,yaml,yml,json}'], {
    cwd: projectRoot,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: ['**/node_modules/**', '**/exchange_modules/**', '**/.git/**'],
  });
  const detected = files.flatMap((absolutePath) => {
    const format = detectFormat(absolutePath);
    return format ? [{ absolutePath, format }] : [];
  });
  if (detected.length === 0) {
    throw new Error('No recognizable RAML or OpenAPI root contract was found');
  }
  if (detected.length > 1) {
    const candidates = detected
      .map(({ absolutePath }) => path.relative(projectRoot, absolutePath))
      .sort();
    throw new Error(
      `Multiple API root contracts found; select one with --main: ${candidates.join(', ')}`,
    );
  }
  return detected[0] as DetectedMain;
}
