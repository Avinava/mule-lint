import { LintReport } from '../types/Report';
import { Issue } from '../types/Rule';

/**
 * JSON output format - flat array of issues
 */
export interface JsonIssue extends Issue {
    filePath: string;
    relativePath: string;
}

/**
 * Format lint report as JSON
 */
export function formatJson(report: LintReport, pretty = true): string {
    const issues: JsonIssue[] = [];

    for (const file of report.files) {
        // Add parse errors
        if (!file.parsed) {
            issues.push({
                filePath: file.filePath,
                relativePath: file.relativePath,
                line: 1,
                message: file.parseError ?? 'Failed to parse file',
                ruleId: 'PARSE-ERROR',
                severity: 'error',
            });
        }

        // Add issues
        for (const issue of file.issues) {
            issues.push({
                ...issue,
                filePath: file.filePath,
                relativePath: file.relativePath,
            });
        }
    }

    if (pretty) {
        return JSON.stringify(issues, null, 2);
    }
    return JSON.stringify(issues);
}

/**
 * Format full report as JSON (including summary)
 */
export function formatJsonFull(report: LintReport, pretty = true): string {
    if (pretty) {
        return JSON.stringify(report, null, 2);
    }
    return JSON.stringify(report);
}
