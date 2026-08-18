import type { IssueType, RuleCategory, Severity } from '../types/Rule';

export type StandardClassification =
  'vendor-requirement' | 'recommended-practice' | 'opinionated-convention';

export type CatalogStatus = 'stable' | 'experimental' | 'deprecated';

export type RuleProfileName = 'baseline' | 'recommended' | 'strict';
export type RuleProfileReference = `mule-lint:${RuleProfileName}`;

export interface StandardSource {
  title: string;
  url: string;
}

export interface StandardDefinition {
  id: `MSTD-${string}`;
  title: string;
  category: RuleCategory;
  classification: StandardClassification;
  status: CatalogStatus;
  summary: string;
  appliesTo: string[];
  guideSlug: string;
  sources: StandardSource[];
  lastVerified: string;
}

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  category: RuleCategory;
  issueType: IssueType;
  status: CatalogStatus;
  standardIds: Array<StandardDefinition['id']>;
  profiles: RuleProfileName[];
  docsUrl: string;
  resourceUri: string;
}

export interface RuleProfileDefinition {
  name: RuleProfileName;
  reference: RuleProfileReference;
  description: string;
}
