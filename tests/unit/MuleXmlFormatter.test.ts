import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
    formatXmlContent,
    formatFile,
    formatProject,
    MULE_XML_DEFAULTS,
} from '../../src/formatter/MuleXmlFormatter';

describe('MuleXmlFormatter', () => {
    // ─── Defaults ────────────────────────────────────────────────────────

    describe('MULE_XML_DEFAULTS', () => {
        it('should match Anypoint Studio conventions', () => {
            expect(MULE_XML_DEFAULTS.tabWidth).toBe(4);
            expect(MULE_XML_DEFAULTS.printWidth).toBe(140);
            expect(MULE_XML_DEFAULTS.xmlQuoteAttributes).toBe('preserve');
            expect(MULE_XML_DEFAULTS.xmlSortAttributesByKey).toBe(false);
        });
    });

    // ─── formatXmlContent ────────────────────────────────────────────────

    describe('formatXmlContent', () => {
        it('should format unindented XML', async () => {
            const ugly = `<?xml version="1.0" encoding="UTF-8"?>\n<mule><flow name="test-flow"><logger message="hello"/></flow></mule>`;
            const result = await formatXmlContent(ugly);
            expect(result.changed).toBe(true);
            expect(result.formatted).toContain('    '); // 4-space indent
            expect(result.formatted).toContain('<flow');
        });

        it('should preserve single-quoted attributes by default', async () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mule>\n    <logger message='hello' category='com.test'/>\n</mule>\n`;
            const result = await formatXmlContent(xml);
            // With preserve mode, single quotes should stay single
            expect(result.formatted).toContain("'hello'");
            expect(result.formatted).toContain("'com.test'");
        });

        it('should respect custom tabWidth', async () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mule><flow name="test-flow"/></mule>`;
            const result = await formatXmlContent(xml, { tabWidth: 2 });
            expect(result.formatted).toContain('  <flow');
            expect(result.formatted).not.toContain('    <flow');
        });

        it('should report changed=false for already-formatted content', async () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mule><flow name="test"/></mule>`;
            const first = await formatXmlContent(xml);
            const second = await formatXmlContent(first.formatted);
            expect(second.changed).toBe(false);
        });
    });

    // ─── formatFile ──────────────────────────────────────────────────────

    describe('formatFile', () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-fmt-'));
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it('should format a file in-place', async () => {
            const filePath = path.join(tmpDir, 'test.xml');
            const ugly = `<?xml version="1.0" encoding="UTF-8"?>\n<mule><flow name="test"><logger message="hi"/></flow></mule>`;
            fs.writeFileSync(filePath, ugly, 'utf-8');

            const result = await formatFile(filePath);
            expect(result.changed).toBe(true);
            expect(result.error).toBeUndefined();

            const written = fs.readFileSync(filePath, 'utf-8');
            expect(written).toContain('    ');
        });

        it('should not write when check=true', async () => {
            const filePath = path.join(tmpDir, 'check.xml');
            const ugly = `<?xml version="1.0" encoding="UTF-8"?>\n<mule><flow name="test"/></mule>`;
            fs.writeFileSync(filePath, ugly, 'utf-8');

            const result = await formatFile(filePath, { check: true });
            expect(result.changed).toBe(true);

            // File should be unchanged on disk
            const content = fs.readFileSync(filePath, 'utf-8');
            expect(content).toBe(ugly);
        });

        it('should return error for non-existent file', async () => {
            const result = await formatFile('/does-not-exist.xml');
            expect(result.error).toContain('File not found');
            expect(result.changed).toBe(false);
        });
    });

    // ─── formatProject ───────────────────────────────────────────────────

    describe('formatProject', () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-proj-'));
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it('should format all XML files in src/main/mule/', async () => {
            const muleDir = path.join(tmpDir, 'src', 'main', 'mule');
            fs.mkdirSync(muleDir, { recursive: true });

            const xml1 = `<?xml version="1.0" encoding="UTF-8"?>\n<mule><flow name="flow-1"/></mule>`;
            const xml2 = `<?xml version="1.0" encoding="UTF-8"?>\n<mule><flow name="flow-2"/></mule>`;
            fs.writeFileSync(path.join(muleDir, 'flow1.xml'), xml1, 'utf-8');
            fs.writeFileSync(path.join(muleDir, 'flow2.xml'), xml2, 'utf-8');

            const results = await formatProject(tmpDir);
            expect(results).toHaveLength(2);
            expect(results.every((r) => r.changed)).toBe(true);
        });

        it('should return empty array when no XML files found', async () => {
            const emptyProject = path.join(tmpDir, 'empty');
            fs.mkdirSync(emptyProject, { recursive: true });

            const results = await formatProject(emptyProject);
            expect(results).toHaveLength(0);
        });

        it('should return error for non-existent project path', async () => {
            const results = await formatProject('/nonexistent-project');
            expect(results).toHaveLength(1);
            expect(results[0].error).toContain('Project path not found');
        });
    });
});
