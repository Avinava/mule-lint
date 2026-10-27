import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { getLineNumber } from '../../core/XPathHelper';
import {
  allElements,
  hasUnresolvedDependency,
  mainDependencyIds,
  readMuleSources,
  readPom,
} from '../../core/ProjectSources';
import { findModuleByNamespace, isModuleDeclared, type MuleModule } from '../../core/MuleModules';

/**
 * PROJ-003: Namespace Without Dependency
 *
 * Mule XML under src/main/mule uses elements of a connector or module whose
 * Maven dependency pom.xml does not declare. The application then fails to
 * build or deploy because the schema and its extension are not on the
 * classpath. Namespaces and their artifactIds come from the MULE_MODULES
 * table; runtime-provided namespaces (core, ee, documentation, batch, tls,
 * api-gateway) need no dependency and are not in it.
 *
 * A `test`-scoped dependency is on the MUnit classpath only, so it does not
 * count. Only namespaces with at least one element are checked, so an unused
 * declaration Studio left behind is not reported. When the POM has a
 * `<parent>`, the dependency may be inherited, so the finding is a warning;
 * when a dependency's artifactId is a property the POM does not define, it may
 * be the connector, so the finding is info. Without a POM nothing is reported.
 */
export class NamespaceDependencyRule extends ProjectRule {
  id = 'PROJ-003';
  name = 'Namespace Without Dependency';
  description =
    'Every connector or module namespace used in Mule XML needs its Maven dependency in pom.xml';
  severity = 'error' as const;
  category = 'governance' as const;
  override issueType: IssueType = 'bug';

  protected validateProject(context: ValidationContext): Issue[] {
    const pom = readPom(context.projectRoot, context.projectContext);
    if (!pom) {
      return [];
    }

    const ignored = new Set(this.getOption<string[]>(context, 'ignoredNamespaces', []));
    const declared = mainDependencyIds(pom);
    const firstUse = new Map<
      MuleModule,
      { relativePath: string; line: number; prefix: string | null }
    >();

    for (const source of readMuleSources(context.projectRoot, context.projectContext)) {
      for (const element of allElements(source.document)) {
        const namespace = element.namespaceURI;
        if (!namespace || ignored.has(namespace)) continue;
        const entry = findModuleByNamespace(namespace);
        if (!entry || firstUse.has(entry) || isModuleDeclared(entry, declared)) continue;
        firstUse.set(entry, {
          relativePath: source.relativePath,
          line: getLineNumber(element),
          prefix: element.prefix,
        });
      }
    }

    // Absence is unprovable when a dependency's artifactId is an undefined property
    const unresolved = hasUnresolvedDependency(pom);
    const severity = unresolved ? 'info' : pom.hasParent ? 'warning' : this.severity;
    return [...firstUse.entries()].map(([entry, use]) => {
      const prefix = use.prefix ? ` (prefix "${use.prefix}")` : '';
      const caveat = unresolved
        ? ', unless a dependency whose artifactId is a property may supply it'
        : pom.hasParent
          ? ', unless the parent POM supplies it'
          : '';
      return this.createLocatedIssue(
        use.relativePath,
        use.line,
        `Namespace ${entry.namespace}${prefix} is used, but pom.xml declares no ${entry.artifactIds.join(' or ')} dependency${caveat}`,
        {
          projectRoot: context.projectRoot,
          severity,
          suggestion: `Add the ${entry.artifactIds[0] ?? 'connector'} dependency with <classifier>mule-plugin</classifier> to pom.xml, or remove the unused elements.`,
        },
      );
    });
  }
}
