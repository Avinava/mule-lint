import * as path from 'path';
import * as fs from 'fs';
import fg from 'fast-glob';
import { Rule, Issue, RuleConfig, ValidationContext, Severity } from '../types';
import { LintConfig, DEFAULT_CONFIG } from '../types/Config';
import { LintReport, LintSummary, FileResult, ProjectMetrics } from '../types/Report';
import { parseXml } from '../core/XmlParser';
import { scanDirectory, readFileContent, ScannedFile } from '../core/FileScanner';
import { MetricsAggregator } from '../core/MetricsAggregator';
import { collectFileMetrics as collectMetrics } from '../core/MetricsCollector';
import { getErrorMessage } from '../core/errors';
import { ProjectRule } from '../rules/base/ProjectRule';

/**
 * Engine options
 */
export interface EngineOptions {
    /** Rules to use for linting */
    rules: Rule[];
    /** Configuration (optional, uses defaults) */
    config?: Partial<LintConfig>;
    /** Verbose logging */
    verbose?: boolean;
}

/**
 * Main lint engine that orchestrates file scanning, parsing, and rule execution
 */
export class LintEngine {
    private rules: Rule[];
    private config: LintConfig;
    private verbose: boolean;

    constructor(options: EngineOptions) {
        this.rules = options.rules;
        this.config = { ...DEFAULT_CONFIG, ...options.config };
        this.verbose = options.verbose ?? false;
    }

    /**
     * Scan a directory or file and return lint report
     */
    public async scan(targetPath: string): Promise<LintReport> {
        const startTime = Date.now();
        let projectRoot = path.resolve(targetPath);
        let isStandalone = false;

        const stats = fs.statSync(projectRoot);
        const isFile = stats.isFile();

        if (isFile) {
            // Try to find actual project root
            const detectedRoot = this.findProjectRoot(path.dirname(projectRoot));
            if (detectedRoot) {
                projectRoot = detectedRoot;
            } else {
                // Standalone file logic
                projectRoot = path.dirname(projectRoot);
                isStandalone = true;
            }
        }

        this.log(`Scanning: ${projectRoot} ${isStandalone ? '(Standalone)' : ''}`);
        this.log(`Rules enabled: ${this.getEnabledRules().length}`);

        // Discover files
        const files = await scanDirectory(isFile ? targetPath : projectRoot, {
            include: this.config.include,
            exclude: this.config.exclude,
        });

        this.log(`Found ${files.length} files to scan`);

        // Process each file and collect metrics
        const fileResults: FileResult[] = [];
        const metricsAggregator: ProjectMetrics = {
            flowCount: 0,
            subFlowCount: 0,
            dwTransformCount: 0,
            connectorConfigCount: 0,
            httpListenerCount: 0,
            connectorTypes: [],
            errorHandlerCount: 0,
            choiceRouterCount: 0,
            apiEndpoints: [],
            environments: [],
            securityPatterns: [],
            externalServices: [],
            schedulers: [],
            fileComplexity: {},
            flowComplexityData: [],
        };

        for (const file of files) {
            const result = this.processFile(file, projectRoot, isStandalone, metricsAggregator);
            fileResults.push(result);
        }

        // Run Project Rules (only once per scan, if not standalone)
        if (!isStandalone) {
            const projectIssues = this.runProjectRules(projectRoot);
            if (projectIssues.length > 0) {
                // Add a virtual file result for project-level issues
                fileResults.push({
                    filePath: path.join(projectRoot, 'mule-artifact.json'), // Virtual target
                    relativePath: 'Project Structure',
                    issues: projectIssues,
                    parsed: true,
                });
            }
        }

        // Detect environment configurations from property files
        const resourcesPath = path.join(projectRoot, 'src/main/resources');
        if (fs.existsSync(resourcesPath)) {
            const propertyFiles = fg.sync(['**/*.yaml', '**/*.yml', '**/*.properties'], {
                cwd: resourcesPath,
                onlyFiles: true,
            });
            for (const file of propertyFiles) {
                // Extract environment name from filename (e.g., "dev.yaml" -> "dev", "local-secure.yaml" -> "local")
                const basename = path.basename(file, path.extname(file));
                const envMatch = basename.match(/^(dev|local|prod|qa|staging|uat|test|sandbox)/i);
                if (envMatch) {
                    const env = envMatch[1].toLowerCase();
                    if (!metricsAggregator.environments.includes(env)) {
                        metricsAggregator.environments.push(env);
                    }
                }
            }
        }

        // Build report
        const durationMs = Date.now() - startTime;
        const summary = this.buildSummary(fileResults);

        this.log(`Scan complete in ${durationMs}ms`);
        this.log(
            `Found ${summary.bySeverity.error} errors, ${summary.bySeverity.warning} warnings`,
        );

        // Build initial report with base metrics
        const baseReport: LintReport = {
            projectRoot,
            timestamp: new Date().toISOString(),
            durationMs,
            files: fileResults,
            summary,
            metrics: metricsAggregator,
        };

        // Aggregate enhanced metrics (A-E ratings, debt calculation)
        const enhancedMetrics = MetricsAggregator.aggregateMetrics(baseReport);

        return {
            ...baseReport,
            metrics: enhancedMetrics ?? metricsAggregator,
        };
    }

    /**
     * Find project root by looking for marker files
     */
    private findProjectRoot(startDir: string): string | null {
        let currentDir = startDir;
        const root = path.parse(startDir).root;

        while (currentDir !== root) {
            if (
                fs.existsSync(path.join(currentDir, 'pom.xml')) ||
                fs.existsSync(path.join(currentDir, 'mule-artifact.json'))
            ) {
                return currentDir;
            }
            currentDir = path.dirname(currentDir);
        }
        return null;
    }

    /**
     * Scan XML content directly (useful for VS Code extension)
     */
    public scanContent(content: string, filePath: string): Issue[] {
        const parseResult = parseXml(content, filePath);

        if (!parseResult.success || !parseResult.document) {
            return [
                {
                    line: parseResult.errorLine ?? 1,
                    column: parseResult.errorColumn,
                    message: parseResult.error ?? 'Failed to parse XML',
                    ruleId: 'PARSE-ERROR',
                    severity: 'error',
                },
            ];
        }

        // For direct content scan, we assume standalone unless we can infer otherwise (out of scope here)
        return this.runRules(parseResult.document, filePath, path.dirname(filePath), true);
    }

    /**
     * Get all enabled rules based on configuration
     */
    public getEnabledRules(): Rule[] {
        return this.rules.filter((rule) => {
            const ruleConfig = this.getRuleConfig(rule.id);
            return ruleConfig.enabled;
        });
    }

    /**
     * Process a single file
     */
    private processFile(
        file: ScannedFile,
        projectRoot: string,
        isStandalone: boolean = false,
        metricsAggregator?: ProjectMetrics,
    ): FileResult {
        this.log(`  Processing: ${file.relativePath}`);

        try {
            const content = readFileContent(file.absolutePath);
            const parseResult = parseXml(content, file.relativePath);

            if (!parseResult.success || !parseResult.document) {
                return {
                    filePath: file.absolutePath,
                    relativePath: file.relativePath,
                    issues: [],
                    parsed: false,
                    parseError: parseResult.error,
                };
            }

            const issues = this.runRules(
                parseResult.document,
                file.absolutePath,
                projectRoot,
                isStandalone,
            );

            // Collect metrics from parsed document
            if (metricsAggregator) {
                this.collectFileMetrics(parseResult.document, file.relativePath, metricsAggregator);
            }

            return {
                filePath: file.absolutePath,
                relativePath: file.relativePath,
                issues,
                parsed: true,
            };
        } catch (error) {
            const message = getErrorMessage(error);
            return {
                filePath: file.absolutePath,
                relativePath: file.relativePath,
                issues: [],
                parsed: false,
                parseError: `Error reading file: ${message}`,
            };
        }
    }

    /**
     * Run all enabled rules against a document
     */
    private runRules(
        doc: Document,
        filePath: string,
        projectRoot: string,
        isStandalone: boolean = false,
    ): Issue[] {
        const issues: Issue[] = [];
        const enabledRules = this.getEnabledRules();

        for (const rule of enabledRules) {
            // Skip structure rules for standalone files
            if (isStandalone && rule.category === 'structure') {
                continue;
            }

            try {
                const context: ValidationContext = {
                    filePath,
                    relativePath: path.relative(projectRoot, filePath),
                    projectRoot,
                    config: this.getRuleConfig(rule.id),
                };

                const ruleIssues = rule.validate(doc, context);

                // Apply severity override from config
                const configSeverity = context.config.severity;
                if (configSeverity) {
                    ruleIssues.forEach((issue) => {
                        issue.severity = configSeverity;
                    });
                }

                issues.push(...ruleIssues);
            } catch (error) {
                const message = getErrorMessage(error);
                console.error(`Error in rule ${rule.id}: ${message}`);
                // Don't fail the whole scan for a single rule error
            }
        }

        return issues;
    }

    /**
     * Get configuration for a specific rule
     */
    private getRuleConfig(ruleId: string): RuleConfig {
        const config = this.config.rules[ruleId];

        if (config === undefined) {
            // Default: enabled with rule's default severity
            return { enabled: true };
        }

        if (typeof config === 'boolean') {
            return { enabled: config };
        }

        return config;
    }

    /**
     * Build summary statistics from file results
     */
    private buildSummary(files: FileResult[]): LintSummary {
        const bySeverity: Record<Severity, number> = {
            error: 0,
            warning: 0,
            info: 0,
        };
        const byRule: Record<string, number> = {};
        let filesWithIssues = 0;
        let parseErrors = 0;

        for (const file of files) {
            if (!file.parsed) {
                parseErrors++;
            }
            if (file.issues.length > 0) {
                filesWithIssues++;
            }
            for (const issue of file.issues) {
                bySeverity[issue.severity]++;
                byRule[issue.ruleId] = (byRule[issue.ruleId] ?? 0) + 1;
            }
        }

        return {
            totalFiles: files.length,
            filesWithIssues,
            parseErrors,
            bySeverity,
            byRule,
        };
    }

    /**
     * Run project-level rules that don't depend on specific files
     */
    private runProjectRules(projectRoot: string): Issue[] {
        const issues: Issue[] = [];

        const projectRules = this.getEnabledRules().filter(
            (r): r is InstanceType<typeof ProjectRule> => r instanceof ProjectRule,
        );

        for (const rule of projectRules) {
            try {
                rule.reset();

                // Create a basic context for project validation
                const context: ValidationContext = {
                    filePath: path.join(projectRoot, 'pom.xml'), // Pseudo-file
                    relativePath: 'Project Root',
                    projectRoot,
                    config: this.getRuleConfig(rule.id),
                };

                // Pass empty document since project rules don't use it
                const ruleIssues = rule.validate({} as Document, context);
                issues.push(...ruleIssues);
            } catch (error) {
                const message = getErrorMessage(error);
                console.error(`Error in project rule ${rule.id}: ${message}`);
            }
        }

        return issues;
    }

    /**
     * Log message if verbose mode is enabled
     */
    private log(message: string): void {
        if (this.verbose) {
            // eslint-disable-next-line no-console -- intentional verbose debug output
            console.log(message);
        }
    }

    /**
     * Collect metrics from a parsed XML document
     */
    private collectFileMetrics(doc: Document, relativePath: string, metrics: ProjectMetrics): void {
        collectMetrics(doc, relativePath, metrics);
    }
}
