#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { LintEngine } from '../src/engine/LintEngine';
import { ALL_RULES } from '../src/rules';
import { format, getExitCode } from '../src/formatters';
import { FormatterType, LintConfig } from '../src/types/Config';
import {
    evaluateQualityGate,
    formatQualityGateResult,
    getQualityGateExitCode,
} from '../src/core/QualityGateEvaluator';
import { DEFAULT_QUALITY_GATE, STRICT_QUALITY_GATE, QualityGate } from '../src/types/QualityGate';

const program = new Command();

program
    .name('mule-lint')
    .description('Static analysis tool for MuleSoft applications')
    .version('1.0.0')
    .argument('<path>', 'Path to scan (directory or file)')
    .option('-f, --format <type>', 'Output format: table, json, sarif, html, csv', 'table')
    .option('-o, --output <file>', 'Write output to file instead of stdout')
    .option('-c, --config <file>', 'Path to configuration file')
    .option('-q, --quiet', 'Show only errors (suppress warnings and info)')
    .option('--fail-on-warning', 'Exit with error code if warnings found')
    .option('-e, --experimental', 'Enable experimental rules (opt-in)')
    .option('-g, --quality-gate <name>', 'Apply quality gate: default, strict, or from config')
    .option('-v, --verbose', 'Show verbose output')
    .action(async (targetPath: string, options) => {
        try {
            await runLint(targetPath, options);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Error: ${message}`);
            process.exit(2);
        }
    });

interface CliOptions {
    format: string;
    output?: string;
    config?: string;
    quiet?: boolean;
    failOnWarning?: boolean;
    experimental?: boolean;
    qualityGate?: string;
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
    if (options.config) {
        const configPath = path.resolve(options.config);
        if (!fs.existsSync(configPath)) {
            throw new Error(`Config file not found: ${configPath}`);
        }
        const configContent = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(configContent);
    }

    // Filter rules based on keys (experimental is opt-in)
    const effectiveRules = options.experimental
        ? ALL_RULES
        : ALL_RULES.filter(rule => rule.category !== 'experimental');

    if (options.verbose) {
        console.log(`Loaded ${effectiveRules.length} rules (Experimental: ${options.experimental ? 'ON' : 'OFF'})`);
    }

    // Create engine
    const engine = new LintEngine({
        rules: effectiveRules,
        config,
        verbose: options.verbose,
    });

    // Run scan
    const report = await engine.scan(absolutePath);

    // Filter if quiet mode
    if (options.quiet) {
        for (const file of report.files) {
            file.issues = file.issues.filter(issue => issue.severity === 'error');
        }
        report.summary.bySeverity.warning = 0;
        report.summary.bySeverity.info = 0;
    }

    // Format output
    const formatterType = options.format as FormatterType;
    const output = format(report, formatterType);

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
        exitCode = getQualityGateExitCode(gateResult.status, options.failOnWarning);
    } else {
        // Legacy exit code based on issue count
        exitCode = getExitCode(report, options.failOnWarning);
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

// Run the CLI
program.parse();

