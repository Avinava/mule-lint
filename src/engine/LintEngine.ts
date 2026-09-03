import * as path from 'path';
import * as fs from 'fs';
import fg from 'fast-glob';
import {
  Rule,
  Issue,
  RuleConfig,
  ValidationContext,
  Severity,
  ProjectContext,
  ProjectLayer,
} from '../types';
import { LintConfig, DEFAULT_CONFIG } from '../types/Config';
import { LintReport, LintSummary, FileResult, ProjectMetrics } from '../types/Report';
import { parseXml } from '../core/XmlParser';
import { scanDirectory, readFileContent, ScannedFile } from '../core/FileScanner';
import { MetricsAggregator } from '../core/MetricsAggregator';
import { collectFileMetrics as collectMetrics } from '../core/MetricsCollector';
import { getErrorMessage } from '../core/errors';
import { ProjectRule } from '../rules/base/ProjectRule';
import { getLineNumber } from '../core/XPathHelper';

/**
 * Element local-names that count as *inbound* authentication evidence.
 *
 * Matched as whole local-names rather than substrings: an outbound connector
 * such as `oauth-jwt-connection` authenticates a call this application makes,
 * and must not be mistaken for a control protecting an inbound listener.
 */
const INBOUND_AUTH_ELEMENTS = new Set([
  'client-id-enforcement-policy',
  'basic-security-filter',
  'authentication-filter',
  'authorization-filter',
  'http-basic-authentication-filter',
  'jwt-validation',
  'validate-token',
  'openid-connect',
  'oauth2-provider',
  'token-validation',
  'authorization-code-grant-type',
  'secret-key-encryption',
  'spring-security-filter',
  'spring-authorization-filter',
  'security-manager',
]);

/**
 * Local-name fragments that identify an inbound authentication component whose
 * exact element name varies by connector version.
 */
const INBOUND_AUTH_PATTERNS = ['jwt-valid', 'client-id-enforcement', 'oauth2-provider'];

/** POM artifactId fragments indicating the Secure Configuration Properties module. */
const SECURE_PROPERTIES_ARTIFACTS = ['secure-configuration-property', 'secure-properties'];

/** POM artifactId fragments indicating a messaging connector. */
const MESSAGING_ARTIFACTS = ['mule-jms-connector', 'anypoint-mq'];
import { isRuleEnabledInProfile, resolveRuleProfile, type RuleProfileName } from '../catalog';

/**
 * Engine options
 */
export interface EngineOptions {
  /** Rules to use for linting */
  rules: Rule[];
  /** Configuration (optional, uses defaults) */
  config?: Partial<LintConfig> | undefined;
  /** Verbose logging */
  verbose?: boolean | undefined;
}

/**
 * Main lint engine that orchestrates file scanning, parsing, and rule execution
 */
export class LintEngine {
  private rules: Rule[];
  private config: LintConfig;
  private verbose: boolean;
  private profile: RuleProfileName | undefined;

  /**
   * Cache of parsed XML documents keyed by absolute file path.
   * Populated during preScanFiles() and reused in processFile()
   * to avoid parsing every XML file twice.
   */
  private documentCache: Map<string, Document> = new Map();

  constructor(options: EngineOptions) {
    this.rules = options.rules;
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.verbose = options.verbose ?? false;
    this.profile = options.config?.extends ? resolveRuleProfile(options.config.extends) : undefined;
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

    // Pre-scan: collect cross-file context before rule execution
    const { allFlowRefs, allFlowNames, projectContext } = isStandalone
      ? { allFlowRefs: undefined, allFlowNames: undefined, projectContext: undefined }
      : this.preScanFiles(files, projectRoot);

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
      const result = this.processFile(
        file,
        projectRoot,
        isStandalone,
        metricsAggregator,
        allFlowRefs,
        allFlowNames,
        projectContext,
      );
      fileResults.push(result);
    }

    // Run Project Rules (only once per scan, if not standalone)
    if (!isStandalone) {
      const projectIssues = this.runProjectRules(
        projectRoot,
        allFlowRefs,
        allFlowNames,
        projectContext,
      );
      fileResults.push(...this.groupProjectIssues(projectIssues, projectRoot));
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
        const environmentName = envMatch?.[1];
        if (environmentName) {
          const env = environmentName.toLowerCase();
          if (!metricsAggregator.environments.includes(env)) {
            metricsAggregator.environments.push(env);
          }
        }
      }
    }

    // Build report
    const durationMs = Date.now() - startTime;
    const summary = this.buildSummary(fileResults, files.length);

    this.log(`Scan complete in ${durationMs}ms`);
    this.log(`Found ${summary.bySeverity.error} errors, ${summary.bySeverity.warning} warnings`);

    // Release cached documents to free memory
    this.documentCache.clear();

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
    const enhancedMetrics = MetricsAggregator.aggregateMetrics(
      baseReport,
      this.rules,
      this.getCustomRuleIds(),
    );

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
    allFlowRefs?: Set<string>,
    allFlowNames?: Set<string>,
    projectContext?: ProjectContext,
  ): FileResult {
    this.log(`  Processing: ${file.relativePath}`);

    try {
      // Try to use the cached document from preScanFiles() first
      const cachedDoc = this.documentCache.get(file.absolutePath);
      let doc: Document;

      if (cachedDoc) {
        doc = cachedDoc;
      } else {
        // Cache miss (standalone mode or non-XML processed first time)
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

        doc = parseResult.document;
      }

      const issues = this.runRules(
        doc,
        file.absolutePath,
        projectRoot,
        isStandalone,
        allFlowRefs,
        allFlowNames,
        projectContext,
      );

      // Collect metrics from parsed document
      if (metricsAggregator) {
        this.collectFileMetrics(doc, file.relativePath, metricsAggregator);
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
    allFlowRefs?: Set<string>,
    allFlowNames?: Set<string>,
    projectContext?: ProjectContext,
  ): Issue[] {
    const issues: Issue[] = [];
    const enabledRules = this.getEnabledRules();

    for (const rule of enabledRules) {
      // Skip structure rules for standalone files
      if (isStandalone && rule.category === 'structure') {
        continue;
      }

      // Skip ProjectRule instances — they are handled separately in runProjectRules()
      if (rule instanceof ProjectRule) {
        continue;
      }

      try {
        const context: ValidationContext = {
          filePath,
          relativePath: path.relative(projectRoot, filePath),
          projectRoot,
          config: this.getRuleConfig(rule.id),
          allFlowRefs,
          allFlowNames,
          projectContext,
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
        // eslint-disable-next-line no-console -- isolate rule failures without hiding diagnostics.
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
      const rule = this.rules.find((candidate) => candidate.id === ruleId);
      return {
        enabled: rule && this.profile ? isRuleEnabledInProfile(rule, this.profile) : true,
      };
    }

    if (typeof config === 'boolean') {
      return { enabled: config };
    }

    return config;
  }

  /**
   * Build summary statistics from file results
   */
  private buildSummary(files: FileResult[], scannedFileCount: number): LintSummary {
    const bySeverity: Record<Severity, number> = {
      error: 0,
      warning: 0,
      info: 0,
    };
    const byRule: Record<string, number> = {};
    let filesWithIssues = 0;
    let parseErrors = 0;

    for (const [index, file] of files.entries()) {
      const isScannedFile = index < scannedFileCount;
      if (isScannedFile && !file.parsed) {
        parseErrors++;
      }
      if (isScannedFile && file.issues.length > 0) {
        filesWithIssues++;
      }
      for (const issue of file.issues) {
        bySeverity[issue.severity]++;
        byRule[issue.ruleId] = (byRule[issue.ruleId] ?? 0) + 1;
      }
    }

    return {
      totalFiles: scannedFileCount,
      filesWithIssues,
      parseErrors,
      bySeverity,
      byRule,
    };
  }

  /**
   * IDs of declaratively defined rules, which are reported but excluded from
   * quality ratings because their issue types are author-declared.
   */
  private getCustomRuleIds(): ReadonlySet<string> {
    return new Set(
      this.rules
        .filter((rule) => (rule as { isCustomRule?: boolean }).isCustomRule === true)
        .map((rule) => rule.id),
    );
  }

  /**
   * Turn project-rule issues into file results.
   *
   * Issues carrying a relativePath (a project rule reporting against a real
   * resource, such as a `.properties` file) get their own file result so
   * formatters and SARIF point at the responsible file. Everything else keeps
   * the synthetic project entry. Groups are sorted so output does not depend on
   * filesystem enumeration order.
   */
  private groupProjectIssues(issues: Issue[], projectRoot: string): FileResult[] {
    if (issues.length === 0) {
      return [];
    }

    const located = new Map<string, Issue[]>();
    const unlocated: Issue[] = [];

    for (const issue of issues) {
      const relativePath = issue.relativePath;
      if (relativePath) {
        const bucket = located.get(relativePath);
        if (bucket) {
          bucket.push(issue);
        } else {
          located.set(relativePath, [issue]);
        }
      } else {
        unlocated.push(issue);
      }
    }

    const results: FileResult[] = [];

    if (unlocated.length > 0) {
      results.push({
        filePath: path.join(projectRoot, 'mule-artifact.json'), // Virtual target
        relativePath: 'Project Structure',
        issues: unlocated,
        parsed: true,
      });
    }

    for (const relativePath of [...located.keys()].sort()) {
      const fileIssues = located.get(relativePath) ?? [];
      fileIssues.sort((a, b) => a.line - b.line || a.ruleId.localeCompare(b.ruleId));
      results.push({
        filePath: path.join(projectRoot, relativePath),
        relativePath,
        issues: fileIssues,
        parsed: true,
      });
    }

    return results;
  }

  /**
   * Record inventory facts about one element during the pre-scan walk.
   *
   * Called for every element of every cached document, so it stays cheap:
   * local-name comparisons only, no XPath and no re-parsing.
   */
  private collectInventory(
    el: Element,
    localName: string,
    prefix: string,
    namespace: string,
    relativePath: string,
    projectContext: ProjectContext,
  ): void {
    const isHttp = prefix === 'http' || namespace.endsWith('/mule/http');

    // HTTP listeners and their global configs, for path and versioning analysis
    if (localName === 'listener' && isHttp) {
      projectContext.listenerEndpoints?.push({
        relativePath,
        line: getLineNumber(el),
        flowName: this.findEnclosingFlowName(el),
        configRef: el.getAttribute('config-ref') ?? undefined,
        path: el.getAttribute('path') ?? undefined,
        allowedMethods: el.getAttribute('allowedMethods') ?? undefined,
      });
    }
    if (localName === 'listener-config' && isHttp) {
      const name = el.getAttribute('name');
      if (name) {
        projectContext.listenerConfigs?.push({
          name,
          basePath: el.getAttribute('basePath') ?? undefined,
        });
      }
    }

    // Secure Configuration Properties module
    if (
      localName === 'secure-configuration-properties' ||
      (localName === 'config' && namespace.includes('secure-properties'))
    ) {
      projectContext.hasSecurePropertiesConfig = true;
    }

    // Object Store usage
    if (prefix === 'os' || namespace.endsWith('/mule/os')) {
      projectContext.hasObjectStoreUsage = true;
    }
    if (localName === 'private-object-store' || localName === 'object-store') {
      projectContext.hasObjectStoreUsage = true;
    }

    // Messaging connectors
    if (
      prefix === 'jms' ||
      prefix === 'anypoint-mq' ||
      namespace.endsWith('/mule/jms') ||
      namespace.endsWith('/mule/anypoint-mq')
    ) {
      projectContext.hasMessagingUsage = true;
    }

    if (localName === 'idempotent-message-validator') {
      projectContext.hasIdempotencyEvidence = true;
    }

    if (localName === 'cors' || localName.startsWith('cors-')) {
      projectContext.hasCorsConfig = true;
    }

    if (localName === 'job' && (prefix === 'batch' || namespace.endsWith('/mule/batch'))) {
      projectContext.hasBatchJob = true;
    }

    // Inbound authentication evidence. An outbound connector element such as
    // oauth-jwt-connection authenticates a call this application makes and is
    // deliberately excluded, so it cannot suppress SEC-016.
    if (!this.isOutboundConnectionElement(localName)) {
      if (
        INBOUND_AUTH_ELEMENTS.has(localName) ||
        INBOUND_AUTH_PATTERNS.some((pattern) => localName.includes(pattern))
      ) {
        projectContext.hasAuthEvidence = true;
      }
    }

    // APIKit OPTIONS flow, the CORS applicability signal
    if (localName === 'flow') {
      const flowName = el.getAttribute('name') ?? '';
      if (/\boptions\b/i.test(flowName.replace(/[:\\/]/g, ' '))) {
        projectContext.hasOptionsFlow = true;
      }
    }
  }

  /**
   * True for connector elements that configure an outbound connection.
   *
   * These carry credentials this application presents to someone else, which is
   * the opposite of a control protecting an inbound listener.
   */
  private isOutboundConnectionElement(localName: string): boolean {
    return (
      localName.endsWith('-connection') ||
      localName.endsWith('-config') ||
      localName.endsWith('-grant-type') ||
      localName === 'authentication' ||
      localName === 'request'
    );
  }

  /**
   * Walk up from a node to the name of the flow or sub-flow containing it.
   */
  private findEnclosingFlowName(node: Node): string | undefined {
    let current: Node | null = node.parentNode;
    while (current) {
      const localName = (current as Element).localName;
      if (localName === 'flow' || localName === 'sub-flow') {
        return (current as Element).getAttribute('name') ?? undefined;
      }
      current = current.parentNode;
    }
    return undefined;
  }

  /**
   * Discover API specifications and POM dependencies once per project scan.
   *
   * An unreadable or malformed resource is skipped rather than aborting the
   * scan; the rule depending on it simply sees no evidence.
   */
  private collectProjectResources(projectRoot: string, projectContext: ProjectContext): void {
    const specFiles: string[] = [];
    const resourcesPath = path.join(projectRoot, 'src/main/resources');

    if (fs.existsSync(resourcesPath)) {
      const candidates = fg.sync(['**/*.raml', '**/*.yaml', '**/*.yml', '**/*.json'], {
        cwd: resourcesPath,
        onlyFiles: true,
        followSymbolicLinks: false,
        ignore: ['**/target/**', '**/node_modules/**'],
      });

      for (const candidate of candidates.sort()) {
        if (this.looksLikeApiSpec(path.join(resourcesPath, candidate))) {
          specFiles.push(path.join('src/main/resources', candidate));
        }
      }
    }

    projectContext.apiSpecFiles = specFiles;
    projectContext.hasApiSpec = specFiles.length > 0;
    projectContext.dependencyArtifactIds = this.readPomArtifactIds(projectRoot);

    if (
      projectContext.dependencyArtifactIds.some((id) =>
        SECURE_PROPERTIES_ARTIFACTS.some((artifact) => id.includes(artifact)),
      )
    ) {
      projectContext.hasSecurePropertiesConfig = true;
    }
    if (
      projectContext.dependencyArtifactIds.some((id) =>
        MESSAGING_ARTIFACTS.some((artifact) => id.includes(artifact)),
      )
    ) {
      projectContext.hasMessagingUsage = true;
    }
    if (projectContext.dependencyArtifactIds.some((id) => id.includes('objectstore'))) {
      projectContext.hasObjectStoreUsage = true;
    }
  }

  /**
   * Identify a RAML or OpenAPI document by its content rather than its path.
   *
   * Only the head of the file is read, so a large specification is not loaded in
   * full just to classify it.
   */
  private looksLikeApiSpec(absolutePath: string): boolean {
    let head: string;
    try {
      head = fs.readFileSync(absolutePath, 'utf8').slice(0, 4096);
    } catch {
      return false;
    }

    const extension = path.extname(absolutePath).toLowerCase();

    if (extension === '.raml') {
      const firstMeaningfulLine = head
        .split(/\r?\n/)
        .find((line) => line.trim().length > 0)
        ?.trim();
      return firstMeaningfulLine?.startsWith('#%RAML') ?? false;
    }

    if (extension === '.json') {
      return /"(openapi|swagger)"\s*:/.test(head);
    }

    // YAML: a top-level openapi/swagger key, i.e. at column zero
    return /^(openapi|swagger)\s*:/m.test(head);
  }

  /**
   * Read Maven artifactIds from pom.xml.
   *
   * A regex suffices and avoids parsing a document that is not a Mule
   * configuration; the POM is only coarse dependency evidence.
   */
  private readPomArtifactIds(projectRoot: string): string[] {
    const pomPath = path.join(projectRoot, 'pom.xml');
    if (!fs.existsSync(pomPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(pomPath, 'utf8');
      const ids = [...content.matchAll(/<artifactId>\s*([^<\s]+)\s*<\/artifactId>/g)].map(
        (match) => match[1] ?? '',
      );
      return [...new Set(ids.filter((id) => id.length > 0))].sort();
    } catch {
      return [];
    }
  }

  /**
   * Run project-level rules that don't depend on specific files
   */
  private runProjectRules(
    projectRoot: string,
    allFlowRefs?: Set<string>,
    allFlowNames?: Set<string>,
    projectContext?: ProjectContext,
  ): Issue[] {
    const issues: Issue[] = [];

    const projectRules = this.getEnabledRules().filter(
      (rule): rule is Rule & Required<Pick<Rule, 'runProject'>> =>
        typeof rule.runProject === 'function',
    );

    for (const rule of projectRules) {
      try {
        const context: ValidationContext = {
          filePath: path.join(projectRoot, 'pom.xml'), // Pseudo-file
          relativePath: 'Project Root',
          projectRoot,
          config: this.getRuleConfig(rule.id),
          allFlowRefs,
          allFlowNames,
          projectContext,
        };

        const ruleIssues = rule.runProject(context);
        const configSeverity = context.config.severity;
        if (configSeverity) {
          for (const issue of ruleIssues) {
            issue.severity = configSeverity;
          }
        }
        issues.push(...ruleIssues);
      } catch (error) {
        const message = getErrorMessage(error);
        // eslint-disable-next-line no-console -- isolate project-rule failures without hiding diagnostics.
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

  /**
   * Pre-scan all XML files to build cross-file context:
   *   - allFlowRefs: union of all <flow-ref name="..."> targets across files
   *   - allFlowNames: union of all <flow>/<sub-flow> name attributes across files
   *   - projectContext: whether the project has HTTP listeners / APIkit routers
   *
   * Parsed documents are cached in this.documentCache so that processFile()
   * can reuse them instead of re-parsing.
   *
   * This runs before the main per-file rule execution so that rules can use
   * the aggregated information (e.g. HYG-003 cross-file unused flow detection,
   * HYG-004 cross-file flow-ref target validation,
   * MULE-005 HTTP-only project detection).
   */
  private preScanFiles(
    files: ScannedFile[],
    projectRoot: string,
  ): {
    allFlowRefs: Set<string>;
    allFlowNames: Set<string>;
    projectContext: ProjectContext;
  } {
    const allFlowRefs = new Set<string>();
    const allFlowNames = new Set<string>();
    const projectContext: ProjectContext = {
      hasHttpListener: false,
      hasApikitRouter: false,
      hasApiKitConfig: false,
      hasAutoDiscovery: false,
      hasSecurePropertiesConfig: false,
      hasObjectStoreUsage: false,
      hasMessagingUsage: false,
      hasIdempotencyEvidence: false,
      hasCorsConfig: false,
      hasOptionsFlow: false,
      hasAuthEvidence: false,
      hasBatchJob: false,
      listenerEndpoints: [],
      listenerConfigs: [],
    };

    // Clear the cache at the start of each scan
    this.documentCache.clear();

    for (const file of files) {
      // Only process XML files
      if (!file.absolutePath.endsWith('.xml')) {
        continue;
      }

      try {
        const content = readFileContent(file.absolutePath);
        const parseResult = parseXml(content, file.relativePath);

        if (!parseResult.success || !parseResult.document) {
          continue;
        }

        const doc = parseResult.document;

        // Cache the parsed document for reuse in processFile()
        this.documentCache.set(file.absolutePath, doc);

        // Collect flow-ref targets
        const allElements = doc.getElementsByTagName('*');
        for (const el of Array.from(allElements)) {
          const localName = el.localName;

          if (localName === 'flow-ref') {
            const name = el.getAttribute('name');
            if (name) {
              allFlowRefs.add(name);
            }
          }

          // Collect flow/sub-flow definitions
          if (localName === 'flow' || localName === 'sub-flow') {
            const name = el.getAttribute('name');
            if (name) {
              allFlowNames.add(name);
            }
          }

          const namespace = el.namespaceURI ?? '';
          const prefix = el.prefix ?? el.nodeName.split(':')[0] ?? '';

          // Detect an HTTP listener, not an arbitrary connector listener.
          if (localName === 'listener' && (prefix === 'http' || namespace.endsWith('/mule/http'))) {
            projectContext.hasHttpListener = true;
          }

          // Detect APIkit router or console
          const isApiKit = prefix === 'apikit' || namespace.endsWith('/mule/apikit');
          if (isApiKit && (localName === 'router' || localName === 'console')) {
            projectContext.hasApikitRouter = true;
          }
          if (isApiKit && localName === 'config') {
            projectContext.hasApiKitConfig = true;
          }
          if (localName === 'autodiscovery' || localName === 'api-autodiscovery') {
            projectContext.hasAutoDiscovery = true;
          }

          this.collectInventory(
            el,
            localName,
            prefix,
            namespace,
            file.relativePath,
            projectContext,
          );
        }
      } catch {
        // Ignore unreadable files during pre-scan
      }
    }

    // Detect project layer from directory name, flow names, and content
    this.collectProjectResources(projectRoot, projectContext);

    projectContext.projectLayer = this.detectProjectLayer(files, allFlowNames, projectContext);

    return { allFlowRefs, allFlowNames, projectContext };
  }

  /**
   * Detect the API-led connectivity layer of the project.
   *
   * Heuristics (in priority order):
   * 1. Directory/project name contains `-sapi`, `-papi`, `-eapi`
   * 2. Flow names contain `sapi`, `papi`, `eapi` patterns
   * 3. No HTTP listener + batch jobs → batch
   * 4. No flows at all → library
   * 5. Otherwise → unknown
   */
  private detectProjectLayer(
    files: ScannedFile[],
    allFlowNames: Set<string>,
    projectContext: ProjectContext,
  ): ProjectLayer {
    // Check project directory name
    const firstFile = files[0];
    const projectDir = firstFile
      ? path.basename(path.resolve(firstFile.absolutePath, '..', '..', '..', '..'))
      : '';
    const dirLower = projectDir.toLowerCase();

    if (dirLower.includes('-sapi') || dirLower.includes('_sapi') || dirLower.endsWith('sapi')) {
      return 'sapi';
    }
    if (dirLower.includes('-papi') || dirLower.includes('_papi') || dirLower.endsWith('papi')) {
      return 'papi';
    }
    if (dirLower.includes('-eapi') || dirLower.includes('_eapi') || dirLower.endsWith('eapi')) {
      return 'eapi';
    }

    // Check flow names for layer hints
    const flowNamesArray = [...allFlowNames].map((n) => n.toLowerCase());
    const hasSapiFlow = flowNamesArray.some((n) => n.includes('sapi') || n.includes('system-api'));
    const hasPapiFlow = flowNamesArray.some((n) => n.includes('papi') || n.includes('process-api'));
    const hasEapiFlow = flowNamesArray.some(
      (n) => n.includes('eapi') || n.includes('experience-api'),
    );

    if (hasSapiFlow && !hasPapiFlow && !hasEapiFlow) return 'sapi';
    if (hasPapiFlow && !hasSapiFlow && !hasEapiFlow) return 'papi';
    if (hasEapiFlow && !hasSapiFlow && !hasPapiFlow) return 'eapi';

    // No flows → library
    if (allFlowNames.size === 0) return 'library';

    // Has batch jobs but no HTTP listener → batch
    const hasBatch = flowNamesArray.some((n) => n.includes('batch'));
    if (hasBatch && !projectContext.hasHttpListener) return 'batch';

    return 'unknown';
  }
}
