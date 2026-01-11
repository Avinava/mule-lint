import * as path from 'path';
import * as fs from 'fs';
import fg from 'fast-glob';
import { Rule, Issue, RuleConfig, ValidationContext, Severity } from '../types';
import { LintConfig, DEFAULT_CONFIG } from '../types/Config';
import { LintReport, LintSummary, FileResult, ProjectMetrics } from '../types/Report';
import { parseXml } from '../core/XmlParser';
import { scanDirectory, readFileContent, ScannedFile } from '../core/FileScanner';
import { ComplexityCalculator } from '../core/ComplexityCalculator';

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

        return {
            projectRoot,
            timestamp: new Date().toISOString(),
            durationMs,
            files: fileResults,
            summary,
            metrics: metricsAggregator,
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
            const message = error instanceof Error ? error.message : String(error);
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
                const message = error instanceof Error ? error.message : String(error);
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
        const projectRules = this.getEnabledRules().filter((r) => (r as any).isProjectRule);

        for (const rule of projectRules) {
            try {
                // Cast to any to access ProjectRule methods safely
                // In a real generic implementation we'd check instance types better
                if (typeof (rule as any).reset === 'function') {
                    (rule as any).reset();
                }

                // Create a basic context for project validation
                const context: ValidationContext = {
                    filePath: path.join(projectRoot, 'pom.xml'), // Pseudo-file
                    relativePath: 'Project Root',
                    projectRoot,
                    config: this.getRuleConfig(rule.id),
                };

                // Pass empty document since project rules don't use it
                // Using 'as any' because we know ProjectRule ignores the doc
                const ruleIssues = rule.validate({} as any, context);
                issues.push(...ruleIssues);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
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
            console.log(message);
        }
    }

    /**
     * Collect metrics from a parsed XML document
     */
    private collectFileMetrics(doc: Document, relativePath: string, metrics: ProjectMetrics): void {
        try {
            const xpath = require('xpath');

            // Count flows
            const flows = xpath.select('//*[local-name()="flow"]', doc);
            const flowCount = Array.isArray(flows) ? flows.length : 0;
            metrics.flowCount += flowCount;

            // Collect per-flow complexity
            if (Array.isArray(flows)) {
                for (const flow of flows) {
                    const flowName = (flow as Element).getAttribute('name') || 'unnamed';
                    try {
                        const result = ComplexityCalculator.calculateFlowComplexity(flow);
                        const breakdown: Record<string, number> = {};
                        for (const detail of result.details) {
                            breakdown[detail.type] = detail.count;
                        }
                        metrics.flowComplexityData.push({
                            flowName,
                            file: relativePath,
                            complexity: result.complexity,
                            rating: result.rating,
                            breakdown,
                        });
                    } catch {
                        // Skip complexity calculation on error
                    }
                }
            }

            // Count sub-flows
            const subFlows = xpath.select('//*[local-name()="sub-flow"]', doc);
            const subFlowCount = Array.isArray(subFlows) ? subFlows.length : 0;
            metrics.subFlowCount += subFlowCount;

            // Count DataWeave transforms (ee:transform)
            const dwTransforms = xpath.select(
                '//*[local-name()="transform" and (namespace-uri()="http://www.mulesoft.org/schema/mule/ee/core" or contains(local-name(..), "ee:"))]',
                doc,
            );
            // Fallback: also check for ee:transform in any namespace
            const dwTransforms2 = xpath.select('//*[contains(name(), ":transform")]', doc);
            const dwCount = Array.isArray(dwTransforms)
                ? dwTransforms.length
                : Array.isArray(dwTransforms2)
                    ? dwTransforms2.length
                    : 0;
            metrics.dwTransformCount += dwCount;

            // Count connector configs (elements ending in -config or named config/connection)
            const configs = xpath.select(
                '//*[contains(local-name(), "-config") or local-name()="config" or contains(local-name(), "-connection")]',
                doc,
            );
            const configCount = Array.isArray(configs) ? configs.length : 0;
            metrics.connectorConfigCount += configCount;

            // Extract connector types from config elements
            if (Array.isArray(configs)) {
                for (const config of configs) {
                    const nodeName = (config as Element).nodeName || '';
                    // Extract prefix before colon (e.g., "http" from "http:request-config")
                    const prefix = nodeName.split(':')[0];
                    if (prefix && !metrics.connectorTypes.includes(prefix)) {
                        metrics.connectorTypes.push(prefix);
                    }
                }
            }

            // Also extract connectors from namespace declarations (more reliable)
            const root = doc.documentElement;
            if (root && root.attributes) {
                // MuleSoft connector namespaces follow pattern: http://www.mulesoft.org/schema/mule/<connector>
                const muleNsPattern = /^http:\/\/www\.mulesoft\.org\/schema\/mule\/(.+)$/;
                for (let i = 0; i < root.attributes.length; i++) {
                    const attr = root.attributes[i];
                    if (attr.name.startsWith('xmlns:')) {
                        const match = muleNsPattern.exec(attr.value);
                        if (match) {
                            const connector = match[1];
                            // Skip internal/core namespaces
                            const skipList = ['core', 'documentation', 'ee/core', 'doc'];
                            if (
                                !skipList.includes(connector) &&
                                !metrics.connectorTypes.includes(connector)
                            ) {
                                metrics.connectorTypes.push(connector);
                            }
                        }
                    }
                }
            }

            // Count HTTP listeners (services)
            const listeners = xpath.select('//*[local-name()="listener"]', doc);
            const listenerCount = Array.isArray(listeners) ? listeners.length : 0;
            metrics.httpListenerCount += listenerCount;

            // Count error handlers (try scopes)
            const trys = xpath.select('//*[local-name()="try"]', doc);
            const tryCount = Array.isArray(trys) ? trys.length : 0;
            metrics.errorHandlerCount += tryCount;

            // Count choice routers (conditionals)
            const choices = xpath.select('//*[local-name()="choice"]', doc);
            const choiceCount = Array.isArray(choices) ? choices.length : 0;
            metrics.choiceRouterCount += choiceCount;

            // Extract API endpoints from flow names (APIkit pattern: "get:\path:config")
            if (Array.isArray(flows)) {
                for (const flow of flows) {
                    const flowName = (flow as Element).getAttribute('name') || '';
                    // Pattern: method:\path:config-name (e.g., "get:\customers:api-config")
                    const match = flowName.match(
                        /^(get|post|put|patch|delete|head|options):\\(.+?)(?::|$)/i,
                    );
                    if (match) {
                        const method = match[1].toUpperCase();
                        const path = match[2].replace(/\\/g, '/');
                        // Avoid duplicates
                        if (
                            !metrics.apiEndpoints.some(
                                (ep) => ep.path === path && ep.method === method,
                            )
                        ) {
                            metrics.apiEndpoints.push({ path: '/' + path, method });
                        }
                    }
                }
            }

            // Also extract HTTP listener paths
            if (Array.isArray(listeners)) {
                for (const listener of listeners) {
                    const path = (listener as Element).getAttribute('path');
                    if (
                        path &&
                        !path.includes('*') &&
                        !metrics.apiEndpoints.some((ep) => ep.path === path)
                    ) {
                        metrics.apiEndpoints.push({ path, method: 'ALL' });
                    }
                }
            }

            // Extract security patterns from namespaces (root already declared above)
            if (root && root.attributes) {
                for (let i = 0; i < root.attributes.length; i++) {
                    const attr = root.attributes[i];
                    if (attr.name.startsWith('xmlns:')) {
                        const ns = attr.value.toLowerCase();
                        if (ns.includes('tls') && !metrics.securityPatterns.includes('TLS')) {
                            metrics.securityPatterns.push('TLS');
                        }
                        if (ns.includes('oauth') && !metrics.securityPatterns.includes('OAuth')) {
                            metrics.securityPatterns.push('OAuth');
                        }
                    }
                }
            }
            // Check for secure-properties config
            const secureProps = xpath.select(
                '//*[contains(local-name(), "secure-properties")]',
                doc,
            );
            if (
                Array.isArray(secureProps) &&
                secureProps.length > 0 &&
                !metrics.securityPatterns.includes('Secure Properties')
            ) {
                metrics.securityPatterns.push('Secure Properties');
            }
            // Check for basic-auth
            const basicAuth = xpath.select(
                '//*[contains(local-name(), "basic-authentication")]',
                doc,
            );
            if (
                Array.isArray(basicAuth) &&
                basicAuth.length > 0 &&
                !metrics.securityPatterns.includes('Basic Auth')
            ) {
                metrics.securityPatterns.push('Basic Auth');
            }

            // Extract external services (HTTP request configs)
            const requestConfigs = xpath.select('//*[local-name()="request-config"]', doc);
            if (Array.isArray(requestConfigs)) {
                for (const config of requestConfigs) {
                    const name = (config as Element).getAttribute('name') || 'unknown';
                    const host = (config as Element).getAttribute('host') || '';
                    const basePath = (config as Element).getAttribute('basePath') || '';
                    const hostValue = host || basePath || 'external';
                    if (!metrics.externalServices.some((s) => s.name === name)) {
                        metrics.externalServices.push({ name, host: hostValue });
                    }
                }
            }

            // Extract schedulers (cron and fixed frequency)
            const schedulerTriggers = xpath.select(
                '//*[local-name()="scheduling-strategy"]/*',
                doc,
            );
            if (Array.isArray(schedulerTriggers)) {
                for (const trigger of schedulerTriggers) {
                    const triggerName = (trigger as Element).localName || '';
                    if (triggerName === 'cron') {
                        const expression = (trigger as Element).getAttribute('expression') || '';
                        const parent = (trigger as Element).parentNode?.parentNode;
                        const flowName = parent
                            ? (parent as Element).getAttribute('name') || 'unknown'
                            : 'unknown';
                        metrics.schedulers.push({
                            type: 'cron',
                            value: expression,
                            flow: flowName,
                        });
                    } else if (triggerName === 'fixed-frequency') {
                        const freq = (trigger as Element).getAttribute('frequency') || '';
                        const unit =
                            (trigger as Element).getAttribute('timeUnit') || 'MILLISECONDS';
                        const parent = (trigger as Element).parentNode?.parentNode;
                        const flowName = parent
                            ? (parent as Element).getAttribute('name') || 'unknown'
                            : 'unknown';
                        metrics.schedulers.push({
                            type: 'fixed',
                            value: freq + ' ' + unit,
                            flow: flowName,
                        });
                    }
                }
            }

            // Calculate file complexity based on flow count
            const totalFlows = flowCount + subFlowCount;
            let complexity: 'simple' | 'medium' | 'complex' = 'simple';
            if (totalFlows >= 10) {
                complexity = 'complex';
            } else if (totalFlows >= 5) {
                complexity = 'medium';
            }
            metrics.fileComplexity[relativePath] = complexity;
        } catch {
            // Silently skip metrics collection on error
        }
    }
}
