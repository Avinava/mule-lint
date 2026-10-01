import { LintReport } from '../types/Report';
import { Issue, Severity, Rule } from '../types/Rule';
import { ALL_RULES } from '../rules';
import { getRuleDefinition } from '../catalog';
import { fingerprintIssue } from '../core/Baseline';
import packageJson from '../../package.json';

/**
 * SARIF 2.1.0 Schema Types
 * Based on https://docs.oasis-open.org/sarif/sarif/v2.1.0/
 */
interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

interface SarifRun {
  tool: SarifTool;
  results: SarifResult[];
  invocations?: SarifInvocation[];
}

interface SarifTool {
  driver: SarifDriver;
}

interface SarifDriver {
  name: string;
  version: string;
  informationUri?: string;
  rules: SarifRule[];
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: SarifMessage;
  fullDescription?: SarifMessage;
  helpUri?: string | undefined;
  defaultConfiguration?: {
    level: SarifLevel;
  };
  properties?: Record<string, unknown>;
}

interface SarifMessage {
  text: string;
}

interface SarifResult {
  ruleId: string;
  level: SarifLevel;
  message: SarifMessage;
  locations?: SarifLocation[];
  partialFingerprints?: Record<string, string>;
  properties?: Record<string, unknown>;
}

interface SarifLocation {
  physicalLocation: SarifPhysicalLocation;
}

interface SarifPhysicalLocation {
  artifactLocation: SarifArtifactLocation;
  region?: SarifRegion;
}

interface SarifArtifactLocation {
  uri: string;
  uriBaseId?: string;
}

interface SarifRegion {
  startLine: number;
  startColumn?: number | undefined;
  endLine?: number;
  endColumn?: number;
}

interface SarifInvocation {
  executionSuccessful: boolean;
  startTimeUtc?: string;
  endTimeUtc?: string;
}

type SarifLevel = 'error' | 'warning' | 'note' | 'none';

/**
 * Convert mule-lint severity to SARIF level
 */
function toSarifLevel(severity: Severity): SarifLevel {
  switch (severity) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'note';
  }
}

const PARSE_ERROR_RULE: SarifRule = {
  id: 'PARSE-ERROR',
  name: 'File could not be parsed',
  shortDescription: { text: 'File could not be parsed' },
  defaultConfiguration: { level: 'error' },
};

const PSEUDO_FILES = new Set(['Project Structure']);

/** SARIF artifact URIs are forward-slash, percent-encoded relative references. */
function toArtifactUri(relativePath: string): string {
  return relativePath.split(/[\\/]/).map(encodeURIComponent).join('/');
}

/**
 * Convert Rule to SARIF rule definition
 */
function toSarifRule(rule: Rule): SarifRule {
  const helpUri = rule.docsUrl ?? getRuleDefinition(rule.id)?.docsUrl;
  return {
    id: rule.id,
    name: rule.name,
    shortDescription: { text: rule.name },
    fullDescription: { text: rule.description },
    ...(helpUri ? { helpUri } : {}),
    defaultConfiguration: {
      level: toSarifLevel(rule.severity),
    },
    properties: {
      category: rule.category,
    },
  };
}

/**
 * Convert Issue to SARIF result
 */
function toSarifResult(issue: Issue, relativePath: string): SarifResult {
  const result: SarifResult = {
    ruleId: issue.ruleId,
    level: toSarifLevel(issue.severity),
    message: { text: issue.message },
    partialFingerprints: {
      'muleLint/v1': fingerprintIssue(issue.ruleId, relativePath, issue.message),
    },
    ...(issue.suggestion ? { properties: { suggestion: issue.suggestion } } : {}),
  };

  // Project-level findings have no file; "Project Structure" is not a valid URI.
  if (PSEUDO_FILES.has(relativePath)) {
    return result;
  }

  result.locations = [
    {
      physicalLocation: {
        artifactLocation: {
          uri: toArtifactUri(relativePath),
          uriBaseId: '%SRCROOT%',
        },
        // SARIF requires startLine >= 1. Project-level findings use line 0 to
        // mean "the project, not a line", so the region is omitted for them
        // rather than emitting an invalid document an uploader would reject.
        ...(issue.line > 0
          ? {
              region: {
                startLine: issue.line,
                ...(issue.column === undefined || issue.column < 1
                  ? {}
                  : { startColumn: issue.column }),
              },
            }
          : {}),
      },
    },
  ];

  return result;
}

/**
 * Format lint report as SARIF 2.1.0
 * This format is understood by VS Code, GitHub, and AI agents
 */
export function formatSarif(report: LintReport, rules: Rule[] = ALL_RULES): string {
  const sarifLog: SarifLog = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: '@sfdxy/mule-lint',
            version: packageJson.version,
            informationUri: 'https://github.com/Avinava/mule-lint',
            rules: [...rules.map(toSarifRule), PARSE_ERROR_RULE],
          },
        },
        results: [],
        invocations: [
          {
            executionSuccessful: report.summary.parseErrors === 0,
            startTimeUtc: report.timestamp,
          },
        ],
      },
    ],
  };
  const run = sarifLog.runs[0];
  if (!run) {
    throw new Error('SARIF report must contain one run');
  }

  // Add results from all files
  for (const file of report.files) {
    // Add parse errors
    if (!file.parsed) {
      run.results.push({
        ruleId: 'PARSE-ERROR',
        level: 'error',
        message: { text: file.parseError ?? 'Failed to parse file' },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: toArtifactUri(file.relativePath),
                uriBaseId: '%SRCROOT%',
              },
              region: { startLine: 1 },
            },
          },
        ],
      });
    }

    // Add issues
    for (const issue of file.issues) {
      run.results.push(toSarifResult(issue, file.relativePath));
    }
  }

  return JSON.stringify(sarifLog, null, 2);
}
