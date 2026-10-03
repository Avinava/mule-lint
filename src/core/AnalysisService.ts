import fs from 'node:fs';
import path from 'node:path';
import { LintEngine } from '../engine/LintEngine';
import { ALL_RULES } from '../rules';
import { normalizeRuleProfile, toRuleProfileReference } from '../catalog';
import { DEFAULT_CONFIG, type FormatterType, type LintConfig } from '../types/Config';
import { FORMATTER_TYPES } from '../types/constants';
import type { LintReport } from '../types/Report';
import type { Rule } from '../types/Rule';
import { DEFAULT_QUALITY_GATE, STRICT_QUALITY_GATE, type QualityGate } from '../types/QualityGate';
import { parseLintConfig } from './ConfigLoader';
import { loadCustomXPathRules } from './CustomRuleLoader';
import { applyBaseline, parseBaseline } from './Baseline';
import { filterReportBySeverity } from './ReportFilter';
import { evaluateQualityGate } from './QualityGateEvaluator';
import { createReportContract, type ReportContract } from './ReportContract';
import { getAnalysisExitCode } from './AnalysisExitCode';

export interface AnalysisRequest {
  targetPath: string;
  /** Loaded only when explicitly supplied; never discovered from the target directory. */
  configPath?: string | undefined;
  profile?: string | undefined;
  experimental?: boolean | undefined;
  quiet?: boolean | undefined;
  baselinePath?: string | undefined;
  qualityGate?: string | undefined;
  failOnWarning?: boolean | undefined;
  format?: string | undefined;
  verbose?: boolean | undefined;
}

export interface AnalysisMessage {
  kind: 'config-warning' | 'verbose';
  message: string;
}

export interface AnalysisDependencies {
  /** An explicit rule set is retained as supplied (used by MCP and library callers). */
  rules?: Rule[];
  /** Retains the supplied engine's configuration; conflicting request options are rejected. */
  engine?: Pick<LintEngine, 'scan' | 'getEnabledRules'>;
  onMessage?: (message: AnalysisMessage) => void;
}

export interface AnalysisResult {
  report: LintReport;
  contract: ReportContract;
  rules: Rule[];
  formatter: FormatterType;
  exitCode: number;
  messages: AnalysisMessage[];
}

function resolveFormatter(value: string): FormatterType {
  const match = FORMATTER_TYPES.find((type) => type === value);
  if (!match)
    throw new Error(`Unknown format: ${value}. Use one of: ${FORMATTER_TYPES.join(', ')}`);
  return match;
}

function resolveGate(name: string, config: Partial<LintConfig>): QualityGate {
  switch (name.toLowerCase()) {
    case 'default':
      return DEFAULT_QUALITY_GATE;
    case 'strict':
      return STRICT_QUALITY_GATE;
    case 'config':
      if (config.qualityGate) return config.qualityGate;
      throw new Error('Quality gate "config" specified but no qualityGate found in config file');
    default:
      throw new Error(`Unknown quality gate: ${name}. Use 'default', 'strict', or 'config'`);
  }
}

/** Shared scan → selection → baseline → gate → contract policy for all transports. */
export async function analyze(
  request: AnalysisRequest,
  dependencies: AnalysisDependencies = {},
): Promise<AnalysisResult> {
  const target = path.resolve(request.targetPath);
  if (!fs.existsSync(target)) throw new Error(`Path does not exist: ${target}`);
  if (
    dependencies.engine &&
    (request.configPath || request.profile || request.experimental || dependencies.rules)
  ) {
    throw new Error(
      'A supplied engine cannot be combined with rules, configPath, profile or experimental options.',
    );
  }
  const messages: AnalysisMessage[] = [];
  const emit = (kind: AnalysisMessage['kind'], message: string) => {
    const entry = { kind, message };
    messages.push(entry);
    dependencies.onMessage?.(entry);
  };
  let config: Partial<LintConfig> = {};
  let customRules: Rule[] = [];
  const registry = dependencies.engine?.getEnabledRules() ?? dependencies.rules ?? ALL_RULES;
  if (request.configPath) {
    const configPath = path.resolve(request.configPath);
    if (!fs.existsSync(configPath)) throw new Error(`Config file not found: ${configPath}`);
    const parsed = parseLintConfig(JSON.parse(fs.readFileSync(configPath, 'utf8')) as unknown);
    config = parsed.config;
    for (const warning of parsed.warnings) emit('config-warning', warning);
    if (config.customRulesPath) {
      const customPath = path.resolve(path.dirname(configPath), config.customRulesPath);
      customRules = loadCustomXPathRules(
        customPath,
        registry.map((rule) => rule.id),
      );
      if (request.verbose)
        emit('verbose', `Loaded ${customRules.length} custom rules from ${customPath}`);
    }
  }
  const known = new Set([...registry, ...customRules].map((rule) => rule.id));
  for (const id of Object.keys(config.rules ?? {})) {
    if (!known.has(id)) emit('config-warning', `rule "${id}" does not exist and was ignored.`);
  }
  if (request.profile)
    config.extends = toRuleProfileReference(normalizeRuleProfile(request.profile));
  const builtInRules =
    dependencies.engine || dependencies.rules || request.experimental
      ? registry
      : registry.filter((rule) => rule.category !== 'experimental');
  const rules = [...builtInRules, ...customRules];
  if (request.experimental) {
    config.rules = { ...config.rules };
    for (const rule of registry.filter((candidate) => candidate.category === 'experimental')) {
      config.rules[rule.id] ??= true;
    }
  }
  if (request.verbose)
    emit(
      'verbose',
      `Loaded ${rules.length} rules (Experimental: ${request.experimental ? 'ON' : 'OFF'})`,
    );
  const formatter = resolveFormatter(
    request.format ?? config.defaultFormatter ?? DEFAULT_CONFIG.defaultFormatter,
  );
  const engine = dependencies.engine ?? new LintEngine({ rules, config, verbose: request.verbose });
  let report = await engine.scan(target);
  report.selection = { quiet: request.quiet === true };
  const excluded = new Set(
    rules
      .filter((rule) => 'isCustomRule' in rule && rule.isCustomRule === true)
      .map((rule) => rule.id),
  );
  if (request.quiet) report = filterReportBySeverity(report, new Set(['error']), rules, excluded);
  if (request.baselinePath) {
    const baselinePath = path.resolve(request.baselinePath);
    if (!fs.existsSync(baselinePath)) throw new Error(`Baseline file not found: ${baselinePath}`);
    const applied = applyBaseline(
      report,
      parseBaseline(fs.readFileSync(baselinePath, 'utf8')),
      rules,
      excluded,
    );
    report = applied.report;
    report.selection = { quiet: request.quiet === true, baseline: applied.stats };
  }
  if (request.qualityGate)
    report.gate = evaluateQualityGate(report, resolveGate(request.qualityGate, config));
  return {
    report,
    rules,
    formatter,
    messages,
    contract: createReportContract(report, rules),
    exitCode: getAnalysisExitCode(
      report,
      request.failOnWarning === true || config.failOnWarning === true,
    ),
  };
}
