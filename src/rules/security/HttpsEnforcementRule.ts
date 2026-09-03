import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SEC-012: HTTPS Enforcement
 *
 * Outbound HTTP request connections should use TLS. This rule reports literal
 * plaintext transport — `protocol="HTTP"` or an absolute `http://` URL — on
 * request configurations and requests.
 *
 * A dynamic value such as `${http.protocol}` is unknown at lint time and is not
 * reported unless `reportUnknownProtocol` is enabled. Loopback hosts pass by
 * default; private and organization-internal hosts are not assumed safe and
 * must be listed in `allowedHttpHosts` to be exempt.
 *
 * MULE-004 separately checks URL externalization, so one node may legitimately
 * violate both rules.
 */
export class HttpsEnforcementRule extends BaseRule {
  id = 'SEC-012';
  name = 'HTTPS Enforcement';
  description = 'Outbound HTTP connections should use HTTPS rather than plaintext HTTP';
  severity = 'error' as const;
  category = 'security' as const;
  override issueType: IssueType = 'vulnerability';

  /** Hosts that are local to the runtime and carry no network exposure. */
  private static readonly DEFAULT_ALLOWED_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const allowedHosts = this.getOption(
      context,
      'allowedHttpHosts',
      HttpsEnforcementRule.DEFAULT_ALLOWED_HOSTS,
    );
    const reportUnknown = this.getOption<boolean>(context, 'reportUnknownProtocol', false);

    // Split protocol/host form: <http:request-connection protocol="HTTP" host="..."/>
    const connections = this.select('//*[local-name()="request-connection"]', doc);
    for (const connection of connections) {
      const protocol = this.getAttribute(connection, 'protocol');
      const host = this.getAttribute(connection, 'host') ?? '';

      if (!protocol) {
        continue;
      }

      if (this.isDynamic(protocol)) {
        if (reportUnknown) {
          issues.push(
            this.createIssue(
              connection,
              `HTTP request connection protocol "${protocol}" cannot be resolved at lint time`,
              {
                severity: 'info',
                suggestion: 'Verify the resolved value is HTTPS in every deployed environment',
              },
            ),
          );
        }
        continue;
      }

      if (protocol.toUpperCase() !== 'HTTP') {
        continue;
      }

      if (this.isAllowedHost(host, allowedHosts)) {
        continue;
      }

      issues.push(
        this.createIssue(
          connection,
          `HTTP request connection uses literal protocol HTTP${host ? ` for ${host}` : ''}`,
          {
            suggestion:
              'Use protocol="HTTPS" and configure a TLS context, or exempt the host with allowedHttpHosts',
          },
        ),
      );
    }

    // Absolute URL form: <http:request url="http://..."/>
    const requests = this.select('//*[local-name()="request"]', doc);
    for (const request of requests) {
      const url = this.getAttribute(request, 'url');
      if (!url || !/^http:\/\//i.test(url)) {
        continue;
      }

      const host = url.replace(/^http:\/\//i, '').split(/[/:?]/)[0] ?? '';
      if (this.isAllowedHost(host, allowedHosts)) {
        continue;
      }

      issues.push(
        this.createIssue(request, `HTTP request targets a plaintext http:// URL for ${host}`, {
          suggestion: 'Use an https:// URL, or exempt the host with allowedHttpHosts',
        }),
      );
    }

    return issues;
  }

  /** True when the value is resolved at runtime rather than at lint time. */
  private isDynamic(value: string): boolean {
    return value.includes('${') || value.includes('#[');
  }

  /** True when the host is a placeholder or matches an allowed pattern. */
  private isAllowedHost(host: string, allowedHosts: string[]): boolean {
    if (host.length === 0 || this.isDynamic(host)) {
      return true;
    }
    return this.isExcluded(host, allowedHosts);
  }
}
