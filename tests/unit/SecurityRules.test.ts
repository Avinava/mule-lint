import { HardcodedHttpRule } from '../../src/rules/security/HardcodedHttpRule';
import { InsecureTlsRule } from '../../src/rules/security/InsecureTlsRule';
import { TlsVersionRule } from '../../src/rules/security/TlsVersionRule';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('Security Rules', () => {
    const createContext = (filePath = 'test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: { enabled: true },
    });

    // =================================================================
    // MULE-004: Hardcoded HTTP URLs
    // =================================================================
    describe('HardcodedHttpRule (MULE-004)', () => {
        const rule = new HardcodedHttpRule();

        it('should pass for property placeholder URLs', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <http:request-config name="HTTP_Config">
                        <http:request-connection host="\${api.host}" port="\${api.port}"/>
                    </http:request-config>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for hardcoded HTTP URLs', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <http:request url="http://api.example.com/orders"/>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-004');
            expect(issues[0].severity).toBe('error');
        });

        it('should fail for hardcoded HTTPS URLs', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <http:request url="https://secure-api.example.com/data"/>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('Hardcoded URL');
        });

        it('should pass for DataWeave expression URLs', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:http="http://www.mulesoft.org/schema/mule/http">
                    <http:request url="#[vars.apiUrl]"/>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-004');
            expect(rule.severity).toBe('error');
            expect(rule.category).toBe('security');
        });
    });

    // =================================================================
    // MULE-202: Insecure TLS Configuration
    // =================================================================
    describe('InsecureTlsRule (MULE-202)', () => {
        const rule = new InsecureTlsRule();

        it('should pass for secure TLS configuration', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:tls="http://www.mulesoft.org/schema/mule/tls">
                    <tls:context name="Secure_TLS">
                        <tls:trust-store path="\${tls.truststore.path}"/>
                    </tls:context>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should fail for insecure="true" in trust-store', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:tls="http://www.mulesoft.org/schema/mule/tls">
                    <tls:context name="Insecure_TLS">
                        <tls:trust-store insecure="true"/>
                    </tls:context>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-202');
            expect(issues[0].severity).toBe('error');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-202');
            expect(rule.severity).toBe('error');
            expect(rule.category).toBe('security');
        });
    });

    // =================================================================
    // SEC-002: TLS Version Check
    // =================================================================
    describe('TlsVersionRule (SEC-002)', () => {
        const rule = new TlsVersionRule();

        it('should pass for TLS 1.2', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:tls="http://www.mulesoft.org/schema/mule/tls">
                    <tls:context name="TLS12_Context">
                        <tls:trust-store path="\${tls.path}" protocol="TLSv1.2"/>
                    </tls:context>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should pass for TLS 1.3', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core"
                      xmlns:tls="http://www.mulesoft.org/schema/mule/tls">
                    <tls:context name="TLS13_Context">
                        <tls:trust-store protocol="TLSv1.3"/>
                    </tls:context>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('SEC-002');
            expect(rule.severity).toBe('error');
            expect(rule.category).toBe('security');
        });
    });
});
