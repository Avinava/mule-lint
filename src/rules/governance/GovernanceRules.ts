import { Issue, ValidationContext } from '../../types';
import { ProjectRule } from '../base/ProjectRule';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PROJ-001: POM Validation
 *
 * Validates pom.xml existence and critical plugins.
 */
export class PomValidationRule extends ProjectRule {
    id = 'PROJ-001';
    name = 'POM Validation';
    description = 'Validates pom.xml existence and content';
    severity = 'error' as const;
    category = 'structure' as const;

    validateProject(context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        const pomPath = path.join(context.projectRoot, 'pom.xml');

        if (!fs.existsSync(pomPath)) {
            issues.push(
                this.createProjectIssue('Missing pom.xml file in project root', {
                    severity: 'error',
                }),
            );
            return issues;
        }

        // Basic content check (simple string matching to avoid heavy XML parsing dependency if not needed)
        // In a real implementation, we might want to parse the XML, but for now string matching is faster/sufficient
        // for these specific checks.
        try {
            const content = fs.readFileSync(pomPath, 'utf-8');

            // Check for mule-maven-plugin
            if (!content.includes('mule-maven-plugin')) {
                issues.push(
                    this.createProjectIssue('Missing mule-maven-plugin in pom.xml', {
                        severity: 'error',
                        suggestion: 'Add mule-maven-plugin to build configuration',
                    }),
                );
            }

            // Check for MUnit plugin if there are test files
            const hasTests = this.hasTestFiles(context.projectRoot);
            if (hasTests && !content.includes('munit-maven-plugin')) {
                issues.push(
                    this.createProjectIssue('Missing munit-maven-plugin but test files exist', {
                        severity: 'warning',
                        suggestion: 'Add munit-maven-plugin to run tests',
                    }),
                );
            }
        } catch (error) {
            issues.push(
                this.createProjectIssue(`Error reading pom.xml: ${error}`, {
                    severity: 'warning',
                }),
            );
        }

        return issues;
    }

    private hasTestFiles(root: string): boolean {
        const testPath = path.join(root, 'src', 'test', 'munit');
        return fs.existsSync(testPath) && fs.readdirSync(testPath).length > 0;
    }
}

/**
 * PROJ-002: Git Hygiene
 *
 * Validates .gitignore existence and standard entries.
 */
export class GitHygieneRule extends ProjectRule {
    id = 'PROJ-002';
    name = 'Git Hygiene';
    description = 'Validates .gitignore existence and content';
    severity = 'warning' as const;
    category = 'structure' as const;

    validateProject(context: ValidationContext): Issue[] {
        const issues: Issue[] = [];
        const gitIgnorePath = path.join(context.projectRoot, '.gitignore');

        if (!fs.existsSync(gitIgnorePath)) {
            // Check if it's a git repo first to avoid noise in non-git folders
            if (fs.existsSync(path.join(context.projectRoot, '.git'))) {
                issues.push(
                    this.createProjectIssue('Missing .gitignore file in git repository', {
                        severity: 'warning',
                    }),
                );
            }
            return issues;
        }

        try {
            const content = fs.readFileSync(gitIgnorePath, 'utf-8');
            const lines = content.split('\n').map((l) => l.trim());

            const requiredEntries = ['target/', '.project', '.classpath', '.tooling-project'];
            const missingEntries = requiredEntries.filter(
                (entry) => !lines.some((line) => line.startsWith(entry) || line === entry),
            );

            if (missingEntries.length > 0) {
                issues.push(
                    this.createProjectIssue(
                        `Missing standard .gitignore entries: ${missingEntries.join(', ')}`,
                        {
                            severity: 'info',
                            suggestion: 'Add standard Mule/Java ignore patterns',
                        },
                    ),
                );
            }
        } catch (error) {
            issues.push(
                this.createProjectIssue(`Error reading .gitignore: ${error}`, {
                    severity: 'warning',
                }),
            );
        }

        return issues;
    }
}
