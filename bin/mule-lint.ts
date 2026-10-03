#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { format } from '../src/formatters';
import { FORMATTER_TYPES } from '../src/types/constants';
import { analyze } from '../src/core/AnalysisService';
import { formatQualityGateResult } from '../src/core/QualityGateEvaluator';
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
  .option('-f, --format <type>', `Output format: ${FORMATTER_TYPES.join(', ')}`)
  .option('-o, --output <file>', 'Write output to file instead of stdout')
  .option('-c, --config <file>', 'Path to configuration file')
  .option('-q, --quiet', 'Show only errors (suppress warnings and info)')
  .option('--fail-on-warning', 'Exit with error code if warnings found')
  .option('-e, --experimental', 'Enable experimental rules (opt-in)')
  .option('-p, --profile <name>', 'Rule profile: baseline, recommended, or strict')
  .option('-g, --quality-gate <name>', 'Apply quality gate: default, strict, or from config')
  .option('--baseline <file>', 'Report only issues not present in a previous `-f json` report')
  .option('-v, --verbose', 'Show verbose output')
  .action(async (targetPath: string | undefined, options: LintCliOptions) => {
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

interface LintCliOptions {
  baseline?: string;
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

async function runLint(targetPath: string, options: LintCliOptions): Promise<void> {
  const result = await analyze(
    {
      targetPath,
      configPath: options.config,
      baselinePath: options.baseline,
      profile: options.profile,
      experimental: options.experimental,
      quiet: options.quiet,
      qualityGate: options.qualityGate,
      failOnWarning: options.failOnWarning,
      format: options.format,
      verbose: options.verbose,
    },
    {
      onMessage: ({ kind, message }) => {
        console.error(kind === 'config-warning' ? `Config warning: ${message}` : message);
      },
    },
  );
  const { report, contract, rules, formatter, exitCode } = result;
  if (report.ruleErrors && report.ruleErrors.length > 0) {
    const failed = [...new Set(report.ruleErrors.map((error) => error.ruleId))].join(', ');
    console.error(
      `Warning: ${report.ruleErrors.length} rule execution error(s) (${failed}). Results for these rules are incomplete.`,
    );
  }
  const baseline = report.selection?.baseline;
  if (baseline)
    console.error(
      `Baseline: ${baseline.newIssues} new, ${baseline.unchanged} unchanged, ${baseline.fixed} fixed`,
    );
  // Flat JSON has no execution envelope. Execution diagnostics remain visible on stderr.
  for (const diagnostic of contract.execution.diagnostics) {
    if (diagnostic.kind === 'rule-error') continue;
    console.error(
      `Analysis ${diagnostic.kind}: ${diagnostic.relativePath ? `${diagnostic.relativePath}: ` : ''}${diagnostic.message}`,
    );
  }
  if (report.gate) console.error(formatQualityGateResult(report.gate));
  const output = format(report, formatter, rules);
  const outputFile = options.output ?? (formatter === 'html' ? 'report.html' : undefined);
  if (outputFile) {
    const outputPath = path.resolve(outputFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.error(`Report written to: ${outputPath}`);
  } else {
    console.log(output);
  }
  process.exit(exitCode);
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
