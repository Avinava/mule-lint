import * as fs from 'fs';
import * as path from 'path';

/** The fields of mule-artifact.json that rules read. */
export interface MuleArtifactDescriptor {
  /** Raw file content, for locating fields by line */
  content: string;
  secureProperties: string[];
  minMuleVersion?: string | undefined;
  javaSpecificationVersions?: string[] | undefined;
}

/**
 * Read mule-artifact.json. Returns undefined when it is missing or not valid
 * JSON, so a malformed descriptor never aborts a scan.
 */
export function readMuleArtifact(projectRoot: string): MuleArtifactDescriptor | undefined {
  let content: string;
  let parsed: unknown;
  try {
    content = fs.readFileSync(path.join(projectRoot, 'mule-artifact.json'), 'utf8');
    parsed = JSON.parse(content);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object') {
    return undefined;
  }

  const descriptor = parsed as Record<string, unknown>;
  const strings = (value: unknown): string[] | undefined =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : undefined;

  return {
    content,
    secureProperties: strings(descriptor.secureProperties) ?? [],
    minMuleVersion:
      typeof descriptor.minMuleVersion === 'string' ? descriptor.minMuleVersion : undefined,
    javaSpecificationVersions: strings(descriptor.javaSpecificationVersions),
  };
}
