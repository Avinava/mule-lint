import * as fs from 'fs';
import * as path from 'path';
import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { parseXml } from '../../core/XmlParser';
import {
  SENSITIVE_LOG_CATEGORIES,
  findSensitiveLoggers,
  type SensitiveLogCategory,
} from '../../core/SensitiveLogCategories';

/**
 * LOG-007: Sensitive Connector Logger
 *
 * log4j2.xml makes a category known to write credentials or session data
 * verbose: Salesforce streaming (CometD) and its Jetty client, the Salesforce
 * connector, and HTTP wire and header loggers. The logger may name the
 * category or an ancestor of it, including the root. Messages name the logger
 * and the categories only.
 */
export class SensitiveConnectorLoggerRule extends ProjectRule {
  id = 'LOG-007';
  name = 'Sensitive Connector Logger';
  description =
    'log4j2.xml must not set categories that write credentials or session data to DEBUG or TRACE';
  severity = 'warning' as const;
  category = 'logging' as const;
  override issueType: IssueType = 'vulnerability';

  protected validateProject(context: ValidationContext): Issue[] {
    const relativePath = 'src/main/resources/log4j2.xml';
    let content: string;
    try {
      content = fs.readFileSync(path.join(context.projectRoot, relativePath), 'utf8');
    } catch {
      return [];
    }
    const parsed = parseXml(content, relativePath);
    if (!parsed.success || !parsed.document) {
      return [];
    }

    const categories: SensitiveLogCategory[] = [
      ...SENSITIVE_LOG_CATEGORIES,
      ...this.getOption<string[]>(context, 'additionalCategories', []).map((category) => ({
        category,
        exposes: 'credentials or session data',
      })),
    ];

    return findSensitiveLoggers(parsed.document, categories).map((finding) => {
      const isRoot = finding.name === 'Root';
      // Name the categories only when the logger reaches them as an ancestor
      const enabled = finding.categories
        .map((entry) => entry.category)
        .filter((category) => isRoot || category.startsWith(`${finding.name}.`));
      const exposes = [...new Set(finding.categories.map((entry) => entry.exposes))];
      const subject = isRoot ? 'The root logger' : `Logger "${finding.name}"`;
      const scope = enabled.length === 0 ? '' : ` enables ${enabled.join(', ')} and`;
      return this.createLocatedIssue(
        relativePath,
        finding.line,
        `${subject} is set to ${finding.level}, which${scope} can write ${exposes.join('; ')} to the logs`,
        {
          projectRoot: context.projectRoot,
          suggestion:
            'Set these categories to INFO or WARN in committed configuration. Raise them only temporarily while diagnosing, outside shared environments, and rotate any credential that was logged.',
        },
      );
    });
  }
}
