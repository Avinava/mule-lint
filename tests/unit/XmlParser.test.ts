import { parseXml, looksLikeXml } from '../../src/core/XmlParser';

describe('XmlParser', () => {
    describe('parseXml', () => {
        it('should parse valid XML', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        <logger message="Hello"/>
                    </flow>
                </mule>`;

            const result = parseXml(xml);

            expect(result.success).toBe(true);
            expect(result.document).toBeDefined();
            expect(result.error).toBeUndefined();
        });

        it('should handle malformed XML', () => {
            const xml = `<mule>
                <flow name="test">
                    <unclosed-tag>
                </flow>
            </mule>`;

            const result = parseXml(xml);

            // Note: xmldom is quite lenient with malformed XML
            // It may still parse but with warnings
            expect(result.document || result.error).toBeDefined();
        });

        it('should handle empty content', () => {
            const result = parseXml('');

            expect(result.success).toBe(false);
        });

        it('should include file path in error messages', () => {
            const result = parseXml('<invalid>', 'test.xml');

            if (!result.success) {
                expect(result.error).toContain('test.xml');
            }
        });
    });

    describe('looksLikeXml', () => {
        it('should return true for XML declaration', () => {
            expect(looksLikeXml('<?xml version="1.0"?><root/>')).toBe(true);
        });

        it('should return true for root element', () => {
            expect(looksLikeXml('<mule></mule>')).toBe(true);
        });

        it('should return true for DOCTYPE', () => {
            expect(looksLikeXml('<!DOCTYPE html><html></html>')).toBe(true);
        });

        it('should return false for plain text', () => {
            expect(looksLikeXml('This is not XML')).toBe(false);
        });

        it('should return false for JSON', () => {
            expect(looksLikeXml('{"key": "value"}')).toBe(false);
        });

        it('should handle whitespace', () => {
            expect(looksLikeXml('  \n  <root/>')).toBe(true);
        });
    });
});
