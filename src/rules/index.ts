// Export base rules
export * from './base/BaseRule';
export * from './base/ProjectRule';

// Import all rules - Error Handling
import { GlobalErrorHandlerRule } from './error-handling/GlobalErrorHandlerRule';
import { MissingErrorHandlerRule } from './error-handling/MissingErrorHandlerRule';
import { HttpStatusRule } from './error-handling/HttpStatusRule';
import { CorrelationIdRule } from './error-handling/CorrelationIdRule';
import { GenericErrorRule } from './error-handling/GenericErrorRule';
import { TryScopeRule } from './error-handling/TryScopeRule';
import { ErrorHandlerTypeCoverageRule } from './error-handling/ErrorHandlerTypeCoverageRule';
import { ErrorResponseStructureRule } from './error-handling/ErrorResponseStructureRule';
import { CatchAllLastRule } from './error-handling/CatchAllLastRule';

// Import all rules - Naming
import { FlowNamingRule } from './naming/FlowNamingRule';
import { FlowCasingRule } from './naming/FlowCasingRule';
import { VariableNamingRule } from './naming/VariableNamingRule';

// Import all rules - Security
import { HardcodedHttpRule } from './security/HardcodedHttpRule';
import { HardcodedCredentialsRule } from './security/HardcodedCredentialsRule';
import { InsecureTlsRule } from './security/InsecureTlsRule';
import { TlsVersionRule } from './security/TlsVersionRule';
import { RateLimitingRule } from './security/RateLimitingRule';
import { InputValidationRule } from './security/InputValidationRule';
import { EncryptionKeyInLogsRule } from './security/EncryptionKeyInLogsRule';
import { ConnectorCredentialsSecuredRule } from './security/ConnectorCredentialsSecuredRule';
import { SecurePropertiesKeyRule } from './security/SecurePropertiesKeyRule';
import { TlsKeystorePasswordRule } from './security/TlsKeystorePasswordRule';
import { SecurePropertiesEncryptionRule } from './security/SecurePropertiesEncryptionRule';
import { PlaintextPropertiesSecretsRule } from './standards/PlaintextPropertiesSecretsRule';
import { SecurePropertiesModuleRule } from './security/SecurePropertiesModuleRule';
import { HttpsEnforcementRule } from './security/HttpsEnforcementRule';
import { TlsContextRequiredRule } from './security/TlsContextRequiredRule';
import { BasicAuthenticationRule } from './security/BasicAuthenticationRule';
import { CorsPolicyEvidenceRule } from './security/CorsPolicyEvidenceRule';
import { InboundAuthenticationEvidenceRule } from './security/InboundAuthenticationEvidenceRule';
import { ApiSpecificationPresentRule } from './api-led/ApiSpecificationPresentRule';
import { VersionedApiPathRule } from './api-led/VersionedApiPathRule';
import { HealthEndpointRule } from './api-led/HealthEndpointRule';
import { ListenerResponseContentTypeRule } from './http/ListenerResponseContentTypeRule';
import { FlowLoggingRule } from './logging/FlowLoggingRule';
import { BatchResourceConfigRule } from './performance/BatchResourceConfigRule';
import { SchedulerModeRule } from './operations/SchedulerModeRule';
import { MessagingIdempotencyRule } from './operations/MessagingIdempotencyRule';
import { OversizedFlowRule } from './complexity/OversizedFlowRule';

// Import all rules - Logging
import { LoggerCategoryRule } from './logging/LoggerCategoryRule';
import { LoggerPayloadRule } from './logging/LoggerPayloadRule';
import { LoggerInUntilSuccessfulRule } from './logging/LoggerInUntilSuccessfulRule';
import { StructuredLoggingRule, SensitiveDataLoggingRule } from './logging/LoggingPatternRules';
import { ExcessiveLoggersRule } from './logging/ExcessiveLoggersRule';

// Import all rules - Standards
import { ChoiceAntiPatternRule } from './standards/ChoiceAntiPatternRule';
import { DwlStandardsRule } from './standards/DwlStandardsRule';
import { DeprecatedComponentRule } from './standards/DeprecatedComponentRule';
import { AutoDiscoveryRule } from './standards/AutoDiscoveryRule';
import { HttpPortPlaceholderRule } from './standards/HttpPortPlaceholderRule';
import { CronExternalizedRule } from './standards/CronExternalizedRule';
import { ApiKitValidationRule } from './standards/ApiKitValidationRule';
import { ConfigPropertiesOrderingRule } from './standards/ConfigPropertiesOrderingRule';
import { MissingEnvPropertiesDeclarationRule } from './standards/MissingEnvPropertiesDeclarationRule';
import { ApikitRouteVariableConsistencyRule } from './standards/ApikitRouteVariableConsistencyRule';

// Import all rules - HTTP
import { HttpUserAgentRule } from './http/HttpUserAgentRule';
import { HttpContentTypeRule } from './http/HttpContentTypeRule';
import { HttpTimeoutRule } from './http/HttpTimeoutRule';
import { ConnectionIdleTimeoutRule } from './http/ConnectionIdleTimeoutRule';

// Import all rules - Connector
import { ReplayChannelConfigRule } from './connector/ReplayChannelConfigRule';
import { EventListenerNullGuardRule } from './connector/EventListenerNullGuardRule';

// Import all rules - Documentation
import { FlowDescriptionRule } from './documentation/FlowDescriptionRule';
import { MissingDocNameRule } from './documentation/MissingDocNameRule';
import { DisplayNameRule } from './documentation/DisplayNameRule';

// Import all rules - Performance
import { ScatterGatherRoutesRule } from './performance/ScatterGatherRoutesRule';
import { AsyncErrorHandlerRule } from './performance/AsyncErrorHandlerRule';
import { LargeChoiceBlockRule } from './performance/LargeChoiceBlockRule';
import { ConnectionPoolingRule } from './performance/ConnectionPoolingRule';
import { ReconnectionStrategyRule } from './performance/ReconnectionStrategyRule';
import { ListenerReconnectForeverRule } from './performance/ListenerReconnectForeverRule';

// Import all rules - Complexity
import { FlowComplexityRule } from './complexity/FlowComplexityRule';

// Import all rules - YAML
import { EnvironmentFilesRule, PropertyNamingRule, PlaintextSecretsRule } from './yaml/YamlRules';

// Import all rules - Structure
import {
  ProjectStructureRule,
  GlobalConfigRule,
  MonolithicXmlRule,
} from './structure/StructureRules';

// Import all rules - DataWeave
import { ExternalDwlRule, DwlNamingRule, DwlModulesRule } from './dataweave/DataWeaveRules';
import { Java17DWErrorHandlingRule } from './dataweave/Java17DWErrorHandlingRule';
import { DuplicateTransformLogicRule } from './dataweave/DuplicateTransformLogicRule';

// Import all rules - API-Led
import { ExperienceLayerRule, ProcessLayerRule, SystemLayerRule } from './api-led/ApiLedRules';
import { SingleSystemSapiRule } from './api-led/SingleSystemSapiRule';
import { ApikitMainFlowStructureRule } from './api-led/ApikitMainFlowStructureRule';
import { ApikitStatusCodeVariableRule } from './api-led/ApikitStatusCodeVariableRule';
import { ApikitConsoleProductionRule } from './api-led/ApikitConsoleProductionRule';

// Import all rules - Experimental
import {
  FlowRefDepthRule,
  ConnectorConfigNamingRule,
  MUnitCoverageRule,
} from './experimental/ExperimentalRules';

// Import all rules - Operations & Hygiene
import { CommentedCodeRule } from './operations/CommentedCodeRule';
import { UnusedFlowRule } from './operations/UnusedFlowRule';
import { FlowRefTargetExistsRule } from './operations/FlowRefTargetExistsRule';
import { UnusedVariableRule } from './operations/UnusedVariableRule';

// Import all rules - Governance
import { PomValidationRule, GitHygieneRule } from './governance/GovernanceRules';

import { Rule } from '../types';

// Export individual rules - Error Handling
export { GlobalErrorHandlerRule } from './error-handling/GlobalErrorHandlerRule';
export { MissingErrorHandlerRule } from './error-handling/MissingErrorHandlerRule';
export { HttpStatusRule } from './error-handling/HttpStatusRule';
export { CorrelationIdRule } from './error-handling/CorrelationIdRule';
export { GenericErrorRule } from './error-handling/GenericErrorRule';
export { TryScopeRule } from './error-handling/TryScopeRule';
export { ErrorHandlerTypeCoverageRule } from './error-handling/ErrorHandlerTypeCoverageRule';
export { ErrorResponseStructureRule } from './error-handling/ErrorResponseStructureRule';
export { CatchAllLastRule } from './error-handling/CatchAllLastRule';

// Export individual rules - Naming
export { FlowNamingRule } from './naming/FlowNamingRule';
export { FlowCasingRule } from './naming/FlowCasingRule';
export { VariableNamingRule } from './naming/VariableNamingRule';

// Export individual rules - Security
export { HardcodedHttpRule } from './security/HardcodedHttpRule';
export { HardcodedCredentialsRule } from './security/HardcodedCredentialsRule';
export { InsecureTlsRule } from './security/InsecureTlsRule';
export { TlsVersionRule } from './security/TlsVersionRule';
export { RateLimitingRule } from './security/RateLimitingRule';
export { InputValidationRule } from './security/InputValidationRule';
export { EncryptionKeyInLogsRule } from './security/EncryptionKeyInLogsRule';
export { ConnectorCredentialsSecuredRule } from './security/ConnectorCredentialsSecuredRule';
export { SecurePropertiesKeyRule } from './security/SecurePropertiesKeyRule';
export { TlsKeystorePasswordRule } from './security/TlsKeystorePasswordRule';
export { SecurePropertiesEncryptionRule } from './security/SecurePropertiesEncryptionRule';
export { PlaintextPropertiesSecretsRule } from './standards/PlaintextPropertiesSecretsRule';
export { SecurePropertiesModuleRule } from './security/SecurePropertiesModuleRule';
export { HttpsEnforcementRule } from './security/HttpsEnforcementRule';
export { TlsContextRequiredRule } from './security/TlsContextRequiredRule';
export { BasicAuthenticationRule } from './security/BasicAuthenticationRule';
export { CorsPolicyEvidenceRule } from './security/CorsPolicyEvidenceRule';
export { InboundAuthenticationEvidenceRule } from './security/InboundAuthenticationEvidenceRule';
export { ApiSpecificationPresentRule } from './api-led/ApiSpecificationPresentRule';
export { VersionedApiPathRule } from './api-led/VersionedApiPathRule';
export { HealthEndpointRule } from './api-led/HealthEndpointRule';
export { ListenerResponseContentTypeRule } from './http/ListenerResponseContentTypeRule';
export { FlowLoggingRule } from './logging/FlowLoggingRule';
export { BatchResourceConfigRule } from './performance/BatchResourceConfigRule';
export { SchedulerModeRule } from './operations/SchedulerModeRule';
export { MessagingIdempotencyRule } from './operations/MessagingIdempotencyRule';
export { OversizedFlowRule } from './complexity/OversizedFlowRule';

// Export individual rules - Logging
export { LoggerCategoryRule } from './logging/LoggerCategoryRule';
export { LoggerPayloadRule } from './logging/LoggerPayloadRule';
export { LoggerInUntilSuccessfulRule } from './logging/LoggerInUntilSuccessfulRule';
export { StructuredLoggingRule, SensitiveDataLoggingRule } from './logging/LoggingPatternRules';
export { ExcessiveLoggersRule } from './logging/ExcessiveLoggersRule';

// Export individual rules - Standards
export { ChoiceAntiPatternRule } from './standards/ChoiceAntiPatternRule';
export { DwlStandardsRule } from './standards/DwlStandardsRule';
export { DeprecatedComponentRule } from './standards/DeprecatedComponentRule';
export { AutoDiscoveryRule } from './standards/AutoDiscoveryRule';
export { HttpPortPlaceholderRule } from './standards/HttpPortPlaceholderRule';
export { CronExternalizedRule } from './standards/CronExternalizedRule';
export { ApiKitValidationRule } from './standards/ApiKitValidationRule';
export { ConfigPropertiesOrderingRule } from './standards/ConfigPropertiesOrderingRule';
export { MissingEnvPropertiesDeclarationRule } from './standards/MissingEnvPropertiesDeclarationRule';
export { ApikitRouteVariableConsistencyRule } from './standards/ApikitRouteVariableConsistencyRule';

// Export individual rules - HTTP
export { HttpUserAgentRule } from './http/HttpUserAgentRule';
export { HttpContentTypeRule } from './http/HttpContentTypeRule';
export { HttpTimeoutRule } from './http/HttpTimeoutRule';
export { ConnectionIdleTimeoutRule } from './http/ConnectionIdleTimeoutRule';

// Export individual rules - Connectors
export { ReplayChannelConfigRule } from './connector/ReplayChannelConfigRule';
export { EventListenerNullGuardRule } from './connector/EventListenerNullGuardRule';

// Export individual rules - Documentation
export { FlowDescriptionRule } from './documentation/FlowDescriptionRule';
export { MissingDocNameRule } from './documentation/MissingDocNameRule';
export { DisplayNameRule } from './documentation/DisplayNameRule';

// Export individual rules - Performance
export { ScatterGatherRoutesRule } from './performance/ScatterGatherRoutesRule';
export { AsyncErrorHandlerRule } from './performance/AsyncErrorHandlerRule';
export { LargeChoiceBlockRule } from './performance/LargeChoiceBlockRule';
export { ConnectionPoolingRule } from './performance/ConnectionPoolingRule';
export { ReconnectionStrategyRule } from './performance/ReconnectionStrategyRule';
export { ListenerReconnectForeverRule } from './performance/ListenerReconnectForeverRule';

// Export remaining rule families
export { FlowComplexityRule } from './complexity/FlowComplexityRule';
export { EnvironmentFilesRule, PropertyNamingRule, PlaintextSecretsRule } from './yaml/YamlRules';
export {
  ProjectStructureRule,
  GlobalConfigRule,
  MonolithicXmlRule,
} from './structure/StructureRules';
export { ExternalDwlRule, DwlNamingRule, DwlModulesRule } from './dataweave/DataWeaveRules';
export { Java17DWErrorHandlingRule } from './dataweave/Java17DWErrorHandlingRule';
export { DuplicateTransformLogicRule } from './dataweave/DuplicateTransformLogicRule';
export { ExperienceLayerRule, ProcessLayerRule, SystemLayerRule } from './api-led/ApiLedRules';
export { SingleSystemSapiRule } from './api-led/SingleSystemSapiRule';
export { ApikitMainFlowStructureRule } from './api-led/ApikitMainFlowStructureRule';
export { ApikitStatusCodeVariableRule } from './api-led/ApikitStatusCodeVariableRule';
export { ApikitConsoleProductionRule } from './api-led/ApikitConsoleProductionRule';
export {
  FlowRefDepthRule,
  ConnectorConfigNamingRule,
  MUnitCoverageRule,
} from './experimental/ExperimentalRules';
export { CommentedCodeRule } from './operations/CommentedCodeRule';
export { UnusedFlowRule } from './operations/UnusedFlowRule';
export { FlowRefTargetExistsRule } from './operations/FlowRefTargetExistsRule';
export { UnusedVariableRule } from './operations/UnusedVariableRule';
export { PomValidationRule, GitHygieneRule } from './governance/GovernanceRules';

/**
 * All available rules - instantiated and ready to use
 * Total: 98 rules (including operations, resilience, hygiene, API-led, connector, and code quality rules)
 */
export const ALL_RULES: Rule[] = [
  // Error Handling Rules (MULE-001, 003, 005, 007, 009)
  new GlobalErrorHandlerRule(),
  new MissingErrorHandlerRule(),
  new HttpStatusRule(),
  new CorrelationIdRule(),
  new GenericErrorRule(),
  new TryScopeRule(), // ERR-001: Try Scope Best Practice
  new ErrorHandlerTypeCoverageRule(), // ERR-002: APIKit Error Type Coverage
  new ErrorResponseStructureRule(), // ERR-003: Error Response Structure
  new CatchAllLastRule(), // ERR-004: Catch-All Must Be Last

  // Naming Rules (MULE-002, 101, 102)
  new FlowNamingRule(),
  new FlowCasingRule(),
  new VariableNamingRule(),

  // Security Rules (MULE-004, 201, 202)
  new HardcodedHttpRule(),
  new HardcodedCredentialsRule(),
  new InsecureTlsRule(),
  new TlsVersionRule(), // SEC-002: TLS Version Check
  new RateLimitingRule(), // SEC-003: Rate Limiting
  new InputValidationRule(), // SEC-004: Input Validation

  // Logging Rules (MULE-006, 301, 303)
  new LoggerCategoryRule(),
  new LoggerPayloadRule(),
  new LoggerInUntilSuccessfulRule(),
  new StructuredLoggingRule(), // LOG-001: Structured Logging
  new SensitiveDataLoggingRule(), // LOG-004: Sensitive Data in Logs

  // Standards Rules (MULE-008, 010, 701)
  new ChoiceAntiPatternRule(),
  new DwlStandardsRule(),
  new DeprecatedComponentRule(),

  // HTTP Rules (MULE-401, 402, 403, HTTP-004)
  new HttpUserAgentRule(),
  new HttpContentTypeRule(),
  new HttpTimeoutRule(),
  new ConnectionIdleTimeoutRule(), // HTTP-004: Connection Idle Timeout

  // Documentation Rules (MULE-601, 604)
  new FlowDescriptionRule(),
  new MissingDocNameRule(),

  // Performance Rules (MULE-501, 502, 503)
  new ScatterGatherRoutesRule(),
  new AsyncErrorHandlerRule(),
  new LargeChoiceBlockRule(),
  new ConnectionPoolingRule(), // PERF-002: Connection Pooling

  // Complexity Rules (MULE-801)
  new FlowComplexityRule(),

  // YAML Rules (YAML-001, 003, 004)
  new EnvironmentFilesRule(),
  new PropertyNamingRule(),
  new PlaintextSecretsRule(),

  // Structure Rules (MULE-802, 803, 804)
  new ProjectStructureRule(),
  new GlobalConfigRule(),
  new MonolithicXmlRule(),

  // DataWeave Rules (DW-001, 002, 003, 004, 005)
  new ExternalDwlRule(),
  new DwlNamingRule(),
  new DwlModulesRule(),
  new Java17DWErrorHandlingRule(),
  new DuplicateTransformLogicRule(), // DW-005: Duplicate Transform Logic

  // API-Led Rules (API-001, 002, 003, 004, 006, 007, 008)
  new ExperienceLayerRule(),
  new ProcessLayerRule(),
  new SystemLayerRule(),
  new SingleSystemSapiRule(),
  new ApikitMainFlowStructureRule(), // API-006: APIKit Main Flow Structure
  new ApikitStatusCodeVariableRule(), // API-007: APIKit Status Code Variable
  new ApikitConsoleProductionRule(), // API-008: APIKit Console in Production

  // Experimental Rules (EXP-001, 002, 003)
  new FlowRefDepthRule(),
  new ConnectorConfigNamingRule(),
  new MUnitCoverageRule(),

  // Operations & Resilience Rules (RES-001, RES-002, OPS-001, OPS-002, OPS-003)
  new ReconnectionStrategyRule(),
  new ListenerReconnectForeverRule(), // RES-002: Listener Reconnect-Forever
  new AutoDiscoveryRule(),
  new HttpPortPlaceholderRule(),
  new CronExternalizedRule(),

  // Security Enhancement (SEC-006, SEC-007, SEC-008, SEC-009, SEC-010)
  new EncryptionKeyInLogsRule(),
  new ConnectorCredentialsSecuredRule(),
  new SecurePropertiesKeyRule(),
  new TlsKeystorePasswordRule(),
  new SecurePropertiesEncryptionRule(),

  // Code Hygiene Rules (HYG-001, HYG-002, HYG-003, HYG-004, HYG-005)
  new ExcessiveLoggersRule(),
  new CommentedCodeRule(),
  new UnusedFlowRule(),
  new FlowRefTargetExistsRule(),
  new UnusedVariableRule(), // HYG-005: Unused Variable

  // Additional Standards (API-005, DOC-001, CFG-001, CFG-002, STD-001)
  new ApiKitValidationRule(),
  new DisplayNameRule(),
  new ConfigPropertiesOrderingRule(), // CFG-001: Config Properties Ordering
  new MissingEnvPropertiesDeclarationRule(), // CFG-002: Missing Env Properties
  new ApikitRouteVariableConsistencyRule(), // STD-001: APIKit Route Variable Consistency

  // Governance Rules (PROJ-001, PROJ-002)
  new PomValidationRule(),
  new GitHygieneRule(),

  // Connector Rules (SF-001, SF-002)
  new ReplayChannelConfigRule(), // SF-001: Salesforce Replay Channel Config
  new EventListenerNullGuardRule(), // SF-002: Event Listener Null Guard
  // Coverage expansion (CFG-003, SEC-011..016, API-009..011, HTTP-005,
  // LOG-005, PERF-003, OPS-004, RES-003, MULE-805)
  new PlaintextPropertiesSecretsRule(), // CFG-003: Plaintext Secrets in Properties Files
  new SecurePropertiesModuleRule(), // SEC-011: Secure Properties Module Required
  new HttpsEnforcementRule(), // SEC-012: HTTPS Enforcement
  new TlsContextRequiredRule(), // SEC-013: TLS Context Required
  new BasicAuthenticationRule(), // SEC-014: Basic Authentication Usage
  new CorsPolicyEvidenceRule(), // SEC-015: CORS Policy Evidence
  new InboundAuthenticationEvidenceRule(), // SEC-016: Inbound Authentication Evidence
  new ApiSpecificationPresentRule(), // API-009: API Specification Present
  new VersionedApiPathRule(), // API-010: Versioned API Path
  new HealthEndpointRule(), // API-011: Health Endpoint Present
  new ListenerResponseContentTypeRule(), // HTTP-005: Listener Response Content Type
  new FlowLoggingRule(), // LOG-005: Flow Logging Present
  new BatchResourceConfigRule(), // PERF-003: Batch Resource Configuration
  new SchedulerModeRule(), // OPS-004: Scheduler Mode
  new MessagingIdempotencyRule(), // RES-003: Messaging Idempotency Evidence
  new OversizedFlowRule(), // MULE-805: Oversized Sequential Flow
];

/**
 * Get rules by category
 */
export function getRulesByCategory(category: string): Rule[] {
  return ALL_RULES.filter((rule) => rule.category === category);
}

/**
 * Get rule by ID
 */
export function getRuleById(id: string): Rule | undefined {
  return ALL_RULES.find((rule) => rule.id === id);
}

/**
 * Get all rule IDs
 */
export function getAllRuleIds(): string[] {
  return ALL_RULES.map((rule) => rule.id);
}
