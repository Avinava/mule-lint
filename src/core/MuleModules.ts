/**
 * Connectors and modules that a Mule application must declare as Maven
 * dependencies before their XML namespace or error types can be used.
 *
 * This is the one table PROJ-003 (namespace without dependency) and ERR-005
 * (undefined error type) read. Add a connector here, not in a rule.
 *
 * - `namespace`: the XML namespace URI the module's elements use
 * - `artifactIds`: Maven artifactIds that provide it; any one satisfies the check
 * - `errorNamespace`: the namespace of the error types the module raises
 *
 * Namespaces provided by the runtime itself (core, ee/core, documentation,
 * batch, tls, api-gateway, ee/tracking) need no dependency and are absent from
 * the table on purpose. MUnit namespaces belong to src/test and are exempt.
 */

const SCHEMA = 'http://www.mulesoft.org/schema/mule/';

export interface MuleModule {
  namespace: string;
  artifactIds: readonly string[];
  errorNamespace?: string | undefined;
}

const entry = (
  segment: string,
  artifactIds: readonly string[],
  errorNamespace?: string,
): MuleModule => ({ namespace: `${SCHEMA}${segment}`, artifactIds, errorNamespace });

export const MULE_MODULES: readonly MuleModule[] = [
  entry('http', ['mule-http-connector'], 'HTTP'),
  entry('db', ['mule-db-connector'], 'DB'),
  entry('salesforce', ['mule-salesforce-connector'], 'SALESFORCE'),
  entry('vm', ['mule-vm-connector'], 'VM'),
  entry('anypoint-mq', ['anypoint-mq-connector'], 'ANYPOINT-MQ'),
  entry('os', ['mule-objectstore-connector'], 'OS'),
  entry('file', ['mule-file-connector'], 'FILE'),
  entry('ftp', ['mule-ftp-connector'], 'FTP'),
  entry('sftp', ['mule-sftp-connector'], 'SFTP'),
  entry('email', ['mule-email-connector'], 'EMAIL'),
  entry('jms', ['mule-jms-connector'], 'JMS'),
  entry('sockets', ['mule-sockets-connector'], 'SOCKETS'),
  entry('wsc', ['mule-wsc-connector'], 'WSC'),
  entry('kafka', ['mule-kafka-connector'], 'KAFKA'),
  entry('ldap', ['mule-ldap-connector'], 'LDAP'),
  entry('crypto', ['mule-crypto-connector'], 'CRYPTO'),
  entry('validation', ['mule-validation-module'], 'VALIDATION'),
  entry('mule-apikit', ['mule-apikit-module'], 'APIKIT'),
  entry('apikit-soap', ['mule-apikit-soap-module']),
  entry('json', ['mule-json-module'], 'JSON'),
  entry('xml-module', ['mule-xml-module'], 'XML-MODULE'),
  entry('java', ['mule-java-module'], 'JAVA'),
  entry('scripting', ['mule-scripting-module'], 'SCRIPTING'),
  entry('compression', ['mule-compression-module'], 'COMPRESSION'),
  entry('secure-properties', ['mule-secure-configuration-property-module']),
  entry('oauth', ['mule-oauth-module']),
  entry('spring', ['mule-spring-module']),
  entry('tracing', ['mule-tracing-module']),
];

/** The module whose elements use a namespace URI, if it is in the table. */
export function findModuleByNamespace(namespace: string): MuleModule | undefined {
  const normalized = namespace.replace(/\/+$/, '');
  return MULE_MODULES.find((entry) => entry.namespace === normalized);
}

/** The module raising errors in an error namespace, if it is in the table. */
export function findModuleByErrorNamespace(errorNamespace: string): MuleModule | undefined {
  const upper = errorNamespace.toUpperCase();
  return MULE_MODULES.find((entry) => entry.errorNamespace === upper);
}

/** True when pom.xml declares a dependency providing the module. */
export function isModuleDeclared(entry: MuleModule, artifactIds: ReadonlySet<string>): boolean {
  return entry.artifactIds.some((artifactId) => artifactIds.has(artifactId));
}

/**
 * Error types the Mule runtime defines in the core `MULE` namespace.
 *
 * Source: Mule error types reference
 * (https://docs.mulesoft.com/mule-runtime/latest/mule-error-concept). A type
 * written without a namespace, such as `ANY`, resolves to `MULE`.
 */
export const CORE_ERROR_TYPES: ReadonlySet<string> = new Set([
  'ANY',
  'CLIENT_SECURITY',
  'COMPOSITE_ROUTING',
  'CONNECTIVITY',
  'CRITICAL',
  'DUPLICATE_MESSAGE',
  'EXPRESSION',
  'FATAL',
  'FATAL_JVM_ERROR',
  'FLOW_BACK_PRESSURE',
  'NOT_PERMITTED',
  'OVERLOAD',
  'REDELIVERY_EXHAUSTED',
  'RETRY_EXHAUSTED',
  'ROUTING',
  'SECURITY',
  'SERVER_SECURITY',
  'SOURCE',
  'SOURCE_ERROR_RESPONSE_GENERATE',
  'SOURCE_ERROR_RESPONSE_SEND',
  'SOURCE_RESPONSE',
  'SOURCE_RESPONSE_GENERATE',
  'SOURCE_RESPONSE_SEND',
  'STREAM_MAXIMUM_SIZE_EXCEEDED',
  'TIMEOUT',
  'TRANSFORMATION',
  'UNKNOWN',
  'VALIDATION',
]);
