import { FlowComplexityRule } from '../../src/rules/complexity/FlowComplexityRule';
import { ComplexityCalculator } from '../../src/core/ComplexityCalculator';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext } from '../../src/types';

describe('Complexity Rules', () => {
    const createContext = (filePath = 'test.xml'): ValidationContext => ({
        filePath,
        relativePath: filePath,
        projectRoot: '/project',
        config: { enabled: true },
    });

    // =================================================================
    // MULE-801: Flow Complexity
    // =================================================================
    describe('FlowComplexityRule (MULE-801)', () => {
        const rule = new FlowComplexityRule();

        it('should pass for simple flow', () => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="simple-flow">
                        <logger message="test"/>
                        <set-variable variableName="x" value="1"/>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(0);
        });

        it('should warn for moderately complex flow (11+ complexity)', () => {
            // Flow with 10 when clauses = complexity 11
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="complex-flow">
                        <choice>
                            <when expression="#[a]"><logger/></when>
                            <when expression="#[b]"><logger/></when>
                            <when expression="#[c]"><logger/></when>
                            <when expression="#[d]"><logger/></when>
                            <when expression="#[e]"><logger/></when>
                            <when expression="#[f]"><logger/></when>
                            <when expression="#[g]"><logger/></when>
                            <when expression="#[h]"><logger/></when>
                            <when expression="#[i]"><logger/></when>
                            <when expression="#[j]"><logger/></when>
                            <otherwise><logger/></otherwise>
                        </choice>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].ruleId).toBe('MULE-801');
            expect(issues[0].severity).toBe('warning');
            expect(issues[0].message).toContain('moderate complexity');
        });

        it('should error for highly complex flow (21+ complexity)', () => {
            // Flow with 20 when clauses = complexity 21
            const whenClauses = Array.from({ length: 20 }, (_, i) =>
                `<when expression="#[v${i}]"><logger/></when>`
            ).join('\n');

            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="very-complex-flow">
                        <choice>
                            ${whenClauses}
                            <otherwise><logger/></otherwise>
                        </choice>
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            expect(result.success).toBe(true);

            const issues = rule.validate(result.document!, createContext());
            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('error');
            expect(issues[0].message).toContain('high complexity');
        });

        it('should have correct rule properties', () => {
            expect(rule.id).toBe('MULE-801');
            expect(rule.severity).toBe('warning');
            expect(rule.category).toBe('complexity');
        });
    });

    // =================================================================
    // ComplexityCalculator Unit Tests
    // =================================================================
    describe('ComplexityCalculator', () => {
        const getFlowNode = (flowContent: string): Node => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        ${flowContent}
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            const xpath = require('xpath');
            const select = xpath.useNamespaces({
                mule: 'http://www.mulesoft.org/schema/mule/core',
            });
            return select('//mule:flow', result.document!)[0] as Node;
        };

        it('should count async scopes', () => {
            const flow = getFlowNode(`
                <async><logger/></async>
                <async><logger/></async>
            `);
            const complexityResult = ComplexityCalculator.calculateFlowComplexity(flow);
            expect(complexityResult.complexity).toBe(3); // 1 base + 2 async
            expect(complexityResult.details.find(d => d.type === 'async')?.count).toBe(2);
        });

        it('should count parallel-foreach', () => {
            const flow = getFlowNode(`<parallel-foreach><logger/></parallel-foreach>`);
            const complexityResult = ComplexityCalculator.calculateFlowComplexity(flow);
            expect(complexityResult.complexity).toBe(2); // 1 base + 1 parallel-foreach
            expect(complexityResult.details.find(d => d.type === 'parallel-foreach')?.count).toBe(1);
        });

        it('should count first-successful', () => {
            const flow = getFlowNode(`
                <first-successful>
                    <http:request/>
                    <http:request/>
                </first-successful>
            `);
            const complexityResult = ComplexityCalculator.calculateFlowComplexity(flow);
            expect(complexityResult.complexity).toBe(2); // 1 base + 1 first-successful
            expect(complexityResult.details.find(d => d.type === 'first-successful')?.count).toBe(1);
        });

        it('should count round-robin', () => {
            const flow = getFlowNode(`
                <round-robin>
                    <route><logger/></route>
                    <route><logger/></route>
                </round-robin>
            `);
            const complexityResult = ComplexityCalculator.calculateFlowComplexity(flow);
            expect(complexityResult.complexity).toBe(2); // 1 base + 1 round-robin
            expect(complexityResult.details.find(d => d.type === 'round-robin')?.count).toBe(1);
        });

        it('should count all decision point types together', () => {
            const flow = getFlowNode(`
                <choice>
                    <when expression="#[a]"><logger/></when>
                    <when expression="#[b]"><logger/></when>
                    <otherwise><logger/></otherwise>
                </choice>
                <foreach><logger/></foreach>
                <parallel-foreach><logger/></parallel-foreach>
                <scatter-gather>
                    <route><logger/></route>
                </scatter-gather>
                <async><logger/></async>
                <try>
                    <logger/>
                    <error-handler>
                        <on-error-continue><logger/></on-error-continue>
                    </error-handler>
                </try>
                <until-successful maxRetries="3"><logger/></until-successful>
                <first-successful><logger/></first-successful>
                <round-robin><route><logger/></route></round-robin>
            `);
            const complexityResult = ComplexityCalculator.calculateFlowComplexity(flow);
            // 1 base + 2 when + 1 foreach + 1 parallel-foreach + 1 scatter-gather + 
            // 1 async + 1 try + 1 error-handler + 1 until-successful + 1 first-successful + 1 round-robin = 12
            expect(complexityResult.complexity).toBe(12);
            expect(complexityResult.rating).toBe('moderate');
        });

        it('should return correct rating thresholds', () => {
            expect(ComplexityCalculator.getRating(1)).toBe('low');
            expect(ComplexityCalculator.getRating(10)).toBe('low');
            expect(ComplexityCalculator.getRating(11)).toBe('moderate');
            expect(ComplexityCalculator.getRating(20)).toBe('moderate');
            expect(ComplexityCalculator.getRating(21)).toBe('high');
        });

        it('should handle flow with no decision points', () => {
            const flow = getFlowNode(`
                <logger message="test"/>
                <set-variable variableName="x" value="1"/>
            `);
            const complexityResult = ComplexityCalculator.calculateFlowComplexity(flow);
            expect(complexityResult.complexity).toBe(1); // Just base complexity
            expect(complexityResult.rating).toBe('low');
            expect(complexityResult.details).toHaveLength(0);
        });
    });

    // =================================================================
    // Cognitive Complexity Tests
    // =================================================================
    describe('Cognitive Complexity', () => {
        const getFlowNode = (flowContent: string): Node => {
            const xml = `
                <mule xmlns="http://www.mulesoft.org/schema/mule/core">
                    <flow name="test-flow">
                        ${flowContent}
                    </flow>
                </mule>
            `;
            const result = parseXml(xml);
            const xpath = require('xpath');
            const select = xpath.useNamespaces({
                mule: 'http://www.mulesoft.org/schema/mule/core',
            });
            return select('//mule:flow', result.document!)[0] as Node;
        };

        it('should calculate cognitive complexity for simple flow', () => {
            const flow = getFlowNode(`<logger/>`);
            const result = ComplexityCalculator.calculateCognitiveComplexity(flow);
            expect(result.cognitiveComplexity).toBe(0); // No nesting structures
            expect(result.rating).toBe('low');
        });

        it('should add 1 for each top-level control structure', () => {
            const flow = getFlowNode(`
                <choice><when expression="#[a]"><logger/></when><otherwise><logger/></otherwise></choice>
                <foreach><logger/></foreach>
            `);
            const result = ComplexityCalculator.calculateCognitiveComplexity(flow);
            // 1 for choice + 1 for foreach = 2
            expect(result.cognitiveComplexity).toBe(2);
        });

        it('should add nesting increment for nested structures', () => {
            const flow = getFlowNode(`
                <choice>
                    <when expression="#[a]">
                        <foreach>
                            <logger/>
                        </foreach>
                    </when>
                    <otherwise><logger/></otherwise>
                </choice>
            `);
            const result = ComplexityCalculator.calculateCognitiveComplexity(flow);
            // choice at depth 0 = 1 + 0 = 1
            // foreach at depth 1 (inside choice) = 1 + 1 = 2
            // Total = 3
            expect(result.cognitiveComplexity).toBe(3);
        });

        it('should handle deeply nested structures', () => {
            const flow = getFlowNode(`
                <try>
                    <choice>
                        <when expression="#[a]">
                            <foreach>
                                <async><logger/></async>
                            </foreach>
                        </when>
                        <otherwise><logger/></otherwise>
                    </choice>
                    <error-handler>
                        <on-error-continue><logger/></on-error-continue>
                    </error-handler>
                </try>
            `);
            const result = ComplexityCalculator.calculateCognitiveComplexity(flow);
            // try at depth 0 = 1
            // choice at depth 1 = 2
            // foreach at depth 2 = 3
            // async at depth 3 = 4
            // on-error-continue at depth 1 = 2
            // Total = 12
            expect(result.cognitiveComplexity).toBe(12);
            expect(result.rating).toBe('moderate');
        });

        it('should return correct cognitive rating thresholds', () => {
            expect(ComplexityCalculator.getCognitiveRating(0)).toBe('low');
            expect(ComplexityCalculator.getCognitiveRating(8)).toBe('low');
            expect(ComplexityCalculator.getCognitiveRating(9)).toBe('moderate');
            expect(ComplexityCalculator.getCognitiveRating(15)).toBe('moderate');
            expect(ComplexityCalculator.getCognitiveRating(16)).toBe('high');
        });
    });
});
