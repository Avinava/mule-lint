import * as fs from 'fs';
import * as path from 'path';
import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { parseXml } from '../../core/XmlParser';
import { getLineNumber } from '../../core/XPathHelper';
import { findSensitiveLoggers } from '../../core/SensitiveLogCategories';

/**
 * LOG-006: Connector Debug Logging
 *
 * log4j2.xml sets a connector-internal or HTTP wire-logging category to
 * DEBUG, TRACE, or ALL. At those levels connectors and the HTTP service can
 * write request and response content, including authorization headers,
 * session identifiers, and tokens, to logs that are shared across an
 * environment. Raise them only while diagnosing, and not in a shared
 * environment.
 *
 * When LOG-007 is enabled in the scan, a logger that enables a category known
 * to write credentials or session data is reported by LOG-007 instead.
 */
export class ConnectorDebugLoggingRule extends ProjectRule {
  id = 'LOG-006';
  name = 'Connector Debug Logging';
  description =
    'Connector-internal and HTTP wire-logging categories should not be set to DEBUG or TRACE in log4j2.xml';
  severity = 'info' as const;
  category = 'logging' as const;
  override issueType: IssueType = 'vulnerability';

  /** Category prefixes whose debug output can contain credentials or payloads. */
  private static readonly DEFAULT_CATEGORIES = [
    'org.mule.extension.',
    'org.mule.connectors.',
    'com.mulesoft.connector.',
    'com.mulesoft.connectors.',
    'org.mule.service.http.impl.service.HttpMessageLogger',
  ];

  private static readonly VERBOSE_LEVELS = new Set(['debug', 'trace', 'all']);

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

    const categories = [
      ...ConnectorDebugLoggingRule.DEFAULT_CATEGORIES,
      ...this.getOption<string[]>(context, 'additionalCategories', []),
    ];
    const issues: Issue[] = [];
    // Loggers that enable a credential-writing category are LOG-007's finding,
    // but only when LOG-007 runs in this scan; otherwise nothing would report them
    const log007Enabled = context.projectContext?.enabledRuleIds?.includes('LOG-007') ?? false;
    const ownedByLog007 = new Set(
      log007Enabled ? findSensitiveLoggers(parsed.document).map((finding) => finding.element) : [],
    );

    for (const logger of Array.from(parsed.document.getElementsByTagName('*'))) {
      const localName = logger.localName.toLowerCase();
      if (localName !== 'logger' && localName !== 'asynclogger') continue;
      if (ownedByLog007.has(logger)) continue;

      const name = logger.getAttribute('name') ?? '';
      const level = (logger.getAttribute('level') ?? '').toLowerCase();
      if (!ConnectorDebugLoggingRule.VERBOSE_LEVELS.has(level)) continue;
      if (!categories.some((category) => name === category || name.startsWith(category))) continue;

      issues.push(
        this.createLocatedIssue(
          relativePath,
          getLineNumber(logger),
          `Logger "${name}" is set to ${level.toUpperCase()}, which can write credentials, session identifiers, or payloads to the logs`,
          {
            projectRoot: context.projectRoot,
            suggestion:
              'Use INFO or WARN in committed configuration, and raise the level only temporarily while diagnosing, outside shared environments.',
          },
        ),
      );
    }

    return issues;
  }
}
