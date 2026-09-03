import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import { Rule, Issue, Severity, RuleCategory, ValidationContext, IssueType } from '../types';
import { XPathHelper, getLineNumber, getAttribute } from './XPathHelper';
import { getErrorMessage } from './errors';

/**
 * Categories a custom rule may declare.
 *
 * Declared as a `satisfies Record<RuleCategory, true>` so that adding a rule
 * category without listing it here — or listing one that no longer exists — is
 * a compile error rather than a loader that silently rejects valid
 * configuration.
 */
const ACCEPTED_CATEGORIES = {
  'error-handling': true,
  naming: true,
  security: true,
  logging: true,
  http: true,
  performance: true,
  documentation: true,
  standards: true,
  complexity: true,
  dataweave: true,
  structure: true,
  'api-led': true,
  'api-design': true,
  governance: true,
  operations: true,
  testing: true,
  experimental: true,
} satisfies Record<RuleCategory, true>;

const RULE_CATEGORIES = Object.keys(ACCEPTED_CATEGORIES) as [RuleCategory, ...RuleCategory[]];

/** Message placeholders a custom rule may use. */
const SUPPORTED_PLACEHOLDERS = ['name', 'nodeName', 'filePath', 'line'] as const;

const CustomRuleSchema = z
  .object({
    id: z
      .string()
      .regex(
        /^[A-Z]+-\d{3}$/,
        'must look like ACME-001: uppercase letters, a hyphen, three digits',
      ),
    name: z.string().min(1),
    description: z.string().min(1),
    category: z.enum(RULE_CATEGORIES),
    severity: z.enum(['error', 'warning', 'info']),
    xpath: z.string().min(1),
    message: z.string().min(1),
    suggestion: z.string().optional(),
  })
  .strict();

const CustomRuleFileSchema = z
  .object({
    namespaces: z.record(z.string(), z.string()).optional(),
    rules: z.array(CustomRuleSchema).min(1),
  })
  .strict();

export type CustomRuleDefinition = z.infer<typeof CustomRuleSchema>;

/**
 * A rule defined declaratively in YAML rather than in TypeScript.
 *
 * Custom rules evaluate one XPath expression per document and report a
 * formatted message for every matching node. They cannot execute code: the
 * loader accepts an expression and a message template, nothing else.
 */
class CustomXPathRule implements Rule {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly severity: Severity;
  public readonly category: RuleCategory;
  public readonly issueType: IssueType = 'code-smell';
  /**
   * Marks this rule as declaratively defined. Quality ratings exclude custom
   * rules, since their issue types are author-declared rather than modelled.
   */
  public readonly isCustomRule = true;

  private readonly xpathExpression: string;
  private readonly messageTemplate: string;
  private readonly suggestion: string | undefined;
  private readonly helper: XPathHelper;

  constructor(definition: CustomRuleDefinition, helper: XPathHelper) {
    this.id = definition.id;
    this.name = definition.name;
    this.description = definition.description;
    this.severity = definition.severity;
    this.category = definition.category;
    this.xpathExpression = definition.xpath;
    this.messageTemplate = definition.message;
    this.suggestion = definition.suggestion;
    this.helper = helper;
  }

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    for (const node of this.helper.selectNodes(this.xpathExpression, doc)) {
      const line = getLineNumber(node);
      const values: Record<string, string> = {
        name: getAttribute(node, 'name') ?? '',
        nodeName: (node as Element).localName,
        filePath: context.relativePath,
        line: String(line),
      };

      issues.push({
        line,
        message: this.render(this.messageTemplate, values),
        ruleId: this.id,
        severity: this.severity,
        suggestion: this.suggestion,
      });
    }

    return issues;
  }

  /**
   * Substitute the documented placeholders. Anything else is left literal, so
   * a template cannot reach values it was not given.
   */
  private render(template: string, values: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (match, key: string) =>
      SUPPORTED_PLACEHOLDERS.includes(key as (typeof SUPPORTED_PLACEHOLDERS)[number])
        ? (values[key] ?? '')
        : match,
    );
  }
}

/**
 * Raised when a custom rule file cannot be used. The CLI turns this into
 * exit code 2, the same as any other configuration error.
 */
export class CustomRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomRuleError';
  }
}

/**
 * Load and validate declarative XPath rules from a YAML file.
 *
 * Only local files are read. No URL is fetched, no module is imported, no
 * environment variable is interpolated, and no template expression is
 * evaluated — a custom rule is an XPath expression and a message, nothing more.
 *
 * @param filePath - Path to the YAML rule file
 * @param builtInIds - IDs already taken by built-in rules, to reject collisions
 * @throws {CustomRuleError} When the file is missing, malformed, or invalid
 */
export function loadCustomXPathRules(filePath: string, builtInIds: string[] = []): Rule[] {
  const absolutePath = path.resolve(filePath);

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(filePath)) {
    throw new CustomRuleError(
      `Custom rules must be a local file; "${filePath}" looks like a URL and was not loaded`,
    );
  }

  if (!fs.existsSync(absolutePath)) {
    throw new CustomRuleError(`Custom rules file not found: ${absolutePath}`);
  }

  let raw: unknown;
  try {
    raw = yaml.load(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new CustomRuleError(
      `Custom rules file is not valid YAML (${absolutePath}): ${getErrorMessage(error)}`,
    );
  }

  const parsed = CustomRuleFileSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new CustomRuleError(`Invalid custom rules file (${absolutePath}): ${detail}`);
  }

  let helper: XPathHelper;
  try {
    helper = parsed.data.namespaces
      ? XPathHelper.withNamespaces(parsed.data.namespaces)
      : XPathHelper.getInstance();
  } catch (error) {
    throw new CustomRuleError(
      `Invalid namespaces in custom rules file (${absolutePath}): ${getErrorMessage(error)}`,
    );
  }

  const builtIns = new Set(builtInIds);
  const seen = new Set<string>();
  const rules: Rule[] = [];

  for (const definition of parsed.data.rules) {
    if (builtIns.has(definition.id)) {
      throw new CustomRuleError(
        `Custom rule ID "${definition.id}" collides with a built-in rule; use an organization prefix such as ACME-001`,
      );
    }
    if (seen.has(definition.id)) {
      throw new CustomRuleError(`Duplicate custom rule ID "${definition.id}"`);
    }
    seen.add(definition.id);

    assertCompilableXPath(definition, absolutePath, helper);
    rules.push(new CustomXPathRule(definition, helper));
  }

  return rules;
}

/**
 * Compile the expression up front so a syntax error is a configuration failure
 * rather than a rule that silently matches nothing on every file.
 */
function assertCompilableXPath(
  definition: CustomRuleDefinition,
  absolutePath: string,
  helper: XPathHelper,
): void {
  try {
    helper.compile(definition.xpath);
  } catch (error) {
    throw new CustomRuleError(
      `Invalid XPath in custom rule "${definition.id}" (${absolutePath}): ${getErrorMessage(error)}`,
    );
  }
}
