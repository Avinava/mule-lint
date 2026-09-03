import { ValidationContext, Issue, ListenerEndpoint } from '../../types';
import { ProjectRule } from '../base/ProjectRule';

/**
 * API-010: Versioned API Path
 *
 * An API path should carry a version segment so a breaking change can be
 * released alongside the existing contract rather than replacing it.
 *
 * The effective path is the listener configuration's basePath joined with the
 * listener's own path; either part may supply the version. A listener whose
 * config-ref cannot be resolved produces no finding, because the effective path
 * is unknown rather than unversioned.
 */
export class VersionedApiPathRule extends ProjectRule {
  id = 'API-010';
  name = 'Versioned API Path';
  description = 'HTTP listener paths should include an API version segment';
  severity = 'warning' as const;
  category = 'api-led' as const;

  /** `/v1`, `/v2` … */
  private static readonly NUMERIC_VERSION = /(^|\/)v\d+(\/|$)/i;
  /** `/${api.version}`, `/v${api.majorVersion}` … */
  private static readonly PLACEHOLDER_VERSION = /(^|\/)v?\$\{[^}]*version[^}]*\}/i;
  /** `/1.2` */
  private static readonly SEMANTIC_VERSION = /(^|\/)\d+\.\d+(\/|$)/;

  protected validateProject(context: ValidationContext): Issue[] {
    const projectContext = context.projectContext;
    const endpoints = projectContext?.listenerEndpoints ?? [];
    if (endpoints.length === 0) {
      return [];
    }

    const allowSemanticVersion = this.getOption<boolean>(context, 'allowSemanticVersion', false);
    const basePaths = new Map<string, string | undefined>(
      (projectContext?.listenerConfigs ?? []).map((config) => [config.name, config.basePath]),
    );

    const issues: Issue[] = [];
    const reported = new Set<string>();

    for (const endpoint of endpoints) {
      const configRef = endpoint.configRef;

      // An unresolved reference means the effective path is unknown, not unversioned.
      if (configRef && !basePaths.has(configRef)) {
        continue;
      }

      const effectivePath = this.joinPath(
        configRef ? basePaths.get(configRef) : undefined,
        endpoint.path,
      );

      if (this.hasVersion(effectivePath, allowSemanticVersion)) {
        continue;
      }

      const key = `${endpoint.relativePath}:${endpoint.line}`;
      if (reported.has(key)) {
        continue;
      }
      reported.add(key);

      issues.push(
        this.createLocatedIssue(
          endpoint.relativePath,
          endpoint.line,
          `HTTP listener path "${effectivePath || '/'}" has no version segment${this.describeFlow(endpoint)}`,
          {
            projectRoot: context.projectRoot,
            suggestion:
              'Include a version in the listener basePath or path, for example basePath="/api/v1"',
          },
        ),
      );
    }

    return issues;
  }

  /** Join a basePath and a path into one effective path. */
  private joinPath(basePath: string | undefined, listenerPath: string | undefined): string {
    const parts = [basePath ?? '', listenerPath ?? '']
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && part !== '/');
    if (parts.length === 0) {
      return '';
    }
    return `/${parts.map((part) => part.replace(/^\/+|\/+$/g, '')).join('/')}`;
  }

  /** True when the path carries a recognised version segment. */
  private hasVersion(effectivePath: string, allowSemanticVersion: boolean): boolean {
    if (VersionedApiPathRule.NUMERIC_VERSION.test(effectivePath)) {
      return true;
    }
    if (VersionedApiPathRule.PLACEHOLDER_VERSION.test(effectivePath)) {
      return true;
    }
    return allowSemanticVersion && VersionedApiPathRule.SEMANTIC_VERSION.test(effectivePath);
  }

  private describeFlow(endpoint: ListenerEndpoint): string {
    return endpoint.flowName ? ` in flow "${endpoint.flowName}"` : '';
  }
}
