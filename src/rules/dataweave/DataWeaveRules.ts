import * as fs from 'fs';
import * as path from 'path';
import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';
import { ProjectRule } from '../base/ProjectRule';

/**
 * DW-001: External DWL for Complex Transforms
 *
 * Complex DataWeave transforms should be in external .dwl files.
 */
export class ExternalDwlRule extends BaseRule {
  id = 'DW-001';
  name = 'External DWL for Complex Transforms';
  description = 'Complex DataWeave should be externalized to .dwl files';
  severity = 'warning' as const;
  category = 'dataweave' as const;

  validate(doc: Document, context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const maxInlineLines = this.getOption(context, 'maxInlineLines', 10);

    // Find all transform components
    const transforms = this.select('//*[local-name()="transform"]', doc);

    for (const transform of transforms) {
      const setPayload = this.select('.//*[local-name()="set-payload"]', transform as Document);

      for (const payload of setPayload) {
        const content = payload.textContent ?? '';
        const lines = content.split('\n').filter((l) => l.trim().length > 0);

        if (lines.length > maxInlineLines) {
          const docName = this.getDocName(transform) ?? 'Transform';
          issues.push(
            this.createIssue(
              transform,
              `Transform "${docName}" has ${lines.length} lines - externalize to .dwl file`,
              {
                suggestion: `Move to src/main/resources/dwl/ and use: resource("dwl/transform-name.dwl")`,
              },
            ),
          );
        }
      }
    }

    return issues;
  }
}

/**
 * DW-002: DWL File Naming Convention
 *
 * DataWeave files should follow naming conventions for consistency.
 * Supports configurable conventions: 'kebab-case' (default), 'camelCase', or 'any'.
 *
 * IMPORTANT: DataWeave module files (imported via `import X from dwl::path::X`)
 * MUST use camelCase because the module identifier in the import statement must
 * exactly match the filename, and hyphens are not valid in DataWeave identifiers.
 * Use the `exemptPaths` option to exclude module directories from this rule, or
 * set `convention: "camelCase"` for projects that use DW modules extensively.
 *
 * This is a ProjectRule — it runs once per scan to avoid producing
 * N identical issues (one per XML file).
 */
export class DwlNamingRule extends ProjectRule {
  id = 'DW-002';
  name = 'DWL File Naming';
  description =
    'DataWeave files should follow consistent naming conventions (kebab-case recommended)';
  severity = 'info' as const;
  category = 'dataweave' as const;

  protected validateProject(context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const dwlDir = path.join(context.projectRoot, 'src/main/resources/dwl');

    if (!fs.existsSync(dwlDir)) {
      return issues;
    }

    // Get configurable convention: 'kebab-case' | 'camelCase' | 'any'
    const convention = this.getOption(context, 'convention', 'kebab-case') as string;

    // Skip validation if convention is 'any'
    if (convention === 'any') {
      return issues;
    }

    // Get configurable exempt paths (glob-style patterns relative to projectRoot).
    // Files matching any exempt pattern are skipped entirely regardless of convention.
    // Use this for DataWeave module directories where camelCase is required by the
    // DataWeave runtime import system (e.g., "src/main/resources/dwl/lookups/**").
    const exemptPaths = this.getOption(context, 'exemptPaths', []) as string[];

    const dwlFiles = this.findDwlFiles(dwlDir);

    for (const file of dwlFiles) {
      const basename = path.basename(file, '.dwl');

      // Check if this file matches any exempt path pattern
      const relativeToDwlDir = path.relative(context.projectRoot, file);
      if (exemptPaths.length > 0 && this.isExcluded(relativeToDwlDir, exemptPaths)) {
        continue;
      }

      if (!this.isValidDwlName(basename, convention)) {
        const suggestedName = this.toConvention(basename, convention);
        issues.push(
          this.createProjectIssue(`DWL file "${basename}.dwl" should use ${convention} naming`, {
            suggestion: `Rename to: ${suggestedName}.dwl`,
          }),
        );
      }
    }

    return issues;
  }

  private isValidDwlName(name: string, convention: string): boolean {
    if (convention === 'camelCase') {
      // camelCase: starts lowercase, allows uppercase letters
      return /^[a-z][a-zA-Z0-9]*$/.test(name);
    }
    // kebab-case: lowercase with hyphens
    return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);
  }

  /**
   * Convert a filename to the target convention
   */
  private toConvention(name: string, convention: string): string {
    if (convention === 'camelCase') {
      // Convert kebab-case to camelCase
      return name
        .split('-')
        .map((part, i) =>
          i === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
        )
        .join('');
    }
    // Convert camelCase/PascalCase to kebab-case
    return name
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
  }

  private findDwlFiles(dir: string): string[] {
    const files: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...this.findDwlFiles(fullPath));
        } else if (entry.name.endsWith('.dwl')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory not readable
    }
    return files;
  }
}

/**
 * DW-003: DWL Modules Usage
 *
 * Common DataWeave functions should be in reusable modules.
 *
 * This is a ProjectRule — it runs once per scan to avoid producing
 * N identical issues (one per XML file).
 */
export class DwlModulesRule extends ProjectRule {
  id = 'DW-003';
  name = 'DWL Modules';
  description = 'Project should have common DataWeave modules';
  severity = 'info' as const;
  category = 'dataweave' as const;

  protected validateProject(context: ValidationContext): Issue[] {
    const dwlDir = path.join(context.projectRoot, 'src/main/resources/dwl');

    if (!fs.existsSync(dwlDir)) {
      return [];
    }

    const hasCommonModule = this.hasFile(dwlDir, 'common');
    const hasUtilsModule = this.hasFile(dwlDir, 'utils');

    if (!hasCommonModule && !hasUtilsModule) {
      return [
        this.createProjectIssue('No common/utils DWL module found', {
          suggestion: 'Create common.dwl or utils.dwl for reusable functions',
        }),
      ];
    }

    return [];
  }

  private hasFile(dir: string, pattern: string): boolean {
    try {
      const files = fs.readdirSync(dir);
      return files.some((f) => f.toLowerCase().includes(pattern));
    } catch {
      return false;
    }
  }
}
