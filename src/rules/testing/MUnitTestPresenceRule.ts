import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { Issue, ValidationContext } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { parseXml } from '../../core/XmlParser';

const MUNIT_NAMESPACE = 'http://www.mulesoft.org/schema/mule/munit';

/**
 * TEST-001: MUnit Executable Test Presence
 *
 * Projects with production flows should contain at least one executable MUnit
 * test. Libraries are skipped: they ship sub-flows and modules for other
 * applications to test.
 */
export class MUnitTestPresenceRule extends ProjectRule {
  id = 'TEST-001';
  name = 'MUnit Executable Test Presence';
  description = 'Projects with flows should contain at least one executable MUnit test';
  severity = 'info' as const;
  category = 'testing' as const;

  protected validateProject(context: ValidationContext): Issue[] {
    const flowCount = context.allFlowNames?.size ?? 0;
    if (flowCount === 0 || context.projectContext?.projectLayer === 'library') {
      return [];
    }

    return countExecutableMunitTests(context.projectRoot) > 0
      ? []
      : [
          this.createProjectIssue(`Project has ${flowCount} flows but no executable MUnit tests`, {
            suggestion:
              'Add at least one non-ignored munit:test under src/test/munit for project behavior',
          }),
        ];
  }
}

/** Count non-ignored `munit:test` elements under `src/test/munit`; a symlinked root is not followed. */
function countExecutableMunitTests(projectRoot: string): number {
  const munitDir = path.join(projectRoot, 'src', 'test', 'munit');
  if (!fs.existsSync(munitDir) || fs.lstatSync(munitDir).isSymbolicLink()) {
    return 0;
  }

  const suites = fg.sync('**/*.xml', {
    cwd: munitDir,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false,
  });

  let executableTests = 0;
  for (const suite of suites) {
    let content: string;
    try {
      content = fs.readFileSync(suite, 'utf8');
    } catch {
      continue;
    }
    const parsed = parseXml(content, path.relative(projectRoot, suite));
    if (!parsed.success || !parsed.document) {
      continue;
    }
    const tests = parsed.document.getElementsByTagNameNS(MUNIT_NAMESPACE, 'test');
    for (let index = 0; index < tests.length; index += 1) {
      const test = tests.item(index);
      if (test && (test.getAttribute('ignore') ?? '').trim().toLowerCase() !== 'true') {
        executableTests += 1;
      }
    }
  }
  return executableTests;
}
