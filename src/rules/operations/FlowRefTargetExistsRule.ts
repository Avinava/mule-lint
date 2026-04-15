import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * HYG-004: Flow-Ref Target Exists
 *
 * Every <flow-ref name="X"/> must have a corresponding <flow name="X"/> or
 * <sub-flow name="X"/> somewhere in the project.  When the engine provides
 * `context.allFlowRefs` we rely on the pre-scanned flow name map; otherwise
 * we fall back to intra-file validation only.
 *
 * This rule catches broken wiring at lint time, preventing runtime
 * MULE:ROUTING errors in production.
 */
export class FlowRefTargetExistsRule extends BaseRule {
  id = 'HYG-004';
  name = 'Flow-Ref Target Exists';
  description = 'Every flow-ref must reference an existing flow or sub-flow';
  severity = 'error' as const;
  category = 'operations' as const;
  issueType: IssueType = 'bug';

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Collect all flow/sub-flow names defined in this file
    const localFlowNames = new Set<string>();
    const flows = this.select('//*[local-name()="flow" or local-name()="sub-flow"]', doc);
    for (const flow of flows) {
      const name = this.getNameAttribute(flow);
      if (name) {
        localFlowNames.add(name);
      }
    }

    // Collect all flow names across project if available
    const allFlowNames = context.allFlowNames ?? localFlowNames;

    // Check every flow-ref
    const flowRefs = this.select('//*[local-name()="flow-ref"]', doc);
    for (const ref of flowRefs) {
      const targetName = this.getNameAttribute(ref);
      if (!targetName) {
        continue;
      }

      // Skip dynamic flow-refs (DataWeave expressions)
      if (targetName.includes('#[') || targetName.includes('${')) {
        continue;
      }

      if (!allFlowNames.has(targetName)) {
        const docName = this.getDocName(ref) ?? targetName;
        issues.push(
          this.createIssue(ref, `Flow-ref "${docName}" targets non-existent flow "${targetName}"`, {
            suggestion:
              'Verify the target flow or sub-flow exists. Check for typos or missing XML files in src/main/mule/',
          }),
        );
      }
    }

    return issues;
  }
}
