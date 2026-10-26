import * as path from 'path';
import { ValidationContext, Issue } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { listConfigFiles, readDefinedKeys } from '../../core/SecretModel';
import { isPlaceholderValue } from '../../core/SensitiveKeys';

/**
 * EXP-004: Non-Production Endpoint Shared With Production
 *
 * A non-production configuration file names an endpoint host that the
 * production configuration file also names, so a development or test
 * deployment would reach a live system.
 *
 * Environments are recognized from file-name tokens (for example `dev.yaml`,
 * `config-qa.properties`, `prod.yaml`). Hosts are read from URL values and from
 * keys ending in `host` or `hostname`.
 */
export class NonProductionEndpointRule extends ProjectRule {
  id = 'EXP-004';
  name = 'Non-Production Endpoint Shared With Production';
  description = 'Non-production configuration should not point at production endpoint hosts';
  severity = 'info' as const;
  category = 'experimental' as const;

  private static readonly PRODUCTION = ['prod', 'prd', 'production'];
  private static readonly NON_PRODUCTION = [
    'dev',
    'development',
    'local',
    'qa',
    'test',
    'sit',
    'uat',
    'stage',
    'staging',
    'sandbox',
    'perf',
  ];
  private static readonly LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

  protected validateProject(context: ValidationContext): Issue[] {
    const files = listConfigFiles(context.projectRoot, context.projectContext);
    const productionHosts = new Set<string>();
    const nonProductionFiles: string[] = [];

    for (const file of files) {
      const environment = this.environmentOf(file);
      if (environment === 'production') {
        for (const { host } of this.hostsIn(context.projectRoot, file)) productionHosts.add(host);
      } else if (environment === 'non-production') {
        nonProductionFiles.push(file);
      }
    }
    if (productionHosts.size === 0) {
      return [];
    }

    const issues: Issue[] = [];
    for (const file of nonProductionFiles) {
      for (const { host, key, line } of this.hostsIn(context.projectRoot, file)) {
        if (!productionHosts.has(host)) continue;
        issues.push(
          this.createLocatedIssue(
            file,
            line,
            `"${key}" points at ${host}, which the production configuration also uses`,
            {
              projectRoot: context.projectRoot,
              suggestion:
                'Point non-production configuration at a non-production endpoint, or confirm the shared host is intended.',
            },
          ),
        );
      }
    }
    return issues;
  }

  private environmentOf(file: string): 'production' | 'non-production' | undefined {
    const tokens = path
      .basename(file)
      .toLowerCase()
      .split(/[^a-z0-9]+/);
    if (tokens.some((token) => NonProductionEndpointRule.PRODUCTION.includes(token))) {
      return 'production';
    }
    if (tokens.some((token) => NonProductionEndpointRule.NON_PRODUCTION.includes(token))) {
      return 'non-production';
    }
    return undefined;
  }

  private hostsIn(
    projectRoot: string,
    file: string,
  ): { host: string; key: string; line: number }[] {
    const hosts: { host: string; key: string; line: number }[] = [];
    for (const entry of readDefinedKeys(projectRoot, file)) {
      const value = entry.value.trim();
      if (!value || isPlaceholderValue(value)) continue;

      let host = /^[a-z][a-z0-9+.-]*:\/\/([^/:?#\s]+)/i.exec(value)?.[1];
      if (!host && /host(?:name)?$/i.test(entry.key)) {
        host = /^[^/:\s]+$/.test(value) ? value : undefined;
      }
      if (!host) continue;

      host = host.toLowerCase();
      if (NonProductionEndpointRule.LOCAL_HOSTS.has(host)) continue;
      hosts.push({ host, key: entry.key, line: entry.line });
    }
    return hosts;
  }
}
