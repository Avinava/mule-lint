/**
 * log4j2 categories known to write credentials or session data at verbose
 * levels, and the resolution of which configured logger enables them.
 *
 * LOG-007 reports these; LOG-006 skips the loggers LOG-007 owns so one
 * logger is not reported twice.
 */

import { getLineNumber } from './XPathHelper';

export interface SensitiveLogCategory {
  /** log4j2 logger name */
  category: string;
  /** What the category can write, named for the finding; never a value */
  exposes: string;
}

/**
 * Categories whose DEBUG or TRACE output includes authentication material.
 * Extend this table rather than a rule.
 */
export const SENSITIVE_LOG_CATEGORIES: readonly SensitiveLogCategory[] = [
  { category: 'org.cometd', exposes: 'Bayeux handshake and session identifiers' },
  {
    category: 'org.eclipse.jetty.client',
    exposes: 'HTTP request headers, including Authorization',
  },
  {
    category: 'com.mulesoft.connectors.salesforce',
    exposes: 'Salesforce session identifiers and OAuth tokens',
  },
  {
    category: 'org.mule.extension.salesforce',
    exposes: 'Salesforce session identifiers and OAuth tokens',
  },
  {
    category: 'org.mule.service.http.impl.service.HttpMessageLogger',
    exposes: 'HTTP wire content, including Authorization headers',
  },
  { category: 'httpclient.wire', exposes: 'HTTP wire content, including Authorization headers' },
  {
    category: 'org.apache.http.wire',
    exposes: 'HTTP wire content, including Authorization headers',
  },
  { category: 'org.apache.http.headers', exposes: 'HTTP headers, including Authorization' },
  {
    category: 'org.apache.hc.client5.http.wire',
    exposes: 'HTTP wire content, including Authorization headers',
  },
  {
    category: 'org.apache.hc.client5.http.headers',
    exposes: 'HTTP headers, including Authorization',
  },
];

const VERBOSE_LEVELS = new Set(['debug', 'trace', 'all']);

interface ConfiguredLogger {
  element: Element;
  /** Empty for the root logger */
  name: string;
  level: string;
}

/** A configured logger that enables one or more sensitive categories. */
export interface SensitiveLoggerFinding {
  element: Element;
  /** Logger name, or `Root` for the root logger */
  name: string;
  level: string;
  line: number;
  categories: SensitiveLogCategory[];
}

function isAncestorOrSelf(loggerName: string, category: string): boolean {
  return loggerName === '' || category === loggerName || category.startsWith(`${loggerName}.`);
}

function configuredLoggers(document: Document): ConfiguredLogger[] {
  const loggers: ConfiguredLogger[] = [];
  for (const element of Array.from(document.getElementsByTagName('*'))) {
    const localName = element.localName.toLowerCase();
    const isRoot = localName === 'root' || localName === 'asyncroot';
    if (!isRoot && localName !== 'logger' && localName !== 'asynclogger') continue;
    loggers.push({
      element,
      name: isRoot ? '' : (element.getAttribute('name') ?? '').trim(),
      level: (element.getAttribute('level') ?? '').trim().toLowerCase(),
    });
  }
  return loggers;
}

/**
 * Loggers whose level makes a sensitive category verbose.
 *
 * log4j2 takes a category's level from the most specific configured logger
 * that is the category or one of its ancestors, falling back to the root. So
 * `org.apache.http` at DEBUG enables `org.apache.http.wire`, unless
 * `org.apache.http.wire` itself is configured at INFO. A verbose logger below a
 * sensitive category, such as `org.cometd.client`, is reported too. Loggers
 * without a level inherit and are skipped when resolving.
 *
 * @param categories - Defaults to {@link SENSITIVE_LOG_CATEGORIES}
 */
export function findSensitiveLoggers(
  document: Document,
  categories: readonly SensitiveLogCategory[] = SENSITIVE_LOG_CATEGORIES,
): SensitiveLoggerFinding[] {
  const loggers = configuredLoggers(document).filter((logger) => logger.level !== '');
  const findings = new Map<Element, SensitiveLoggerFinding>();

  const record = (logger: ConfiguredLogger, category: SensitiveLogCategory): void => {
    const existing = findings.get(logger.element);
    if (existing) {
      if (!existing.categories.includes(category)) existing.categories.push(category);
      return;
    }
    findings.set(logger.element, {
      element: logger.element,
      name: logger.name || 'Root',
      level: logger.level.toUpperCase(),
      line: getLineNumber(logger.element),
      categories: [category],
    });
  };

  for (const category of categories) {
    let effective: ConfiguredLogger | undefined;
    for (const logger of loggers) {
      if (!isAncestorOrSelf(logger.name, category.category)) continue;
      if (!effective || logger.name.length > effective.name.length) effective = logger;
    }
    if (effective && VERBOSE_LEVELS.has(effective.level)) record(effective, category);

    // A verbose sub-category, such as org.cometd.client, writes the same data
    for (const logger of loggers) {
      if (logger.name.startsWith(`${category.category}.`) && VERBOSE_LEVELS.has(logger.level)) {
        record(logger, category);
      }
    }
  }

  return [...findings.values()].sort((a, b) => a.line - b.line);
}
