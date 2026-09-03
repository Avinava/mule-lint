import { parseProperties, isPropertiesFile } from '../../src/core/PropertiesParser';

describe('PropertiesParser', () => {
  describe('parseProperties', () => {
    it('parses key=value with line numbers', () => {
      const entries = parseProperties('a=1\nb=2\n');
      expect(entries).toEqual([
        { key: 'a', value: '1', line: 1 },
        { key: 'b', value: '2', line: 2 },
      ]);
    });

    it('supports colon and whitespace separators', () => {
      const entries = parseProperties('a:1\nb 2\nc = 3\nd : 4\n');
      expect(entries.map((e) => [e.key, e.value])).toEqual([
        ['a', '1'],
        ['b', '2'],
        ['c', '3'],
        ['d', '4'],
      ]);
    });

    it('ignores blank lines and both comment markers', () => {
      const entries = parseProperties('\n# comment=1\n! bang=2\n\nreal=3\n');
      expect(entries).toEqual([{ key: 'real', value: '3', line: 5 }]);
    });

    it('joins continuation lines and reports the starting line', () => {
      const entries = parseProperties('a=one\\\n   two\nb=3\n');
      expect(entries[0]).toEqual({ key: 'a', value: 'onetwo', line: 1 });
      expect(entries[1]?.line).toBe(3);
    });

    it('honours escaped separators in keys', () => {
      const entries = parseProperties('a\\:b\\=c=value\n');
      expect(entries[0]?.key).toBe('a:b=c');
      expect(entries[0]?.value).toBe('value');
    });

    it('keeps duplicate keys as separate entries with their own lines', () => {
      const entries = parseProperties('dup=first\ndup=second\n');
      expect(entries).toHaveLength(2);
      expect(entries[0]?.line).toBe(1);
      expect(entries[1]?.line).toBe(2);
      expect(entries[1]?.value).toBe('second');
    });

    it('treats a key with no separator as an empty value', () => {
      const entries = parseProperties('lonely\n');
      expect(entries).toEqual([{ key: 'lonely', value: '', line: 1 }]);
    });

    it('preserves placeholder values verbatim', () => {
      const entries = parseProperties('p=${secure::db.password}\n');
      expect(entries[0]?.value).toBe('${secure::db.password}');
    });

    it('does not treat a trailing escaped backslash as a continuation', () => {
      const entries = parseProperties('path=C:\\\\dir\\\\\nnext=2\n');
      expect(entries).toHaveLength(2);
      expect(entries[1]?.key).toBe('next');
    });

    it('handles CRLF line endings', () => {
      const entries = parseProperties('a=1\r\nb=2\r\n');
      expect(entries.map((e) => e.line)).toEqual([1, 2]);
    });

    it('returns an empty array for empty content', () => {
      expect(parseProperties('')).toEqual([]);
    });
  });

  describe('isPropertiesFile', () => {
    it('matches only the .properties extension', () => {
      expect(isPropertiesFile('a/b/config.properties')).toBe(true);
      expect(isPropertiesFile('a/b/config.PROPERTIES')).toBe(true);
      expect(isPropertiesFile('a/b/config.yaml')).toBe(false);
    });
  });
});
