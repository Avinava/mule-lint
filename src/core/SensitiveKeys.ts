/**
 * Shared classification of configuration keys that are expected to hold secrets.
 *
 * Several rules need the same question answered — "does this key name imply a
 * secret, and is its value a real literal rather than a placeholder?" — across
 * YAML properties, Java `.properties` files, and Mule XML. Keeping one
 * implementation means a key that YAML-004 flags is also flagged by CFG-003.
 *
 * @sfdxy/mule-build mirrors this classification. The shared cases live in
 * tests/fixtures/sensitive-key-vectors.json; change both tools when a case changes.
 */

/**
 * Key name endings that indicate a secret.
 *
 * Matching is anchored to the final dot-separated segment so that
 * `salesforce.password` matches while `password.policy.url` does not.
 */
const SECRET_KEY_ENDINGS = [
  'password',
  'passwd',
  'passphrase',
  'secret',
  'token',
  'tokenid',
  'tokenkey',
  'apikey',
  'api-key',
  'api_key',
  'accesstoken',
  'access-token',
  'access_token',
  'accesskey',
  'access-key',
  'access_key',
  'refreshtoken',
  'refresh-token',
  'refresh_token',
  'clientsecret',
  'client-secret',
  'client_secret',
  'privatekey',
  'private-key',
  'private_key',
  'credential',
  'credentials',
  'authtoken',
  'auth-token',
  'auth_token',
  'bearertoken',
  'bearer-token',
  'bearer_token',
  'consumerkey',
  'consumer-key',
  'consumer_key',
  'consumersecret',
  'consumer-secret',
  'consumer_secret',
  'tokensecret',
  'token-secret',
  'token_secret',
];

/**
 * Values that resolve at runtime rather than at lint time. A key holding one of
 * these is not a plaintext secret, whatever the key is called.
 *
 * - `${...}`  property placeholder, including `${secure::...}`
 * - `#[...]`  DataWeave expression
 * - `![...]`  Mule Secure Properties encrypted value
 */
const PLACEHOLDER_PATTERNS = [/\$\{[^}]*\}/, /#\[[\s\S]*\]/, /^!\[[\s\S]*\]$/];

/**
 * XML attributes that hold a secret only on a specific element, keyed by the
 * element's local name and namespace fragment.
 */
const ELEMENT_SECRET_ATTRIBUTES: { localName: string; namespace: string; attributes: string[] }[] =
  [{ localName: 'config', namespace: 'secure-properties', attributes: ['key'] }];

/**
 * Check whether a key name implies it holds a secret.
 *
 * @param key - Key name, optionally dot-separated (e.g. `salesforce.password`)
 * @param additionalKeys - Extra case-insensitive endings supplied by rule options
 */
export function isSensitiveKey(key: string, additionalKeys: string[] = []): boolean {
  const lowerKey = key.toLowerCase();
  const segments = lowerKey.split('.');
  const lastSegment = segments.at(-1) ?? '';

  const endings = [...SECRET_KEY_ENDINGS, ...additionalKeys.map((k) => k.toLowerCase())];

  return endings.some((pattern) => lastSegment === pattern || lastSegment.endsWith(pattern));
}

/**
 * Check whether a value is resolved at runtime rather than being a literal.
 */
export function isPlaceholderValue(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Check whether a value is a Mule Secure Properties encrypted literal (`![...]`).
 *
 * Encrypted values are not plaintext, but they still require the Secure
 * Properties module to be configured, which is what SEC-011 checks.
 */
export function isEncryptedValue(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return /^!\[[\s\S]*\]$/.test(value.trim());
}

/**
 * Check whether an XML attribute holds a secret.
 *
 * Attribute names are matched by their ending, like configuration keys, so
 * `password` and `storePassword` match while `tokenUrl` and `passwordPolicy`
 * do not. Namespaced metadata such as `doc:name` never matches.
 *
 * @param element - The element carrying the attribute
 * @param attributeName - The attribute's qualified name
 * @param additionalKeys - Extra case-insensitive endings supplied by rule options
 */
export function isSensitiveAttribute(
  element: Pick<Element, 'localName' | 'namespaceURI'>,
  attributeName: string,
  additionalKeys: string[] = [],
): boolean {
  if (attributeName.includes(':')) {
    return false;
  }
  if (isElementSecretAttribute(element, attributeName)) {
    return true;
  }
  return isSensitiveKey(attributeName, additionalKeys);
}

/**
 * Check whether an attribute is a secret only because of the element it is on,
 * such as the decryption `key` of `<secure-properties:config>`.
 */
export function isElementSecretAttribute(
  element: Pick<Element, 'localName' | 'namespaceURI'>,
  attributeName: string,
): boolean {
  const namespace = element.namespaceURI ?? '';
  return ELEMENT_SECRET_ATTRIBUTES.some(
    (entry) =>
      entry.localName === element.localName &&
      namespace.includes(entry.namespace) &&
      entry.attributes.includes(attributeName),
  );
}

/**
 * Check whether an XML attribute value is a hardcoded literal. Booleans and
 * numbers are treated as flags (for example `useToken="true"`).
 */
export function isLiteralAttributeValue(value: string): boolean {
  const text = value.trim();
  if (!text || text === 'true' || text === 'false' || !Number.isNaN(Number(text))) {
    return false;
  }
  return !isPlaceholderValue(text);
}

/**
 * Check whether a key/value pair is a plaintext secret: a sensitive key whose
 * value is a non-empty literal.
 */
export function isPlaintextSecret(
  key: string,
  value: unknown,
  additionalKeys: string[] = [],
): boolean {
  if (!isSensitiveKey(key, additionalKeys)) {
    return false;
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    return false;
  }
  const stringValue = String(value).trim();
  if (stringValue.length === 0) {
    return false;
  }
  return !isPlaceholderValue(stringValue);
}

/** The default secret-key endings, exposed for documentation and tests. */
export function getSecretKeyEndings(): readonly string[] {
  return SECRET_KEY_ENDINGS;
}
