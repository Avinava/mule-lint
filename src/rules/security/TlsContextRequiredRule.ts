import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SEC-013: TLS Context Required
 *
 * A connection that declares literal HTTPS needs a TLS context, either inline
 * or referenced by name. Declaring HTTPS without one leaves the trust and key
 * material undefined.
 *
 * Literal HTTP is SEC-012's concern. An unrelated global TLS context elsewhere
 * in the project does not satisfy this rule — the connection must reference it.
 * MULE-202 and SEC-002 continue to check insecure trust stores and obsolete TLS
 * versions.
 */
export class TlsContextRequiredRule extends BaseRule {
  id = 'SEC-013';
  name = 'TLS Context Required';
  description = 'Connections using HTTPS should declare or reference a TLS context';
  severity = 'warning' as const;
  category = 'security' as const;
  override issueType: IssueType = 'vulnerability';

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const reportUnknown = this.getOption<boolean>(context, 'reportUnknownProtocol', false);

    const connections = this.select(
      '//*[local-name()="listener-connection" or local-name()="request-connection"]',
      doc,
    );

    for (const connection of connections) {
      const protocol = this.getAttribute(connection, 'protocol');
      if (!protocol) {
        continue;
      }

      if (protocol.includes('${') || protocol.includes('#[')) {
        if (reportUnknown) {
          issues.push(
            this.createIssue(
              connection,
              `Connection protocol "${protocol}" cannot be resolved at lint time — verify a TLS context is configured when it resolves to HTTPS`,
              { severity: 'info' },
            ),
          );
        }
        continue;
      }

      if (protocol.toUpperCase() !== 'HTTPS') {
        continue;
      }

      if (this.hasTlsContext(connection)) {
        continue;
      }

      const configName = this.getEnclosingConfigName(connection);
      issues.push(
        this.createIssue(connection, `${configName} declares HTTPS but has no TLS context`, {
          suggestion:
            'Add an inline <tls:context> with a key-store and trust-store, or set tlsContext-ref to a named TLS configuration',
        }),
      );
    }

    return issues;
  }

  /** True when the connection declares an inline context or references one. */
  private hasTlsContext(connection: Node): boolean {
    if (this.exists('.//*[local-name()="context"]', connection)) {
      return true;
    }

    const element = connection as Element;
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.includes('tlscontext') || name.includes('tls-context')) {
        if (attribute.value.trim().length > 0) {
          return true;
        }
      }
    }

    return false;
  }

  /** Name of the enclosing global config, for a readable message. */
  private getEnclosingConfigName(connection: Node): string {
    const parent = connection.parentNode as Element | null;
    const name = parent?.getAttribute('name');
    return name ? `"${name}"` : 'Connection';
  }
}
