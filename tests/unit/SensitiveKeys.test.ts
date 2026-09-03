import {
  isSensitiveKey,
  isPlaceholderValue,
  isEncryptedValue,
  isPlaintextSecret,
} from '../../src/core/SensitiveKeys';

describe('SensitiveKeys', () => {
  describe('isSensitiveKey', () => {
    it('matches secret-bearing final segments', () => {
      expect(isSensitiveKey('salesforce.password')).toBe(true);
      expect(isSensitiveKey('api.client_secret')).toBe(true);
      expect(isSensitiveKey('db.privateKey')).toBe(true);
      expect(isSensitiveKey('accessKey')).toBe(true);
    });

    it('anchors on the final dot segment to avoid false positives', () => {
      expect(isSensitiveKey('password.policy.url')).toBe(false);
      expect(isSensitiveKey('secret.rotation.days')).toBe(false);
    });

    it('ignores non-secret keys', () => {
      expect(isSensitiveKey('salesforce.username')).toBe(false);
      expect(isSensitiveKey('http.port')).toBe(false);
    });

    it('accepts additional keys from rule options', () => {
      expect(isSensitiveKey('app.signingMaterial')).toBe(false);
      expect(isSensitiveKey('app.signingMaterial', ['signingmaterial'])).toBe(true);
      expect(isSensitiveKey('app.signingMaterial', ['signingMaterial'])).toBe(true);
    });
  });

  describe('isPlaceholderValue', () => {
    it('recognises property, DataWeave, and encrypted forms', () => {
      expect(isPlaceholderValue('${db.password}')).toBe(true);
      expect(isPlaceholderValue('${secure::db.password}')).toBe(true);
      expect(isPlaceholderValue('#[vars.secret]')).toBe(true);
      expect(isPlaceholderValue('![kdhfk2==]')).toBe(true);
    });

    it('rejects literals', () => {
      expect(isPlaceholderValue('Summer2026!')).toBe(false);
      expect(isPlaceholderValue('')).toBe(false);
      expect(isPlaceholderValue(42)).toBe(false);
    });
  });

  describe('isEncryptedValue', () => {
    it('matches only the ![...] form', () => {
      expect(isEncryptedValue('![abc]')).toBe(true);
      expect(isEncryptedValue('${x}')).toBe(false);
    });
  });

  describe('isPlaintextSecret', () => {
    it('flags a sensitive key holding a literal', () => {
      expect(isPlaintextSecret('salesforce.password', 'Summer2026!')).toBe(true);
    });

    it('passes placeholders, encrypted values, and empties', () => {
      expect(isPlaintextSecret('salesforce.password', '${secure::sf.password}')).toBe(false);
      expect(isPlaintextSecret('salesforce.password', '![encrypted]')).toBe(false);
      expect(isPlaintextSecret('salesforce.password', '')).toBe(false);
      expect(isPlaintextSecret('salesforce.password', '   ')).toBe(false);
    });

    it('passes non-sensitive keys regardless of value', () => {
      expect(isPlaintextSecret('salesforce.username', 'someone@example.com')).toBe(false);
    });
  });
});
