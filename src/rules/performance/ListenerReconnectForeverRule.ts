import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * RES-002: Listener Reconnect-Forever
 *
 * HTTP listener-config elements should use reconnect-forever rather than
 * bounded reconnect strategies. Unlike outbound connectors where bounded
 * retries make sense, the listener is the application's entry point — if
 * it can't bind to the port, the app should keep trying indefinitely.
 *
 * Real-world accelerator pattern:
 *   <http:listener-config>
 *     <http:listener-connection host="0.0.0.0" port="${http.port}">
 *       <reconnection>
 *         <reconnect-forever frequency="5000" />
 *       </reconnection>
 *     </http:listener-connection>
 *   </http:listener-config>
 */
export class ListenerReconnectForeverRule extends BaseRule {
  id = 'RES-002';
  name = 'Listener Reconnect-Forever';
  description = 'HTTP listener-config should use reconnect-forever for resilience';
  severity = 'warning' as const;
  category = 'performance' as const;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    const listenerConfigs = this.select('//*[local-name()="listener-config"]', doc);

    for (const config of listenerConfigs) {
      const name = this.getNameAttribute(config) ?? 'HTTP Listener';

      // Check if reconnect-forever exists anywhere inside the config
      const hasReconnectForever = this.exists('.//*[local-name()="reconnect-forever"]', config);

      if (hasReconnectForever) {
        continue; // Good — has reconnect-forever
      }

      // Check if there's a bounded reconnect (which is suboptimal for listeners)
      const hasBoundedReconnect =
        this.exists('.//*[local-name()="reconnect"]', config) ||
        this.exists('.//*[local-name()="reconnection"]', config);

      if (hasBoundedReconnect) {
        issues.push(
          this.createIssue(
            config,
            `Listener config "${name}" uses bounded reconnect instead of reconnect-forever`,
            {
              suggestion:
                'Replace <reconnect count="..." .../> with <reconnect-forever frequency="5000" /> for HTTP listeners — the app should keep trying to bind',
            },
          ),
        );
      } else {
        issues.push(
          this.createIssue(config, `Listener config "${name}" has no reconnection strategy`, {
            suggestion:
              'Add <reconnection><reconnect-forever frequency="5000" /></reconnection> inside the listener-connection element',
          }),
        );
      }
    }

    return issues;
  }
}
