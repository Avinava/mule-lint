import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * RES-001: Reconnection Strategy
 *
 * Connectors should have reconnection strategies configured for resilience.
 *
 * Enhanced to differentiate listener vs request configs:
 * - Listeners (inbound): recommend `reconnect-forever` (service must stay alive)
 * - Requests (outbound): recommend bounded `reconnect count="3"` (fail fast for callers)
 *
 * Per the Mule HTTP connector XSD, `<reconnection>` is a child element of
 * `<http:request-connection>`, NOT a direct child of `<http:request-config>`.
 * The rule uses a descendant search (`.//*`) to correctly resolve reconnection
 * elements at any depth.
 */
export class ReconnectionStrategyRule extends BaseRule {
  id = 'RES-001';
  name = 'Reconnection Strategy';
  description = 'Connectors should have reconnection strategies configured';
  severity = 'warning' as const;
  category = 'performance' as const;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Listener configs (inbound) — recommend reconnect-forever
    const listenerConfigs = [{ pattern: 'listener-config', name: 'HTTP Listener' }];

    for (const connector of listenerConfigs) {
      const configs = this.select(`//*[local-name()="${connector.pattern}"]`, doc);

      for (const config of configs) {
        const hasReconnection = this.hasAnyReconnection(config);

        if (!hasReconnection) {
          const name = this.getNameAttribute(config) ?? connector.name;
          issues.push(
            this.createIssue(
              config,
              `${connector.name} config "${name}" has no reconnection strategy`,
              {
                suggestion:
                  'Add <reconnection><reconnect-forever frequency="5000"/></reconnection> for listener configs — the service should always attempt to reconnect',
              },
            ),
          );
        }
      }
    }

    // Request/outbound configs — recommend bounded reconnect
    const requestConfigs = [
      { pattern: 'request-config', name: 'HTTP Request' },
      { pattern: 'jms-config', name: 'JMS' },
      { pattern: 'amqp-config', name: 'AMQP' },
      { pattern: 'sftp-config', name: 'SFTP' },
      { pattern: 'ftp-config', name: 'FTP' },
      { pattern: 'vm-config', name: 'VM' },
    ];

    for (const connector of requestConfigs) {
      const configs = this.select(`//*[local-name()="${connector.pattern}"]`, doc);

      for (const config of configs) {
        const hasReconnection = this.hasAnyReconnection(config);

        if (!hasReconnection) {
          const name = this.getNameAttribute(config) ?? connector.name;
          issues.push(
            this.createIssue(
              config,
              `${connector.name} config "${name}" has no reconnection strategy`,
              {
                suggestion:
                  'Add <reconnection><reconnect count="3" frequency="2000"/></reconnection> inside the connection element for outbound connectors',
              },
            ),
          );
        }
      }
    }

    // Database configs — check for db namespace
    const dbConfigs = this.select('//*[local-name()="config" and starts-with(name(), "db:")]', doc);
    for (const config of dbConfigs) {
      const hasReconnection = this.hasAnyReconnection(config);

      if (!hasReconnection) {
        const name = this.getNameAttribute(config) ?? 'Database';
        issues.push(
          this.createIssue(config, `Database config "${name}" has no reconnection strategy`, {
            suggestion:
              'Add <reconnection><reconnect count="3" frequency="2000"/></reconnection> inside the connection element',
          }),
        );
      }
    }

    // Salesforce configs — check for sfdc-config
    const sfdcConfigs = this.select(
      '//*[local-name()="sfdc-config" or local-name()="config" and starts-with(name(), "salesforce:")]',
      doc,
    );
    for (const config of sfdcConfigs) {
      const hasReconnection = this.hasAnyReconnection(config);

      if (!hasReconnection) {
        const name = this.getNameAttribute(config) ?? 'Salesforce';
        issues.push(
          this.createIssue(config, `Salesforce config "${name}" has no reconnection strategy`, {
            suggestion:
              'Add <reconnection><reconnect count="3" frequency="2000"/></reconnection> inside the Salesforce connection element',
          }),
        );
      }
    }

    return issues;
  }

  private hasAnyReconnection(config: Node): boolean {
    return (
      this.exists('.//*[local-name()="reconnection"]', config) ||
      this.exists('.//*[local-name()="reconnect"]', config) ||
      this.exists('.//*[local-name()="reconnect-forever"]', config)
    );
  }
}
