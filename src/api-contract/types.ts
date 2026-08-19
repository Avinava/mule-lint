export type ApiContractFormat = 'raml-0.8' | 'raml-1.0' | 'oas-2.0' | 'oas-3.0';

export type ApiContractSeverity = 'error' | 'warning' | 'info';

export interface ApiContractFinding {
  engine: 'amf' | 'governance';
  id: string;
  severity: ApiContractSeverity;
  file: string;
  line: number;
  column: number;
  message: string;
}

export interface ValidateApiContractOptions {
  projectPath: string;
  mainFile?: string;
  rulesetPaths?: string[];
  dependencyRoots?: string[];
}

export interface ApiContractReport {
  projectRoot: string;
  mainFile: string;
  format: ApiContractFormat;
  functionalConforms: boolean;
  governanceConforms: boolean | 'not-run';
  findings: ApiContractFinding[];
  durationMs: number;
}
