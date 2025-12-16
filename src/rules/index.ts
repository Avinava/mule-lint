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
import { HttpContentTypeRule } from './http/HttpContentTypeRule';
import { HttpTimeoutRule } from './http/HttpTimeoutRule';

// Import all rules - Documentation
import { FlowDescriptionRule } from './documentation/FlowDescriptionRule';
import { MissingDocNameRule } from './documentation/MissingDocNameRule';

// Import all rules - Performance
import { ScatterGatherRoutesRule } from './performance/ScatterGatherRoutesRule';
import { AsyncErrorHandlerRule } from './performance/AsyncErrorHandlerRule';
import { LargeChoiceBlockRule } from './performance/LargeChoiceBlockRule';

// Import all rules - Complexity
import { FlowComplexityRule } from './complexity/FlowComplexityRule';

// Import all rules - YAML
import { EnvironmentFilesRule, PropertyNamingRule, PlaintextSecretsRule } from './yaml/YamlRules';

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
export { HttpContentTypeRule } from './http/HttpContentTypeRule';
export { HttpTimeoutRule } from './http/HttpTimeoutRule';

// Export individual rules - Documentation
export { FlowDescriptionRule } from './documentation/FlowDescriptionRule';
export { MissingDocNameRule } from './documentation/MissingDocNameRule';

// Export individual rules - Performance
export { ScatterGatherRoutesRule } from './performance/ScatterGatherRoutesRule';
export { AsyncErrorHandlerRule } from './performance/AsyncErrorHandlerRule';
export { LargeChoiceBlockRule } from './performance/LargeChoiceBlockRule';

/**
 * All available rules - instantiated and ready to use
 * Total: 25 rules
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

    // HTTP Rules (MULE-401, 402, 403)
    new HttpUserAgentRule(),
    new HttpContentTypeRule(),
    new HttpTimeoutRule(),

    // Documentation Rules (MULE-601, 604)
    new FlowDescriptionRule(),
    new MissingDocNameRule(),

    // Performance Rules (MULE-501, 502, 503)
    new ScatterGatherRoutesRule(),
    new AsyncErrorHandlerRule(),
    new LargeChoiceBlockRule(),

    // Complexity Rules (MULE-801)
    new FlowComplexityRule(),

    // YAML Rules (YAML-001, 003, 004)
    new EnvironmentFilesRule(),
    new PropertyNamingRule(),
    new PlaintextSecretsRule(),
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
