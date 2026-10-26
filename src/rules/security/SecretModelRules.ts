import { ValidationContext, Issue, IssueType } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import { getSecretModel } from '../../core/SecretModel';
import { isSensitiveKey } from '../../core/SensitiveKeys';

/**
 * SEC-017: Platform Secure Property Referenced With secure::
 *
 * A key listed as a plain entry in mule-artifact.json `secureProperties` is
 * supplied by the platform at deployment and resolves as `${key}`. Referencing
 * it as `${secure::key}` asks the Secure Configuration Properties module for
 * it instead, which fails unless the key is also defined encrypted in a secure
 * properties file.
 *
 * Mirrors @sfdxy/mule-build MB-SEC-006.
 */
export class PlatformSecurePropertyPrefixRule extends ProjectRule {
  id = 'SEC-017';
  name = 'Platform Secure Property Referenced With secure::';
  description =
    'A platform secure property (mule-artifact.json secureProperties) must be referenced as ${key}, not ${secure::key}';
  severity = 'error' as const;
  category = 'security' as const;
  override issueType: IssueType = 'bug';

  protected validateProject(context: ValidationContext): Issue[] {
    const model = getSecretModel(context.projectRoot, context.projectContext);
    if (model.platformKeys.size === 0) {
      return [];
    }

    const encrypted = new Set(model.keys.filter((key) => key.encrypted).map((key) => key.key));
    const reported = new Set<string>();
    const issues: Issue[] = [];

    for (const reference of model.references) {
      if (!reference.secure || reported.has(reference.name)) continue;
      if (!model.platformKeys.has(reference.name) || encrypted.has(reference.name)) continue;
      reported.add(reference.name);
      issues.push(
        this.createLocatedIssue(
          reference.relativePath,
          reference.line,
          `"${reference.name}" is a platform secure property (mule-artifact.json secureProperties) but is referenced with secure::, which only resolves from a secure properties file`,
          {
            projectRoot: context.projectRoot,
            suggestion: `Reference it as \${${reference.name}}, or remove it from secureProperties and define it encrypted in a secure properties file.`,
          },
        ),
      );
    }

    return issues;
  }
}

/**
 * SEC-018: Unresolved secure:: Reference
 *
 * A `${secure::key}` reference resolves only through `<secure-properties:config>`.
 * It is reported when the application configures no such module, or when the
 * module is configured but no scanned configuration file defines the key.
 *
 * Always a warning: MuleSoft does not document how secure:: resolves without
 * the module, a shared domain can configure it, and a secure properties file
 * can be supplied per environment outside the repository.
 *
 * Mirrors @sfdxy/mule-build MB-SEC-007.
 */
export class UnresolvedSecureReferenceRule extends ProjectRule {
  id = 'SEC-018';
  name = 'Unresolved secure:: Reference';
  description =
    'A ${secure::key} reference needs a secure-properties:config and a definition of the key';
  severity = 'warning' as const;
  category = 'security' as const;
  override issueType: IssueType = 'bug';

  protected validateProject(context: ValidationContext): Issue[] {
    const model = getSecretModel(context.projectRoot, context.projectContext);
    const defined = new Set(model.keys.map((key) => key.key));
    const reported = new Set<string>();
    const issues: Issue[] = [];

    for (const reference of model.references) {
      if (!reference.secure || reported.has(reference.name)) continue;
      // A platform key referenced with secure:: is SEC-017's finding
      if (model.platformKeys.has(reference.name)) continue;

      let message: string;
      let suggestion: string;
      if (!model.secureConfigPresent) {
        message = model.sharedDomain
          ? `secure::${reference.name} is referenced, but no secure-properties:config is configured in the application (the shared domain may provide one)`
          : `secure::${reference.name} is referenced, but no secure-properties:config is configured, so it cannot resolve`;
        suggestion = `Add a secure-properties:config for the encrypted file, or, for a platform secure property, reference \${${reference.name}} and list it in mule-artifact.json secureProperties.`;
      } else if (!defined.has(reference.name)) {
        message = `secure::${reference.name} is not defined in any scanned configuration file`;
        suggestion =
          'Define it encrypted in the secure properties file, or confirm the file is supplied per environment.';
      } else {
        continue;
      }

      reported.add(reference.name);
      issues.push(
        this.createLocatedIssue(reference.relativePath, reference.line, message, {
          projectRoot: context.projectRoot,
          suggestion,
        }),
      );
    }

    return issues;
  }
}

/**
 * SEC-019: Unused Sensitive Property
 *
 * A sensitive key defined in a configuration file that nothing references.
 * Often the connector it was meant for holds a literal or a differently named
 * property instead, so check for a hardcoded credential it should replace.
 *
 * Keys the Mule runtime reads itself, such as the API autodiscovery client
 * credentials, are ignored. Mirrors @sfdxy/mule-build MB-SEC-004.
 */
export class UnusedSensitivePropertyRule extends ProjectRule {
  id = 'SEC-019';
  name = 'Unused Sensitive Property';
  description = 'Sensitive configuration keys should be referenced or removed';
  severity = 'warning' as const;
  category = 'security' as const;
  override issueType: IssueType = 'code-smell';

  /** Keys consumed by the runtime rather than by application configuration. */
  private static readonly RUNTIME_KEYS = [
    'anypoint.platform.client_id',
    'anypoint.platform.client_secret',
  ];

  protected validateProject(context: ValidationContext): Issue[] {
    const additionalKeys = this.getOption<string[]>(context, 'additionalSensitiveKeys', []);
    const ignoredKeys = [
      ...UnusedSensitivePropertyRule.RUNTIME_KEYS,
      ...this.getOption<string[]>(context, 'ignoredKeys', []),
    ];
    const model = getSecretModel(context.projectRoot, context.projectContext);
    const referenced = new Set(model.references.map((reference) => reference.name));
    const reported = new Set<string>();
    const issues: Issue[] = [];

    for (const defined of model.keys) {
      if (!isSensitiveKey(defined.key, additionalKeys)) continue;
      if (referenced.has(defined.key) || reported.has(defined.key)) continue;
      if (ignoredKeys.includes(defined.key)) continue;
      reported.add(defined.key);
      issues.push(
        this.createLocatedIssue(
          defined.relativePath,
          defined.line,
          `Sensitive key "${defined.key}" is defined but never referenced`,
          {
            projectRoot: context.projectRoot,
            suggestion: `Reference it from the connector configuration (\${secure::${defined.key}} for an encrypted value), or remove it if it is obsolete. Check for a hardcoded credential (MULE-201, SEC-007) it should replace.`,
          },
        ),
      );
    }

    return issues;
  }
}
