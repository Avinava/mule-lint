// Export base rule
export * from './base/BaseRule';

// Import all rules
import { GlobalErrorHandlerRule } from './error-handling/GlobalErrorHandlerRule';
import { MissingErrorHandlerRule } from './error-handling/MissingErrorHandlerRule';
import { HttpStatusRule } from './error-handling/HttpStatusRule';
import { CorrelationIdRule } from './error-handling/CorrelationIdRule';
import { GenericErrorRule } from './error-handling/GenericErrorRule';
import { FlowNamingRule } from './naming/FlowNamingRule';
import { HardcodedHttpRule } from './security/HardcodedHttpRule';
import { LoggerCategoryRule } from './logging/LoggerCategoryRule';
import { ChoiceAntiPatternRule } from './standards/ChoiceAntiPatternRule';
import { DwlStandardsRule } from './standards/DwlStandardsRule';

import { Rule } from '../types';

// Export individual rules
export { GlobalErrorHandlerRule } from './error-handling/GlobalErrorHandlerRule';
export { MissingErrorHandlerRule } from './error-handling/MissingErrorHandlerRule';
export { HttpStatusRule } from './error-handling/HttpStatusRule';
export { CorrelationIdRule } from './error-handling/CorrelationIdRule';
export { GenericErrorRule } from './error-handling/GenericErrorRule';
export { FlowNamingRule } from './naming/FlowNamingRule';
export { HardcodedHttpRule } from './security/HardcodedHttpRule';
export { LoggerCategoryRule } from './logging/LoggerCategoryRule';
export { ChoiceAntiPatternRule } from './standards/ChoiceAntiPatternRule';
export { DwlStandardsRule } from './standards/DwlStandardsRule';

/**
 * All available rules - instantiated and ready to use
 */
export const ALL_RULES: Rule[] = [
    // Error Handling Rules
    new GlobalErrorHandlerRule(),
    new MissingErrorHandlerRule(),
    new HttpStatusRule(),
    new CorrelationIdRule(),
    new GenericErrorRule(),

    // Naming Rules
    new FlowNamingRule(),

    // Security Rules
    new HardcodedHttpRule(),

    // Logging Rules
    new LoggerCategoryRule(),

    // Standards Rules
    new ChoiceAntiPatternRule(),
    new DwlStandardsRule(),
];

/**
 * Get rules by category
 */
export function getRulesByCategory(category: string): Rule[] {
    return ALL_RULES.filter(rule => rule.category === category);
}

/**
 * Get rule by ID
 */
export function getRuleById(id: string): Rule | undefined {
    return ALL_RULES.find(rule => rule.id === id);
}

/**
 * Get all rule IDs
 */
export function getAllRuleIds(): string[] {
    return ALL_RULES.map(rule => rule.id);
}
