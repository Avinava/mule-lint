import { Java17DWErrorHandlingRule } from '../../../src/rules/dataweave/Java17DWErrorHandlingRule';
import { DOMParser } from '@xmldom/xmldom';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn()
}));

// Import fs after mocking
import * as fs from 'fs';

// Mock validation context
const mockContext = {
    projectRoot: '/mock/project/root',
    config: {},
    isMuleApp: true
};

describe('Java17DWErrorHandlingRule', () => {
    let rule: Java17DWErrorHandlingRule;
    const parser = new DOMParser();

    beforeEach(() => {
        rule = new Java17DWErrorHandlingRule();
        jest.clearAllMocks();

        // Default mocks
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readdirSync as jest.Mock).mockReturnValue([]);
    });

    afterEach(() => {

    });

    test('should report error for error.description in inline script', () => {
        const xml = `
            <mule xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
                <flow name="testFlow">
                    <ee:transform>
                        <ee:message>
                            <ee:set-payload><![CDATA[
                                %dw 2.0
                                output application/json
                                ---
                                {
                                    msg: error.description
                                }
                            ]]></ee:set-payload>
                        </ee:message>
                    </ee:transform>
                </flow>
            </mule>
        `;
        const doc = parser.parseFromString(xml, 'text/xml');
        const issues = rule.validate(doc, mockContext as any);

        expect(issues.length).toBe(1);
        expect(issues[0].message).toContain('Accessing "error.description" is restricted in Java 17');
        expect(issues[0].suggestion).toContain('error.detailedDescription');
    });

    test('should report error for error.errorType.asString in inline script', () => {
        const xml = `
            <mule xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
                <flow name="testFlow">
                    <ee:transform>
                        <ee:variables>
                            <ee:set-variable variableName="myVar"><![CDATA[
                                error.errorType.asString
                            ]]></ee:set-variable>
                        </ee:variables>
                    </ee:transform>
                </flow>
            </mule>
        `;
        const doc = parser.parseFromString(xml, 'text/xml');
        const issues = rule.validate(doc, mockContext as any);

        expect(issues.length).toBe(1);
        expect(issues[0].message).toContain('Accessing "error.errorType.asString" is restricted in Java 17');
    });

    test('should report error for error.muleMessage in when attribute', () => {
        const xml = `
            <mule>
                <flow name="testFlow">
                    <error-handler>
                        <on-error-continue when="error.muleMessage != null">
                            <logger/>
                        </on-error-continue>
                    </error-handler>
                </flow>
            </mule>
        `;
        const doc = parser.parseFromString(xml, 'text/xml');
        const issues = rule.validate(doc, mockContext as any);

        expect(issues.length).toBe(1);
        expect(issues[0].message).toContain('Accessing "error.muleMessage" is restricted in Java 17');
    });

    test('should report error for error.errors in external file', () => {
        // Mock file system for external DWL
        const mockDwlContent = `
            %dw 2.0
            output application/json
            ---
            error.errors map (e) -> e
        `;

        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readdirSync as jest.Mock).mockReturnValue([
            { name: 'test.dwl', isDirectory: () => false } as any
        ]);
        (fs.readFileSync as jest.Mock).mockReturnValue(mockDwlContent);

        const doc = parser.parseFromString('<mule/>', 'text/xml');
        const issues = rule.validate(doc, mockContext as any);

        expect(issues.length).toBe(1);
        expect(issues[0].message).toContain('Accessing "error.errors" is restricted in Java 17');
        expect(issues[0].message).toContain('test.dwl');
    });

    test('should pass for valid usage', () => {
        const xml = `
            <mule xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
                <flow name="testFlow">
                    <ee:transform>
                        <ee:message>
                            <ee:set-payload><![CDATA[
                                %dw 2.0
                                output application/json
                                ---
                                {
                                    msg: error.detailedDescription,
                                    child: error.childErrors,
                                    msg2: error.errorMessage
                                }
                            ]]></ee:set-payload>
                        </ee:message>
                    </ee:transform>
                </flow>
            </mule>
        `;
        const doc = parser.parseFromString(xml, 'text/xml');
        const issues = rule.validate(doc, mockContext as any);

        expect(issues.length).toBe(0);
    });
});
