#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { LintEngine } from '../src/engine/LintEngine';
import { ALL_RULES } from '../src/rules';
import { format, getExitCode } from '../src/formatters';
import { FormatterType, LintConfig } from '../src/types/Config';
import { DEFAULT_CONFIG } from '../src/types/Config';
import { parseLintConfig } from '../src/core/ConfigLoader';
import { loadCustomXPathRules } from '../src/core/CustomRuleLoader';
import { Rule } from '../src/types';
import { filterReportBySeverity } from '../src/core/ReportFilter';
import {
  evaluateQualityGate,
  formatQualityGateResult,
  getQualityGateExitCode,
} from '../src/core/QualityGateEvaluator';
import { DEFAULT_QUALITY_GATE, STRICT_QUALITY_GATE, QualityGate } from '../src/types/QualityGate';
import { normalizeRuleProfile, toRuleProfileReference } from '../src/catalog';
import {
  formatApiContractReport,
  validateApiContract,
  type ApiContractOutputFormat,
} from '../src/api-contract';

import packageJson from '../package.json';

const program = new Command();
program.enablePositionalOptions();

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

program
  .name('mule-lint')
  .description('Static analysis tool for MuleSoft applications')
  .version(packageJson.version)
  .argument('[path]', 'Path to scan (directory or file)')
  .option('-f, --format <type>', 'Output format: table, json, sarif, html, csv')
  .option('-o, --output <file>', 'Write output to file instead of stdout')
  .option('-c, --config <file>', 'Path to configuration file')
  .option('-q, --quiet', 'Show only errors (suppress warnings and info)')
  .option('--fail-on-warning', 'Exit with error code if warnings found')
  .option('-e, --experimental', 'Enable experimental rules (opt-in)')
  .option('-p, --profile <name>', 'Rule profile: baseline, recommended, or strict')
  .option('-g, --quality-gate <name>', 'Apply quality gate: default, strict, or from config')
  .option('-v, --verbose', 'Show verbose output')
  .action(async (targetPath: string | undefined, options: CliOptions) => {
    if (!targetPath) {
      program.help();
      return;
    }
    try {
      await runLint(targetPath, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exit(2);
    }
  });

const api = program.command('api').description('Validate RAML and OpenAPI contracts');

api
  .command('validate')
  .description('Parse and validate a local RAML or OpenAPI project')
  .argument('<path>', 'API project directory')
  .option('--main <file>', 'Main contract file, relative to the project')
  .option(
    '--ruleset <file>',
    'Local AMF Validation Profile; repeat for multiple rulesets',
    collect,
    [],
  )
  .option(
    '--dependency-root <path>',
    'Allowed local dependency root; repeat as needed',
    collect,
    [],
  )
  .option('--format <type>', 'Output format: table, json, sarif', 'table')
  .action(async (targetPath: string, options: ApiValidateCliOptions) => {
    try {
      if (!['table', 'json', 'sarif'].includes(options.format)) {
        throw new Error(`Unsupported API report format: ${options.format}`);
      }
      const report = await validateApiContract({
        projectPath: path.resolve(targetPath),
        ...(options.main ? { mainFile: options.main } : {}),
        ...(options.ruleset.length > 0 ? { rulesetPaths: options.ruleset } : {}),
        ...(options.dependencyRoot.length > 0 ? { dependencyRoots: options.dependencyRoot } : {}),
      });
      console.log(formatApiContractReport(report, options.format as ApiContractOutputFormat));
      const hasFindings =
        report.findings.length > 0 ||
        !report.functionalConforms ||
        report.governanceConforms === false;
      process.exit(hasFindings ? 1 : 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exit(2);
    }
  });

interface ApiValidateCliOptions {
  main?: string;
  ruleset: string[];
  dependencyRoot: string[];
  format: string;
}

// MCP subcommand — starts the Model Context Protocol server over stdio
program
  .command('mcp')
  .description('Start the MCP (Model Context Protocol) server over stdio for AI agent integration')
  .action(async () => {
    const { MuleLintMcpServer } = await import('../src/mcp');
    const server = new MuleLintMcpServer();
    await server.start();
  });

// Format subcommand — format Mule XML files using Prettier
program
  .command('format')
  .description('Format Mule XML files using Prettier with Anypoint Studio-compatible defaults')
  .argument('<path>', 'Path to a Mule XML file or project directory')
  .option('--check', 'Check if files are formatted without writing (exit 1 if unformatted)')
  .option('--tab-width <n>', 'Spaces per indent level (default: 4)', parseInt)
  .option('--print-width <n>', 'Max line width before wrapping (default: 140)', parseInt)
  .option(
    '--xml-quote-attributes <style>',
    'Attribute quote style: preserve, single, double (default: preserve)',
  )
  .action(async (targetPath: string, opts: FormatCliOptions) => {
    try {
      await runFormat(targetPath, opts);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exit(2);
    }
  });

interface CliOptions {
  format?: string;
  output?: string;
  config?: string;
  quiet?: boolean;
  failOnWarning?: boolean;
  experimental?: boolean;
  qualityGate?: string;
  profile?: string;
  verbose?: boolean;
}

async function runLint(targetPath: string, options: CliOptions): Promise<void> {
  const absolutePath = path.resolve(targetPath);

  // Validate path exists
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Path does not exist: ${absolutePath}`);
  }

  // Load configuration if specified
  let config: Partial<LintConfig> = {};
  let customRules: Rule[] = [];
  if (options.config) {
    const configPath = path.resolve(options.config);
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const parsedConfig = parseLintConfig(JSON.parse(configContent) as unknown);
    config = parsedConfig.config;
    for (const warning of parsedConfig.warnings) {
      console.error(`Config warning: ${warning}`);
    }

    // Custom rule paths resolve relative to the configuration file, not the cwd.
    if (config.customRulesPath) {
      const customRulesPath = path.resolve(path.dirname(configPath), config.customRulesPath);
      customRules = loadCustomXPathRules(
        customRulesPath,
        ALL_RULES.map((rule) => rule.id),
      );
      if (options.verbose) {
        console.log(`Loaded ${customRules.length} custom rules from ${customRulesPath}`);
      }
    }
  }

  if (options.profile) {
    config.extends = toRuleProfileReference(normalizeRuleProfile(options.profile));
  }

  // Filter rules based on keys (experimental is opt-in)
  const builtInRules = options.experimental
    ? ALL_RULES
    : ALL_RULES.filter((rule) => rule.category !== 'experimental');
  const effectiveRules = [...builtInRules, ...customRules];

  if (options.experimental) {
    config.rules = { ...config.rules };
    for (const rule of ALL_RULES.filter((candidate) => candidate.category === 'experimental')) {
      config.rules[rule.id] = true;
    }
  }

  if (options.verbose) {
    console.log(
      `Loaded ${effectiveRules.length} rules (Experimental: ${options.experimental ? 'ON' : 'OFF'})`,
    );
  }

  // Create engine
  const engine = new LintEngine({
    rules: effectiveRules,
    config,
    verbose: options.verbose,
  });

  // Run scan
  let report = await engine.scan(absolutePath);
  const formatterType = (options.format ??
    config.defaultFormatter ??
    DEFAULT_CONFIG.defaultFormatter) as FormatterType;
  const failOnWarning = options.failOnWarning === true || config.failOnWarning === true;

  // Filter if quiet mode
  if (options.quiet) {
    report = filterReportBySeverity(
      report,
      new Set(['error']),
      effectiveRules,
      new Set(customRules.map((rule) => rule.id)),
    );
  }

  // Format output
  const output = format(report, formatterType, effectiveRules);

  // Write output
  if (options.output) {
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`Report written to: ${outputPath}`);
  } else if (formatterType === 'html') {
    const outputPath = path.resolve('report.html');
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`Report written to: ${outputPath}`);
  } else {
    console.log(output);
  }

  // Determine exit code
  let exitCode: number;

  // Quality Gate evaluation
  if (options.qualityGate) {
    const gate = resolveQualityGate(options.qualityGate, config);
    const gateResult = evaluateQualityGate(report, gate);

    // Print quality gate result
    console.log(formatQualityGateResult(gateResult));

    // Exit code based on quality gate
    exitCode = getQualityGateExitCode(gateResult.status, failOnWarning);
  } else {
    // Legacy exit code based on issue count
    exitCode = getExitCode(report, failOnWarning);
  }

  process.exit(exitCode);
}

/**
 * Resolves the quality gate to use based on CLI option and config
 */
function resolveQualityGate(gateName: string, config: Partial<LintConfig>): QualityGate {
  // Check for built-in gates
  switch (gateName.toLowerCase()) {
    case 'default':
      return DEFAULT_QUALITY_GATE;
    case 'strict':
      return STRICT_QUALITY_GATE;
    case 'config':
      // Use gate from config file
      if (config.qualityGate) {
        return config.qualityGate;
      }
      throw new Error('Quality gate "config" specified but no qualityGate found in config file');
    default:
      throw new Error(`Unknown quality gate: ${gateName}. Use 'default', 'strict', or 'config'`);
  }
}

// ─── Format command ─────────────────────────────────────────────────────────

interface FormatCliOptions {
  check?: boolean;
  tabWidth?: number;
  printWidth?: number;
  xmlQuoteAttributes?: 'preserve' | 'single' | 'double';
}

async function runFormat(targetPath: string, options: FormatCliOptions): Promise<void> {
  const absolutePath = path.resolve(targetPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Path does not exist: ${absolutePath}`);
  }

  // Lazy import to keep startup fast for the lint path
  const { formatFile, formatProject } = await import('../src/formatter/MuleXmlFormatter');

  const formatOptions = {
    check: options.check,
    tabWidth: options.tabWidth,
    printWidth: options.printWidth,
    xmlQuoteAttributes: options.xmlQuoteAttributes,
  };

  const stat = fs.statSync(absolutePath);
  let results: Awaited<ReturnType<typeof formatFile>>[];

  if (stat.isDirectory()) {
    results = await formatProject(absolutePath, formatOptions);
  } else {
    results = [await formatFile(absolutePath, formatOptions)];
  }

  if (results.length === 0) {
    console.log('No Mule XML files found.');
    return;
  }

  // Print results
  let changedCount = 0;
  let errorCount = 0;

  for (const result of results) {
    const relativePath = path.relative(process.cwd(), result.filePath);
    if (result.error) {
      console.error(`  ✗ ${relativePath}: ${result.error}`);
      errorCount++;
    } else if (result.changed) {
      console.log(options.check ? `  ✗ ${relativePath} (needs formatting)` : `  ✓ ${relativePath}`);
      changedCount++;
    }
  }

  const unchangedCount = results.length - changedCount - errorCount;
  console.log(
    `\n${results.length} file(s) scanned: ${changedCount} ${options.check ? 'need formatting' : 'formatted'}, ${unchangedCount} unchanged, ${errorCount} error(s)`,
  );

  // In check mode, exit 1 if any files are unformatted
  if (options.check && changedCount > 0) {
    process.exit(1);
  }
  if (errorCount > 0) {
    process.exit(2);
  }
}

// Run the CLI
program.parse();
