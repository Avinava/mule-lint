import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * HTTP-004: Connection Idle Timeout
 *
 * HTTP request-connection elements should configure an idle timeout
 * to prevent stale connections from accumulating in the pool.
 * Without idle timeout, connections may linger and consume resources
 * even when not actively in use.
 *
 * Accelerator pattern:
 *   <http:request-connection>
 *     <http:client-socket-properties>
 *       <sockets:tcp-client-socket-properties connectionTimeout="10000"
 *                                              clientTimeout="30000"/>
 *     </http:client-socket-properties>
 *   </http:request-connection>
 */
export class ConnectionIdleTimeoutRule extends BaseRule {
  id = 'HTTP-004';
  name = 'Connection Idle Timeout';
  description =
    'HTTP request configs should configure connection/idle timeouts to prevent resource leaks';
  severity = 'info' as const;
  category = 'http' as const;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Find HTTP request-config elements
    const requestConfigs = this.select('//*[local-name()="request-config"]', doc);

    for (const config of requestConfigs) {
      const configName = this.getNameAttribute(config) ?? 'HTTP Request Config';

      // Check for useSendBuffer, connectionIdleTimeout, or socket properties
      const hasIdleTimeout = this.getAttribute(config, 'connectionIdleTimeout') !== null;

      const hasSocketProps = this.exists(
        './/*[local-name()="tcp-client-socket-properties" or local-name()="client-socket-properties"]',
        config,
      );

      if (!hasIdleTimeout && !hasSocketProps) {
        issues.push(
          this.createIssue(
            config,
            `HTTP request config "${configName}" has no connection idle timeout or socket properties configured`,
            {
              suggestion:
                'Add connectionIdleTimeout="30000" on the config, or configure <http:client-socket-properties> with tcp-client-socket-properties for fine-grained control',
            },
          ),
        );
      }
    }

    return issues;
  }
}
