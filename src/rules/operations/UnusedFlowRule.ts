import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * HYG-003: Unused Flow Detection
 *
 * Detects flows that are never referenced by flow-ref.
 *
 * Cross-file detection: when the LintEngine provides context.allFlowRefs
 * (populated during the pre-scan phase), the rule checks across all project
 * files.  When scanning a standalone file (allFlowRefs is undefined), only
 * intra-file references are checked.
 *
 * The rule recognises several categories of "externally referenced" flows:
 *   - APIKit-generated flows: verb:\path:config  (routed by apikit:router)
 *   - Flows with external triggers: http:listener, scheduler, vm:listener,
 *     salesforce:* listeners (replay-channel-listener, subscribe-channel-listener,
 *     replay-topic-listener, subscribe-topic-listener, modified-object-listener,
 *     new-object-listener)
 *   - Common naming conventions: *-main, *-api, api-*, *-console, *-error-handler, global*
 */
export class UnusedFlowRule extends BaseRule {
  id = 'HYG-003';
  name = 'Unused Flow Detection';
  description = 'Detects flows that are never referenced';
  severity = 'warning' as const;
  category = 'standards' as const;

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Get all flow names in this document
    const flows = this.select('//*[local-name()="flow"]', doc);
    const subflows = this.select('//*[local-name()="sub-flow"]', doc);

    // Build the set of referenced flow names.
    // When context.allFlowRefs is available (project-wide pre-scan), use it.
    // Fall back to intra-file refs only for standalone scans.
    let referencedFlows: Set<string>;
    if (context.allFlowRefs) {
      referencedFlows = context.allFlowRefs;
    } else {
      // Intra-file only (standalone scan)
      const flowRefs = this.select('//*[local-name()="flow-ref"]', doc);
      referencedFlows = new Set<string>();
      for (const ref of flowRefs) {
        const name = this.getNameAttribute(ref);
        if (name) {
          referencedFlows.add(name);
        }
      }
    }

    // Check sub-flows (they should always be referenced)
    for (const subflow of subflows) {
      const name = this.getNameAttribute(subflow);
      if (name && !referencedFlows.has(name)) {
        // Exclude common patterns that are referenced externally
        if (!this.isExternallyReferenced(name)) {
          issues.push(
            this.createIssue(subflow, `Sub-flow "${name}" is never referenced`, {
              severity: 'info',
              suggestion: 'Consider removing unused sub-flows or verify cross-file references',
            }),
          );
        }
      }
    }

    // Check private flows (not triggered by HTTP/scheduler/connector listeners)
    for (const flow of flows) {
      const name = this.getNameAttribute(flow);
      if (!name) {
        continue;
      }

      // Skip APIKit-generated flows (verb:\path:config pattern)
      if (this.isApikitFlow(name)) {
        continue;
      }

      // Skip if it has an external trigger (listener / scheduler)
      if (this.hasExternalTrigger(flow)) {
        continue;
      }

      // Check if referenced
      if (!referencedFlows.has(name) && !this.isExternallyReferenced(name)) {
        issues.push(
          this.createIssue(flow, `Flow "${name}" has no trigger and is never referenced`, {
            severity: 'info',
            suggestion: 'Verify this flow is referenced from other files or remove if unused',
          }),
        );
      }
    }

    return issues;
  }

  /**
   * Check if a flow name matches the APIKit auto-generated naming convention.
   * Pattern: verb:\path:config-name  (e.g. "get:\orders:api-config")
   * Also matches with (type) suffix: "get:\orders:api-config(application\json)"
   */
  private isApikitFlow(name: string): boolean {
    // APIKit flow names contain backslash-separated segments starting with an HTTP verb
    return /^(get|post|put|patch|delete|head|options|trace):\\.+:.+$/i.test(name);
  }

  /**
   * Check if a flow has an external trigger (a source component as the first
   * processor). This covers HTTP listeners, schedulers, VM listeners,
   * Salesforce connectors, and any other connector listener.
   */
  private hasExternalTrigger(flow: Node): boolean {
    // http:listener or any namespace listener
    const hasHttpListener = this.exists('.//*[local-name()="listener"]', flow);
    if (hasHttpListener) {
      return true;
    }

    // scheduler
    const hasScheduler = this.exists('.//*[local-name()="scheduler"]', flow);
    if (hasScheduler) {
      return true;
    }

    // Salesforce-specific listeners (platform events, CDC, polling)
    const sfListenerPatterns = [
      'replay-channel-listener',
      'subscribe-channel-listener',
      'replay-topic-listener',
      'subscribe-topic-listener',
      'modified-object-listener',
      'new-object-listener',
    ];
    for (const pattern of sfListenerPatterns) {
      if (this.exists(`.//*[local-name()="${pattern}"]`, flow)) {
        return true;
      }
    }

    // JMS, AMQP, Anypoint MQ, File, FTP, SFTP, Email, DB polling listeners
    const otherListenerPatterns = [
      'subscriber', // jms:subscriber, amqp:subscriber
      'consume', // anypoint-mq:subscriber is actually "subscriber" but some use "consume"
      'on-new-file', // file:listener
      'on-new-or-updated-file', // sftp/ftp
      'listener-imap', // email
      'listener-pop3', // email
      'on-new-message', // anypoint-mq
      'on-table-row', // db polling
    ];
    for (const pattern of otherListenerPatterns) {
      if (this.exists(`.//*[local-name()="${pattern}"]`, flow)) {
        return true;
      }
    }

    return false;
  }

  private isExternallyReferenced(name: string): boolean {
    // Common patterns that are typically referenced externally
    const externalPatterns = [
      /-main$/,
      /-api$/,
      /^api-/,
      /-console$/,
      /-error-handler$/,
      /global/i,
    ];
    return externalPatterns.some((pattern) => pattern.test(name));
  }
}
