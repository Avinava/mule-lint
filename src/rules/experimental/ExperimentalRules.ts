import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';
import { ProjectRule } from '../base/ProjectRule';
import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { parseXml } from '../../core/XmlParser';

/**
 * EXP-001: Flow Reference Depth
 *
 * Limit the depth of flow-ref chains.
 */
export class FlowRefDepthRule extends BaseRule {
  id = 'EXP-001';
  name = 'Flow Reference Depth';
  description = 'Limit flow-ref chain depth to avoid complexity';
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

    // Find all config elements
    const configs = this.select(
      '//*[contains(local-name(), "-config") or contains(local-name(), "_config")]',
      doc,
    );

    for (const config of configs) {
      const name = this.getNameAttribute(config);

      if (name && !this.isValidConfigName(name)) {
        issues.push(
          this.createIssue(config, `Config "${name}" should follow Convention_Type pattern`, {
            suggestion: 'Use pattern: HTTP_Request_Config, Database_Config',
          }),
        );
      }
    }

    return issues;
  }

  private isValidConfigName(name: string): boolean {
    // Valid patterns: HTTP_Request_Config, Salesforce_Config, etc.
    return /^[A-Z][a-zA-Z0-9]*(_[A-Z][a-zA-Z0-9]*)*$/.test(name);
  }
}

/**
 * EXP-003: MUnit Executable Test Presence
 *
 * Check that projects with flows contain at least one executable MUnit test.
 */
export class MUnitCoverageRule extends ProjectRule {
  id = 'EXP-003';
  name = 'MUnit Executable Test Presence';
  description = 'Projects with flows should contain at least one executable MUnit test';
  severity = 'info' as const;
  category = 'experimental' as const;

  protected validateProject(context: ValidationContext): Issue[] {
    const flowCount = context.allFlowNames?.size ?? 0;
    if (flowCount === 0) {
      return [];
    }

    const munitDir = path.join(context.projectRoot, 'src', 'test', 'munit');
    const usableMunitDir = fs.existsSync(munitDir) && !fs.lstatSync(munitDir).isSymbolicLink();
    const suites = usableMunitDir
      ? fg.sync('**/*.xml', {
          cwd: munitDir,
          absolute: true,
          onlyFiles: true,
          followSymbolicLinks: false,
        })
      : [];

    let executableTests = 0;
    for (const suite of suites) {
      let content: string;
      try {
        content = fs.readFileSync(suite, 'utf8');
      } catch {
        continue;
      }
      const parsed = parseXml(content, path.relative(context.projectRoot, suite));
      if (!parsed.success || !parsed.document) {
        continue;
      }
      const tests = parsed.document.getElementsByTagNameNS(
        'http://www.mulesoft.org/schema/mule/munit',
        'test',
      );
      for (let index = 0; index < tests.length; index += 1) {
        const test = tests.item(index);
        if (test && (test.getAttribute('ignore') ?? '').trim().toLowerCase() !== 'true') {
          executableTests += 1;
        }
      }
    }

    return executableTests > 0
      ? []
      : [
          this.createProjectIssue(`Project has ${flowCount} flows but no executable MUnit tests`, {
            suggestion:
              'Add at least one non-ignored munit:test under src/test/munit for project behavior',
          }),
        ];
  }
}
