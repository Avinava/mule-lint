#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { LintEngine } from '../src/engine/LintEngine';
import { ALL_RULES } from '../src/rules';
import { format, getExitCode } from '../src/formatters';
import { FormatterType } from '../src/types/Config';

const program = new Command();

program
    .name('mule-lint')
    .description('Static analysis tool for MuleSoft applications')
    .version('1.0.0')
    .argument('<path>', 'Path to scan (directory or file)')
    .option('-f, --format <type>', 'Output format: table, json, sarif', 'table')
    .option('-o, --output <file>', 'Write output to file instead of stdout')
    .option('-c, --config <file>', 'Path to configuration file')
    .option('-q, --quiet', 'Show only errors (suppress warnings and info)')
    .option('--fail-on-warning', 'Exit with error code if warnings found')
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
    verbose?: boolean;
}

async function runLint(targetPath: string, options: CliOptions): Promise<void> {
    const absolutePath = path.resolve(targetPath);

    // Validate path exists
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Path does not exist: ${absolutePath}`);
    }

    // Load configuration if specified
    let config = {};
    if (options.config) {
        const configPath = path.resolve(options.config);
        if (!fs.existsSync(configPath)) {
            throw new Error(`Config file not found: ${configPath}`);
        }
        const configContent = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(configContent);
    }

    // Create engine
    const engine = new LintEngine({
        rules: ALL_RULES,
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
    } else {
        console.log(output);
    }

    // Exit code
    const exitCode = getExitCode(report, options.failOnWarning);
    process.exit(exitCode);
}

// Run the CLI
program.parse();
