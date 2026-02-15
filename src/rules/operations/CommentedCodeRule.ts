import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * HYG-002: Commented Code Detection
 *
 * Detects potentially commented-out code blocks in Mule configurations.
 */
export class CommentedCodeRule extends BaseRule {
    id = 'HYG-002';
    name = 'Commented Code Detection';
    description = 'Detects potentially commented-out code in configurations';
    severity = 'info' as const;
    category = 'standards' as const;

    // Patterns that suggest commented-out XML code
    private codePatterns = [
        /<flow\s/,
        /<sub-flow\s/,
        /<http:/,
        /<logger\s/,
        /<set-variable\s/,
        /<set-payload\s/,
        /<choice>/,
        /<transform\s/,
        /<flow-ref\s/,
        /<try>/,
        /<db:/,
    ];

    validate(doc: Document, _context: ValidationContext): Issue[] {
        const issues: Issue[] = [];

        // Use XPath to find comment nodes: comment()
        // Note: In xmldom, we need to iterate through the document differently
        try {
            const commentNodes = this.select('//comment()', doc);

            for (const commentNode of commentNodes) {
                const commentText = commentNode.textContent ?? '';

                // Check if comment contains code-like patterns
                for (const pattern of this.codePatterns) {
                    if (pattern.test(commentText)) {
                        issues.push(
                            this.createIssue(commentNode, 'Commented-out code detected', {
                                suggestion:
                                    'Remove commented code or convert to documentation comment',
                                codeSnippet: commentText.substring(0, 80) + '...',
                            }),
                        );
                        break;
                    }
                }
            }
        } catch {
            // XPath comment() may not be supported in all parsers
            // Silently return empty issues
        }

        return issues;
    }
}
