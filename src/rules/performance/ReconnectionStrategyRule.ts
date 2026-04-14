import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * RES-001: Reconnection Strategy
 *
 * Connectors should have reconnection strategies configured for resilience.
 *
 * Per the Mule HTTP connector XSD, `<reconnection>` is a child element of
 * `<http:request-connection>`, NOT a direct child of `<http:request-config>`.
 * Placing `<reconnection>` directly under `<http:request-config>` causes a
 * SAXParseException at build time. The rule uses a descendant search (`.//*`)
 * to correctly resolve reconnection elements at any depth, including the valid
 * `http:request-config > http:request-connection > reconnection` nesting.
 */
export class ReconnectionStrategyRule extends BaseRule {
  id = 'RES-001';
  name = 'Reconnection Strategy';
  description = 'Connectors should have reconnection strategies configured';
  severity = 'warning' as const;
  category = 'performance' as const;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Specific connector configurations that benefit from reconnection strategies
    // Using more specific patterns to avoid false positives on generic "config" elements
    const connectorConfigs = [
      { pattern: 'request-config', name: 'HTTP Request' },
      { pattern: 'listener-config', name: 'HTTP Listener' },
      { pattern: 'jms-config', name: 'JMS' },
      { pattern: 'amqp-config', name: 'AMQP' },
      { pattern: 'sftp-config', name: 'SFTP' },
      { pattern: 'ftp-config', name: 'FTP' },
      { pattern: 'vm-config', name: 'VM' },
    ];

    for (const connector of connectorConfigs) {
      const configs = this.select(`//*[local-name()="${connector.pattern}"]`, doc);

      for (const config of configs) {
        // Use descendant search (.//*) so that reconnection elements nested anywhere
        // inside the config element are detected. This handles the XSD-correct pattern:
        //   <http:request-config>
        //     <http:request-connection>
        //       <reconnection>...</reconnection>   ← correct per HTTP connector XSD
        //     </http:request-connection>
        //   </http:request-config>
        const hasReconnection =
          this.exists('.//*[local-name()="reconnection"]', config) ||
          this.exists('.//*[local-name()="reconnect"]', config) ||
          this.exists('.//*[local-name()="reconnect-forever"]', config);

        if (!hasReconnection) {
          const name = this.getNameAttribute(config) ?? connector.name;
          issues.push(
            this.createIssue(
              config,
              `${connector.name} config "${name}" has no reconnection strategy`,
              {
                suggestion:
                  'Add <reconnection><reconnect count="3" frequency="2000"/></reconnection> inside <http:request-connection> for HTTP connectors',
              },
            ),
          );
        }
      }
    }

    // Database configs specifically - check for db namespace
    const dbConfigs = this.select('//*[local-name()="config" and starts-with(name(), "db:")]', doc);
    for (const config of dbConfigs) {
      const hasReconnection =
        this.exists('.//*[local-name()="reconnection"]', config) ||
        this.exists('.//*[local-name()="reconnect"]', config);

      if (!hasReconnection) {
        const name = this.getNameAttribute(config) ?? 'Database';
        issues.push(
          this.createIssue(config, `Database config "${name}" has no reconnection strategy`, {
            suggestion: 'Add <reconnection> inside the connection element',
          }),
        );
      }
    }

    return issues;
  }
}
