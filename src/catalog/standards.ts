import type { RuleCategory } from '../types/Rule';
import type { StandardDefinition } from './types';

const verified = '2026-08-19';

export const STANDARD_CATALOG = [
  {
    id: 'MSTD-ERR-001',
    title: 'Reliable error handling',
    category: 'error-handling',
    classification: 'vendor-requirement',
    status: 'stable',
    summary: 'Classify, handle, and propagate Mule errors with an explicit terminal outcome.',
    appliesTo: ['Mule 4'],
    guideSlug: 'error-handling',
    sources: [
      {
        title: 'Mule error handling',
        url: 'https://docs.mulesoft.com/mule-runtime/latest/error-handling',
      },
    ],
    lastVerified: verified,
  },
  {
    id: 'MSTD-NAM-001',
    title: 'Consistent project naming',
    category: 'naming',
    classification: 'opinionated-convention',
    status: 'stable',
    summary: 'Use predictable names for flows, variables, configuration, and generated artifacts.',
    appliesTo: ['Mule 4'],
    guideSlug: 'documentation-standards',
    sources: [],
    lastVerified: verified,
  },
  {
    id: 'MSTD-SEC-001',
    title: 'Secure Mule configuration',
    category: 'security',
    classification: 'vendor-requirement',
    status: 'stable',
    summary: 'Protect credentials, transport, sensitive values, and untrusted input.',
    appliesTo: ['Mule 4', 'CloudHub'],
    guideSlug: 'security',
    sources: [
      {
        title: 'Secure configuration properties',
        url: 'https://docs.mulesoft.com/mule-runtime/latest/secure-configuration-properties',
      },
    ],
    lastVerified: verified,
  },
  {
    id: 'MSTD-LOG-001',
    title: 'Operationally useful logging',
    category: 'logging',
    classification: 'recommended-practice',
    status: 'stable',
    summary: 'Emit structured, attributable logs without exposing sensitive data.',
    appliesTo: ['Mule 4'],
    guideSlug: 'logging',
    sources: [
      {
        title: 'Logging in Mule',
        url: 'https://docs.mulesoft.com/mule-runtime/latest/logging-in-mule',
      },
    ],
    lastVerified: verified,
  },
  {
    id: 'MSTD-HTTP-001',
    title: 'Bounded HTTP behavior',
    category: 'http',
    classification: 'recommended-practice',
    status: 'stable',
    summary: 'Configure HTTP metadata, timeouts, connections, and response behavior explicitly.',
    appliesTo: ['Mule 4', 'HTTP Connector'],
    guideSlug: 'connectors',
    sources: [
      {
        title: 'HTTP Connector reference',
        url: 'https://docs.mulesoft.com/http-connector/latest/',
      },
    ],
    lastVerified: verified,
  },
  {
    id: 'MSTD-PERF-001',
    title: 'Bounded resource usage',
    category: 'performance',
    classification: 'recommended-practice',
    status: 'stable',
    summary: 'Bound concurrency, retries, routing complexity, memory, and connector resources.',
    appliesTo: ['Mule 4'],
    guideSlug: 'performance',
    sources: [
      {
        title: 'Mule runtime tuning',
        url: 'https://docs.mulesoft.com/mule-runtime/latest/tuning',
      },
    ],
    lastVerified: verified,
  },
  {
    id: 'MSTD-DOC-001',
    title: 'Maintainable implementation documentation',
    category: 'documentation',
    classification: 'recommended-practice',
    status: 'stable',
    summary:
      'Document flows and components so their purpose and operating behavior are discoverable.',
    appliesTo: ['Mule 4'],
    guideSlug: 'documentation-standards',
    sources: [],
    lastVerified: verified,
  },
  {
    id: 'MSTD-STD-001',
    title: 'Mule implementation standards',
    category: 'standards',
    classification: 'recommended-practice',
    status: 'stable',
    summary: 'Use supported components and explicit, environment-safe configuration.',
    appliesTo: ['Mule 4'],
    guideSlug: 'best-practices',
    sources: [
      {
        title: 'Mule runtime documentation',
        url: 'https://docs.mulesoft.com/mule-runtime/latest/',
      },
    ],
    lastVerified: verified,
  },
  {
    id: 'MSTD-CPLX-001',
    title: 'Reviewable flow complexity',
    category: 'complexity',
    classification: 'opinionated-convention',
    status: 'stable',
    summary: 'Keep flows small enough to understand, test, operate, and safely change.',
    appliesTo: ['Mule 4'],
    guideSlug: 'performance',
    sources: [],
    lastVerified: verified,
  },
  {
    id: 'MSTD-DW-001',
    title: 'Explicit DataWeave contracts',
    category: 'dataweave',
    classification: 'recommended-practice',
    status: 'stable',
    summary: 'Keep DataWeave transformations typed, reusable, version-compatible, and testable.',
    appliesTo: ['DataWeave 2', 'Java 17'],
    guideSlug: 'dataweave',
    sources: [
      {
        title: 'DataWeave language guide',
        url: 'https://docs.mulesoft.com/dataweave/latest/dataweave-language-guide',
      },
    ],
    lastVerified: verified,
  },
  {
    id: 'MSTD-STRUCT-001',
    title: 'Conventional Mule project structure',
    category: 'structure',
    classification: 'recommended-practice',
    status: 'stable',
    summary:
      'Organize source, resources, tests, and configuration using a predictable Maven layout.',
    appliesTo: ['Mule 4', 'Maven'],
    guideSlug: 'folder-structure',
    sources: [
      {
        title: 'Mule application structure',
        url: 'https://docs.mulesoft.com/mule-runtime/latest/about-mule-configuration',
      },
    ],
    lastVerified: verified,
  },
  {
    id: 'MSTD-API-001',
    title: 'Consistent API-led implementation',
    category: 'api-led',
    classification: 'recommended-practice',
    status: 'stable',
    summary: 'Keep APIKit routing, contracts, layers, and API Manager bindings aligned.',
    appliesTo: ['Mule 4', 'APIKit'],
    guideSlug: 'best-practices',
    sources: [
      {
        title: 'API-led connectivity',
        url: 'https://docs.mulesoft.com/api-manager/latest/api-led-connectivity',
      },
    ],
    lastVerified: verified,
  },
  {
    id: 'MSTD-API-002',
    title: 'Consumer-centered API contracts',
    category: 'api-design',
    classification: 'recommended-practice',
    status: 'stable',
    summary:
      'Design, validate, and govern RAML or OpenAPI contracts as explicit consumer-facing interfaces.',
    appliesTo: ['RAML 0.8/1.0', 'OpenAPI 2.0/3.0', 'HTTP APIs'],
    guideSlug: 'api-contracts',
    sources: [
      {
        title: 'AMF supported specifications',
        url: 'https://a.ml/docs/amf/amf_support',
      },
      {
        title: 'API Designer',
        url: 'https://docs.mulesoft.com/design-center/design-create-publish-api-specs',
      },
    ],
    lastVerified: verified,
  },
  {
    id: 'MSTD-GOV-001',
    title: 'Reproducible project governance',
    category: 'governance',
    classification: 'recommended-practice',
    status: 'stable',
    summary: 'Keep project metadata, source hygiene, validation, and delivery reproducible.',
    appliesTo: ['Mule 4', 'Maven', 'Git'],
    guideSlug: 'ci-cd',
    sources: [],
    lastVerified: verified,
  },
  {
    id: 'MSTD-OPS-001',
    title: 'Operationally safe Mule applications',
    category: 'operations',
    classification: 'recommended-practice',
    status: 'stable',
    summary: 'Keep references, schedules, configuration, and operational behavior explicit.',
    appliesTo: ['Mule 4', 'CloudHub'],
    guideSlug: 'deployment',
    sources: [
      {
        title: 'Deploy applications to CloudHub 2.0',
        url: 'https://docs.mulesoft.com/cloudhub-2/ch2-deploy',
      },
    ],
    lastVerified: verified,
  },
  {
    id: 'MSTD-TEST-001',
    title: 'Behavior-focused Mule testing',
    category: 'testing',
    classification: 'recommended-practice',
    status: 'stable',
    summary:
      'Test observable Mule behavior with representative events, bounded mocks, and explicit outcomes.',
    appliesTo: ['Mule 4', 'MUnit'],
    guideSlug: 'testing',
    sources: [
      {
        title: 'MUnit documentation',
        url: 'https://docs.mulesoft.com/munit/latest/',
      },
    ],
    lastVerified: verified,
  },
  {
    id: 'MSTD-EXP-001',
    title: 'Experimental quality heuristics',
    category: 'experimental',
    classification: 'opinionated-convention',
    status: 'experimental',
    summary: 'Evaluate opt-in heuristics before promoting them into stable profiles.',
    appliesTo: ['Mule 4'],
    guideSlug: 'rules-catalog',
    sources: [],
    lastVerified: verified,
  },
] as const satisfies readonly StandardDefinition[];

export const STANDARD_BY_CATEGORY = new Map<RuleCategory, StandardDefinition>(
  STANDARD_CATALOG.map((standard) => [standard.category, standard]),
);

export function getStandardById(id: string): StandardDefinition | undefined {
  return STANDARD_CATALOG.find((standard) => standard.id === id);
}
