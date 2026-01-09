import chalk from 'chalk';
import { LintReport } from '../types/Report';
import { Issue, Severity } from '../types/Rule';

/**
 * Format lint report as a colorized table for human consumption
 */
export function formatTable(report: LintReport): string {
    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push(chalk.bold('Mule-Lint Report'));
    lines.push(chalk.gray(`Scanned ${report.summary.totalFiles} files in ${report.durationMs}ms`));
    lines.push('');

    // Files with issues
    const filesWithIssues = report.files.filter((f) => f.issues.length > 0 || !f.parsed);

    if (filesWithIssues.length === 0) {
        lines.push(chalk.green('✓ No issues found!'));
        lines.push('');
        return lines.join('\n');
    }

    // Group issues by file
    for (const file of filesWithIssues) {
        // File header
        lines.push(chalk.underline(file.relativePath));

        // Parse errors
        if (!file.parsed) {
            lines.push(
                formatIssue({
                    line: 1,
                    message: file.parseError ?? 'Failed to parse file',
                    ruleId: 'PARSE-ERROR',
                    severity: 'error',
                }),
            );
        }

        // Issues
        for (const issue of file.issues) {
            lines.push(formatIssue(issue));
        }

        lines.push('');
    }

    // Summary
    lines.push(chalk.bold('Summary:'));
    lines.push(formatSummaryLine('error', report.summary.bySeverity.error));
    lines.push(formatSummaryLine('warning', report.summary.bySeverity.warning));
    lines.push(formatSummaryLine('info', report.summary.bySeverity.info));
    lines.push('');

    return lines.join('\n');
}

/**
 * Format a single issue line
 */
function formatIssue(issue: Issue): string {
    const severity = formatSeverity(issue.severity);
    const location = chalk.gray(`${issue.line}:${issue.column ?? 0}`);
    const ruleId = chalk.gray(`(${issue.ruleId})`);
    const message = issue.message;

    return `  ${location.padEnd(12)} ${severity} ${message} ${ruleId}`;
}

/**
 * Format severity with color
 */
function formatSeverity(severity: Severity): string {
    switch (severity) {
        case 'error':
            return chalk.red('error  ');
        case 'warning':
            return chalk.yellow('warning');
        case 'info':
            return chalk.blue('info   ');
    }
}

/**
 * Format summary line
 */
function formatSummaryLine(severity: Severity, count: number): string {
    const label = severity.charAt(0).toUpperCase() + severity.slice(1) + 's:';
    const value = count.toString();
    const color =
        severity === 'error' ? chalk.red : severity === 'warning' ? chalk.yellow : chalk.blue;

    return `  ${label.padEnd(10)} ${color(value)}`;
}

/**
 * Get exit code based on report
 */
export function getExitCode(report: LintReport, failOnWarning = false): number {
    if (report.summary.bySeverity.error > 0) {
        return 1;
    }
    if (failOnWarning && report.summary.bySeverity.warning > 0) {
        return 1;
    }
    if (report.summary.parseErrors > 0) {
        return 3;
    }
    return 0;
}
