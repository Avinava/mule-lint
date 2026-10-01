import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';
import { ProjectRule } from '../base/ProjectRule';

/**
 * EXP-001: Flow Reference Fan-out
 *
 * Counts flow-refs inside one flow or sub-flow. It measures fan-out, not the
 * depth of a call chain; `maxDepth` keeps its name for config compatibility.
 */
export class FlowRefDepthRule extends BaseRule {
  id = 'EXP-001';
  name = 'Flow Reference Fan-out';
  description = 'Limit the number of flow-refs in one flow to avoid orchestration sprawl';
  severity = 'info' as const;
  category = 'experimental' as const;

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const maxDepth = this.getOption(context, 'maxDepth', 5);

    const flows = this.select('//mule:flow | //mule:sub-flow', doc);

    for (const flow of flows) {
      const flowRefs = this.select('.//mule:flow-ref', flow);

      if (flowRefs.length > maxDepth) {
        const name = this.getNameAttribute(flow) ?? 'unnamed';
        issues.push(
          this.createIssue(
            flow,
            `Flow "${name}" has ${flowRefs.length} flow-refs (max: ${maxDepth})`,
            { suggestion: 'Consider consolidating or reducing flow-ref usage' },
          ),
        );
      }
    }

    return issues;
  }
}

/**
 * EXP-002: Connector Config Naming
 *
 * Connector configurations should follow naming convention.
 */
export class ConnectorConfigNamingRule extends BaseRule {
  id = 'EXP-002';
  name = 'Connector Config Naming';
  description = 'Connector configurations should follow naming conventions';
  severity = 'info' as const;
  category = 'experimental' as const;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Connector configs: `<x:config>`, `<x:*-config>`, and `<x:*-configuration>`.
    // APIKit and MUnit configs follow their own tooling-generated names.
    const configs = this.select(
      '//*[(local-name()="config" or contains(local-name(), "-config") or contains(local-name(), "_config"))' +
        ' and not(namespace-uri()="http://www.mulesoft.org/schema/mule/mule-apikit")' +
        ' and not(starts-with(namespace-uri(), "http://www.mulesoft.org/schema/mule/munit"))]',
      doc,
    );

    for (const config of configs) {
      const name = this.getNameAttribute(config);

      if (name && !this.isValidConfigName(name)) {
        issues.push(
          this.createIssue(
            config,
            `Config "${name}" should start with a capital letter and use underscores`,
            { suggestion: 'Use a pattern such as HTTP_Request_config, Database_Config' },
          ),
        );
      }
    }

    return issues;
  }

  private isValidConfigName(name: string): boolean {
    // Accepts Studio defaults (HTTP_Listener_config) as well as HTTP_Request_Config.
    return /^[A-Z][A-Za-z0-9]*(_[A-Za-z0-9]+)*$/.test(name);
  }
}

/**
 * EXP-003: MUnit Executable Test Presence (deprecated)
 *
 * Graduated to TEST-001 in 1.31.0. The ID stays registered so existing
 * configuration that names it keeps loading; it no longer reports.
 */
export class MUnitCoverageRule extends ProjectRule {
  id = 'EXP-003';
  name = 'MUnit Executable Test Presence';
  description = 'Deprecated: superseded by TEST-001';
  severity = 'info' as const;
  category = 'experimental' as const;

  protected validateProject(_context: ValidationContext): Issue[] {
    return [];
  }
}
