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

    // Check private flows (not triggered by HTTP/scheduler)
    for (const flow of flows) {
      const name = this.getNameAttribute(flow);
      if (!name) {
        continue;
      }

      // Skip if it has an external trigger
      const hasHttpListener = this.exists('.//*[local-name()="listener"]', flow);
      const hasScheduler = this.exists('.//*[local-name()="scheduler"]', flow);
      const hasVmListener = this.exists(
        './/*[local-name()="listener" and contains(@config-ref, "vm")]',
        flow,
      );

      if (hasHttpListener || hasScheduler || hasVmListener) {
        continue; // Entry point flow
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
