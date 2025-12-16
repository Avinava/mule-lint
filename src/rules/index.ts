// Export base rule
export * from './base/BaseRule';

// Import all rules - Error Handling
import { GlobalErrorHandlerRule } from './error-handling/GlobalErrorHandlerRule';
import { MissingErrorHandlerRule } from './error-handling/MissingErrorHandlerRule';
import { HttpStatusRule } from './error-handling/HttpStatusRule';
import { CorrelationIdRule } from './error-handling/CorrelationIdRule';
import { GenericErrorRule } from './error-handling/GenericErrorRule';

// Import all rules - Naming
import { FlowNamingRule } from './naming/FlowNamingRule';
import { FlowCasingRule } from './naming/FlowCasingRule';
import { VariableNamingRule } from './naming/VariableNamingRule';

// Import all rules - Security
import { HardcodedHttpRule } from './security/HardcodedHttpRule';
import { HardcodedCredentialsRule } from './security/HardcodedCredentialsRule';
import { InsecureTlsRule } from './security/InsecureTlsRule';

// Import all rules - Logging
import { LoggerCategoryRule } from './logging/LoggerCategoryRule';
import { LoggerPayloadRule } from './logging/LoggerPayloadRule';
import { LoggerInUntilSuccessfulRule } from './logging/LoggerInUntilSuccessfulRule';

// Import all rules - Standards
import { ChoiceAntiPatternRule } from './standards/ChoiceAntiPatternRule';
import { DwlStandardsRule } from './standards/DwlStandardsRule';
import { DeprecatedComponentRule } from './standards/DeprecatedComponentRule';

// Import all rules - HTTP
import { HttpUserAgentRule } from './http/HttpUserAgentRule';

// Import all rules - Documentation
import { FlowDescriptionRule } from './documentation/FlowDescriptionRule';

// Import all rules - Performance
import { ScatterGatherRoutesRule } from './performance/ScatterGatherRoutesRule';
import { AsyncErrorHandlerRule } from './performance/AsyncErrorHandlerRule';

import { Rule } from '../types';

// Export individual rules - Error Handling
export { GlobalErrorHandlerRule } from './error-handling/GlobalErrorHandlerRule';
export { MissingErrorHandlerRule } from './error-handling/MissingErrorHandlerRule';
export { HttpStatusRule } from './error-handling/HttpStatusRule';
export { CorrelationIdRule } from './error-handling/CorrelationIdRule';
export { GenericErrorRule } from './error-handling/GenericErrorRule';

// Export individual rules - Naming
export { FlowNamingRule } from './naming/FlowNamingRule';
export { FlowCasingRule } from './naming/FlowCasingRule';
export { VariableNamingRule } from './naming/VariableNamingRule';

// Export individual rules - Security
export { HardcodedHttpRule } from './security/HardcodedHttpRule';
export { HardcodedCredentialsRule } from './security/HardcodedCredentialsRule';
export { InsecureTlsRule } from './security/InsecureTlsRule';

// Export individual rules - Logging
export { LoggerCategoryRule } from './logging/LoggerCategoryRule';
export { LoggerPayloadRule } from './logging/LoggerPayloadRule';
export { LoggerInUntilSuccessfulRule } from './logging/LoggerInUntilSuccessfulRule';

// Export individual rules - Standards
export { ChoiceAntiPatternRule } from './standards/ChoiceAntiPatternRule';
export { DwlStandardsRule } from './standards/DwlStandardsRule';
export { DeprecatedComponentRule } from './standards/DeprecatedComponentRule';

// Export individual rules - HTTP
export { HttpUserAgentRule } from './http/HttpUserAgentRule';

// Export individual rules - Documentation
export { FlowDescriptionRule } from './documentation/FlowDescriptionRule';

// Export individual rules - Performance
export { ScatterGatherRoutesRule } from './performance/ScatterGatherRoutesRule';
export { AsyncErrorHandlerRule } from './performance/AsyncErrorHandlerRule';

/**
 * All available rules - instantiated and ready to use
 */
export const ALL_RULES: Rule[] = [
    // Error Handling Rules (MULE-001, 003, 005, 007, 009)
    new GlobalErrorHandlerRule(),
    new MissingErrorHandlerRule(),
    new HttpStatusRule(),
    new CorrelationIdRule(),
    new GenericErrorRule(),

    // Naming Rules (MULE-002, 101, 102)
    new FlowNamingRule(),
    new FlowCasingRule(),
    new VariableNamingRule(),

    // Security Rules (MULE-004, 201, 202)
    new HardcodedHttpRule(),
    new HardcodedCredentialsRule(),
    new InsecureTlsRule(),

    // Logging Rules (MULE-006, 301, 303)
    new LoggerCategoryRule(),
    new LoggerPayloadRule(),
    new LoggerInUntilSuccessfulRule(),

    // Standards Rules (MULE-008, 010, 701)
    new ChoiceAntiPatternRule(),
    new DwlStandardsRule(),
    new DeprecatedComponentRule(),

    // HTTP Rules (MULE-401)
    new HttpUserAgentRule(),

    // Documentation Rules (MULE-601)
    new FlowDescriptionRule(),

    // Performance Rules (MULE-501, 502)
    new ScatterGatherRoutesRule(),
    new AsyncErrorHandlerRule(),
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
