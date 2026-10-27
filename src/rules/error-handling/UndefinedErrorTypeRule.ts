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
import {
  CORE_ERROR_TYPES,
  findModuleByErrorNamespace,
  isModuleDeclared,
} from '../../core/MuleModules';

interface ErrorTypeUse {
  namespace: string;
  identifier: string;
  relativePath: string;
  line: number;
}

/** Split `NS:ID` into its parts; a type without a namespace is in `MULE`. */
function parseErrorTypes(value: string): { namespace: string; identifier: string }[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map((part) => {
      const separator = part.indexOf(':');
      return separator < 0
        ? { namespace: 'MULE', identifier: part.toUpperCase() }
        : {
            namespace: part.slice(0, separator).trim().toUpperCase(),
            identifier: part
              .slice(separator + 1)
              .trim()
              .toUpperCase(),
          };
    });
}

const typeName = (use: { namespace: string; identifier: string }) =>
  `${use.namespace}:${use.identifier}`;

/** The namespace every custom error type may use without being raised elsewhere first. */
const APP_NAMESPACE = 'APP';

/**
 * ERR-005: Undefined Error Type
 *
 * Mule resolves every error type an error handler or error mapping names when
 * the application deploys, and fails the deployment when one does not exist.
 * Reported, once per type:
 *
 * - a `MULE:` (or namespace-less) type that is not a core Mule error type;
 * - a connector error namespace, such as `HTTP:` or `DB:`, when no element of
 *   that connector is used and pom.xml declares no dependency for it (only
 *   judged when the POM exists, has no parent, and every artifactId resolves);
 * - a custom type, in `APP` or a namespace the project raises, that is caught
 *   but never raised by `raise-error` or produced by an `error-mapping`.
 *
 * Caught types are read from `on-error-continue` / `on-error-propagate`
 * `type` and `error-mapping` `sourceType`; raised types from `raise-error`
 * `type` and `error-mapping` `targetType`. Namespaces that are neither core,
 * a known connector, nor project-raised may come from an XML SDK or custom
 * module dependency and are not judged.
 */
export class UndefinedErrorTypeRule extends ProjectRule {
  id = 'ERR-005';
  name = 'Undefined Error Type';
  description =
    'Error types caught or mapped must exist: a core Mule type, a configured connector, or a raised custom type';
  severity = 'error' as const;
  category = 'error-handling' as const;
  override issueType: IssueType = 'bug';

  protected validateProject(context: ValidationContext): Issue[] {
    const ignored = new Set(
      this.getOption<string[]>(context, 'ignoredNamespaces', []).map((ns) => ns.toUpperCase()),
    );
    const sources = readMuleSources(context.projectRoot, context.projectContext);
    const caught: ErrorTypeUse[] = [];
    const raised = new Set<string>();
    const usedNamespaces = new Set<string>();

    for (const source of sources) {
      for (const element of allElements(source.document)) {
        if (element.namespaceURI) usedNamespaces.add(element.namespaceURI);
        const local = element.localName;
        const line = getLineNumber(element);
        const add = (value: string | null, target: 'caught' | 'raised') => {
          if (!value || value.includes('#[') || value.includes('${')) return;
          for (const parsed of parseErrorTypes(value)) {
            if (target === 'raised') raised.add(typeName(parsed));
            else caught.push({ ...parsed, relativePath: source.relativePath, line });
          }
        };

        if (local === 'on-error-continue' || local === 'on-error-propagate') {
          add(element.getAttribute('type'), 'caught');
        } else if (local === 'error-mapping') {
          add(element.getAttribute('sourceType'), 'caught');
          add(element.getAttribute('targetType'), 'raised');
        } else if (local === 'raise-error') {
          add(element.getAttribute('type'), 'raised');
        }
      }
    }

    const raisedNamespaces = new Set([...raised].map((type) => type.split(':')[0] ?? ''));
    const pom = readPom(context.projectRoot, context.projectContext);
    const declared = mainDependencyIds(pom);
    // A missing POM, a parent, or a property artifactId hides what is on the classpath
    const dependenciesKnown = pom !== undefined && !pom.hasParent && !hasUnresolvedDependency(pom);
    const reported = new Set<string>();
    const issues: Issue[] = [];

    for (const use of caught) {
      const name = typeName(use);
      if (use.namespace === '*' || ignored.has(use.namespace) || reported.has(name)) continue;

      const finding = this.judge(use, {
        raised,
        raisedNamespaces,
        usedNamespaces,
        declared,
        dependenciesKnown,
      });
      if (!finding) continue;
      reported.add(name);
      issues.push(
        this.createLocatedIssue(use.relativePath, use.line, finding.message, {
          projectRoot: context.projectRoot,
          suggestion: finding.suggestion,
        }),
      );
    }

    return issues;
  }

  private judge(
    use: ErrorTypeUse,
    project: {
      raised: Set<string>;
      raisedNamespaces: Set<string>;
      usedNamespaces: Set<string>;
      declared: Set<string>;
      dependenciesKnown: boolean;
    },
  ): { message: string; suggestion: string } | undefined {
    const name = typeName(use);

    if (use.namespace === 'MULE') {
      if (use.identifier === '*' || CORE_ERROR_TYPES.has(use.identifier)) return undefined;
      return {
        message: `${name} is not a core Mule error type, so the application fails to deploy`,
        suggestion:
          'Use a core type such as MULE:CONNECTIVITY or MULE:EXPRESSION, or qualify the type with the connector or custom namespace that raises it.',
      };
    }

    const connector = findModuleByErrorNamespace(use.namespace);
    if (connector) {
      if (!project.dependenciesKnown) return undefined;
      if (project.usedNamespaces.has(connector.namespace)) return undefined;
      if (isModuleDeclared(connector, project.declared)) return undefined;
      return {
        message: `${name} uses the ${use.namespace} error namespace, but no ${use.namespace} connector element is configured and pom.xml declares no ${connector.artifactIds.join(' or ')} dependency`,
        suggestion: `Remove the handler for ${name}, or add and configure the connector that raises it.`,
      };
    }

    const projectOwned =
      use.namespace === APP_NAMESPACE || project.raisedNamespaces.has(use.namespace);
    if (!projectOwned) return undefined;
    const isRaised =
      use.identifier === '*'
        ? project.raisedNamespaces.has(use.namespace)
        : project.raised.has(name);
    if (isRaised) return undefined;
    return {
      message: `${name} is caught but never raised by raise-error or produced by an error-mapping targetType, so it is undefined`,
      suggestion: `Raise ${name} with <raise-error type="${name}"/> or map a connector error to it with <error-mapping targetType="${name}"/>, or remove the handler.`,
    };
  }
}
