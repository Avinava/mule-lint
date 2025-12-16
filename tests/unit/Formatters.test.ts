
import { formatHtml } from '../../src/formatters/HtmlFormatter';
import { formatCsv } from '../../src/formatters/CsvFormatter';
import { LintReport } from '../../src/types/Report';

describe('Formatters', () => {
    const mockReport: LintReport = {
        projectRoot: '/test',
        timestamp: '2024-01-01T00:00:00.000Z',
        durationMs: 100,
        files: [
            {
                filePath: '/test/file1.xml',
                relativePath: 'file1.xml',
                parsed: true,
                issues: [
                    {
                        severity: 'error',
                        ruleId: 'TEST-001',
                        message: 'Test error message',
                        line: 10,
                        column: 5
                    }
                ]
            },
            {
                filePath: '/test/file2.xml',
                relativePath: 'file2.xml',
                parsed: true,
                issues: [
                    {
                        severity: 'warning',
                        ruleId: 'TEST-002',
                        message: 'Test warning message',
                        line: 20
                    }
                ]
            },
            {
                filePath: '/test/file3.xml',
                relativePath: 'file3.xml',
                parsed: false,
                parseError: 'XML parse error',
                issues: []
            }
        ],
        summary: {
            totalFiles: 3,
            filesWithIssues: 3,
            parseErrors: 1,
            bySeverity: {
                error: 1,
                warning: 1,
                info: 0
            },
            byRule: {
                'TEST-001': 1,
                'TEST-002': 1
            }
        }
    };

    describe('HtmlFormatter', () => {
        it('should generate valid HTML output', () => {
            const output = formatHtml(mockReport);
            
            expect(output).toContain('<!DOCTYPE html>');
            expect(output).toContain('Mule-Lint Report');
            expect(output).toContain('file1.xml');
            expect(output).toContain('Test error message');
            expect(output).toContain('TEST-001');
            expect(output).toContain('class="severity-cell color-error"');
            expect(output).toContain('Health Score');
            expect(output).toContain('score-ring');
        });

        it('should handle parse errors in HTML', () => {
            const output = formatHtml(mockReport);
            
            expect(output).toContain('file3.xml');
            expect(output).toContain('XML parse error');
            expect(output).toContain('PARSE-ERROR');
        });
    });

    describe('CsvFormatter', () => {
        it('should generate valid CSV output', () => {
            const output = formatCsv(mockReport);
            
            const lines = output.split('\n');
            expect(lines.length).toBeGreaterThan(1);
            expect(lines[0]).toBe('Severity,Rule,File,Line,Column,Message');
            
            // Check error row
            const errorRow = lines.find(line => line.includes('TEST-001'));
            expect(errorRow).toBeDefined();
            expect(errorRow).toContain('error,TEST-001,file1.xml,10,5,Test error message');

            // Check warning row
            const warningRow = lines.find(line => line.includes('TEST-002'));
            expect(warningRow).toBeDefined();
            expect(warningRow).toContain('warning,TEST-002,file2.xml,20,0,Test warning message');
        });

        it('should handle parse errors in CSV', () => {
            const output = formatCsv(mockReport);
            const lines = output.split('\n');
            const parseErrorRow = lines.find(line => line.includes('PARSE-ERROR'));
            expect(parseErrorRow).toBeDefined();
            expect(parseErrorRow).toContain('error,PARSE-ERROR,file3.xml,1,1,XML parse error');
        });

        it('should escape correctly', () => {
             const reportWithCommas: LintReport = {
                ...mockReport,
                files: [{
                    filePath: '/test/special.xml',
                    relativePath: 'special.xml',
                    parsed: true,
                    issues: [{
                        severity: 'info',
                        ruleId: 'SPECIAL',
                        message: 'Message with comma, and quotes "test"',
                        line: 1
                    }]
                }]
             };
             
             const output = formatCsv(reportWithCommas);
             const line = output.split('\n').find(l => l.includes('SPECIAL'));
             expect(line).toContain('"Message with comma, and quotes ""test"""');
        });
    });
});
