import { PomValidationRule, GitHygieneRule } from '../../src/rules/governance/GovernanceRules';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');

const createContext = (root: string) => ({
    filePath: 'pom.xml',
    relativePath: 'pom.xml',
    projectRoot: root,
    config: { enabled: true, options: {} },
    allFiles: [],
    yamlFiles: {},
});

describe('Governance Rules', () => {
    const mockRoot = '/test/project';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('PomValidationRule (PROJ-001)', () => {
        const rule = new PomValidationRule();

        it('should fail if pom.xml is missing', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const issues = rule.validateProject(createContext(mockRoot));

            expect(issues.length).toBe(1);
            expect(issues[0].message).toContain('Missing pom.xml');
            expect(fs.existsSync).toHaveBeenCalledWith(path.join(mockRoot, 'pom.xml'));
        });

        it('should fail if mule-maven-plugin is missing', () => {
            (fs.existsSync as jest.Mock).mockImplementation((pathStr: string) => {
                if (pathStr.includes('src/test/munit')) return false; // No tests
                return true; // pom.xml exists
            });
            (fs.readFileSync as jest.Mock).mockReturnValue('<project></project>');

            const issues = rule.validateProject(createContext(mockRoot));

            expect(issues.length).toBe(1);
            expect(issues[0].message).toContain('Missing mule-maven-plugin');
        });

        it('should fail if tests exist but munit-maven-plugin is missing', () => {
            (fs.existsSync as jest.Mock).mockImplementation((pathStr: string) => {
                if (pathStr.includes('src/test/munit')) return true;
                return true;
            });
            (fs.readdirSync as jest.Mock).mockReturnValue(['test.xml']);
            (fs.readFileSync as jest.Mock).mockReturnValue('<project>mule-maven-plugin</project>');

            const issues = rule.validateProject(createContext(mockRoot));

            expect(issues.length).toBe(1);
            expect(issues[0].message).toContain('Missing munit-maven-plugin');
        });

        it('should pass for valid pom.xml', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(
                '<project>mule-maven-plugin munit-maven-plugin</project>',
            );

            const issues = rule.validateProject(createContext(mockRoot));

            expect(issues.length).toBe(0);
        });
    });

    describe('GitHygieneRule (PROJ-002)', () => {
        const rule = new GitHygieneRule();

        it('should fail if .gitignore is missing in git repo', () => {
            (fs.existsSync as jest.Mock).mockImplementation((pathStr: string) => {
                if (pathStr.endsWith('.git')) return true;
                return false;
            });

            const issues = rule.validateProject(createContext(mockRoot));

            expect(issues.length).toBe(1);
            expect(issues[0].message).toContain('Missing .gitignore');
        });

        it('should ignore non-git repositories', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const issues = rule.validateProject(createContext(mockRoot));

            expect(issues.length).toBe(0);
        });

        it('should fail if standard entries are missing', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('node_modules/');

            const issues = rule.validateProject(createContext(mockRoot));

            expect(issues.length).toBe(1);
            expect(issues[0].message).toContain('Missing standard .gitignore entries');
            expect(issues[0].message).toContain('target/');
        });

        it('should pass for valid .gitignore', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(
                'target/\n.project\n.classpath\n.tooling-project',
            );

            const issues = rule.validateProject(createContext(mockRoot));

            expect(issues.length).toBe(0);
        });
    });
});
