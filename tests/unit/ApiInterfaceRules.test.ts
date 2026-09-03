import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ApiSpecificationPresentRule } from '../../src/rules/api-led/ApiSpecificationPresentRule';
import { VersionedApiPathRule } from '../../src/rules/api-led/VersionedApiPathRule';
import { HealthEndpointRule } from '../../src/rules/api-led/HealthEndpointRule';
import { ListenerResponseContentTypeRule } from '../../src/rules/http/ListenerResponseContentTypeRule';
import { ErrorResponseStructureRule } from '../../src/rules/error-handling/ErrorResponseStructureRule';
import { LintEngine } from '../../src/engine/LintEngine';
import { parseXml } from '../../src/core/XmlParser';
import { ValidationContext, ProjectContext, Issue } from '../../src/types';

const createContext = (
  options: Record<string, unknown> = {},
  projectContext?: Partial<ProjectContext>,
): ValidationContext => ({
  filePath: '/project/src/main/mule/test.xml',
  relativePath: 'src/main/mule/test.xml',
  projectRoot: '/project',
  config: { enabled: true, options },
  projectContext: projectContext
    ? { hasHttpListener: false, hasApikitRouter: false, ...projectContext }
    : undefined,
});

const wrap = (body: string): string => `
  <mule xmlns="http://www.mulesoft.org/schema/mule/core"
        xmlns:http="http://www.mulesoft.org/schema/mule/http"
        xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
    ${body}
  </mule>`;

describe('API-009 ApiSpecificationPresentRule', () => {
  const rule = new ApiSpecificationPresentRule();

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('API-009');
    expect(rule.severity).toBe('warning');
    expect(rule.category).toBe('api-led');
  });

  it('reports when an HTTP project has no specification', () => {
    const issues = rule.runProject(createContext({}, { hasHttpListener: true, hasApiSpec: false }));
    expect(issues).toHaveLength(1);
  });

  it('passes when a specification was discovered', () => {
    const issues = rule.runProject(
      createContext({}, { hasHttpListener: true, hasApiSpec: true, apiSpecFiles: ['a.raml'] }),
    );
    expect(issues).toHaveLength(0);
  });

  it('does not apply to non-HTTP projects', () => {
    expect(rule.runProject(createContext({}, { hasHttpListener: false }))).toHaveLength(0);
  });

  it('rejects an Exchange dependency by default and accepts it when enabled', () => {
    const projectContext = {
      hasHttpListener: true,
      hasApiSpec: false,
      dependencyArtifactIds: ['orders-api', 'mule-http-connector'],
    };
    expect(rule.runProject(createContext({}, projectContext))).toHaveLength(1);
    expect(
      rule.runProject(createContext({ allowExchangeDependency: true }, projectContext)),
    ).toHaveLength(0);
  });

  it('does not accept an unrelated dependency as a contract', () => {
    expect(
      rule.runProject(
        createContext(
          { allowExchangeDependency: true },
          { hasHttpListener: true, hasApiSpec: false, dependencyArtifactIds: ['commons-lang3'] },
        ),
      ),
    ).toHaveLength(1);
  });
});

describe('API-010 VersionedApiPathRule', () => {
  const rule = new VersionedApiPathRule();

  const context = (
    endpoints: ProjectContext['listenerEndpoints'],
    configs: ProjectContext['listenerConfigs'] = [],
    options = {},
  ): ValidationContext =>
    createContext(options, {
      hasHttpListener: true,
      listenerEndpoints: endpoints,
      listenerConfigs: configs,
    });

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('API-010');
    expect(rule.severity).toBe('warning');
  });

  it('flags an unversioned effective path', () => {
    const issues = rule.runProject(
      context(
        [{ relativePath: 'src/main/mule/a.xml', line: 4, configRef: 'HTTP_Listener', path: '/' }],
        [{ name: 'HTTP_Listener', basePath: '/orders' }],
      ),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.line).toBe(4);
    expect(issues[0]?.relativePath).toBe('src/main/mule/a.xml');
  });

  it('accepts a version in the basePath', () => {
    const issues = rule.runProject(
      context(
        [{ relativePath: 'a.xml', line: 1, configRef: 'L', path: '/orders' }],
        [{ name: 'L', basePath: '/api/v1' }],
      ),
    );
    expect(issues).toHaveLength(0);
  });

  it('accepts a version in the listener path', () => {
    const issues = rule.runProject(
      context(
        [{ relativePath: 'a.xml', line: 1, configRef: 'L', path: '/v2/orders' }],
        [{ name: 'L', basePath: '/' }],
      ),
    );
    expect(issues).toHaveLength(0);
  });

  it('accepts a version placeholder', () => {
    const endpoints = [
      { relativePath: 'a.xml', line: 1, configRef: 'L', path: '/${api.version}/orders' },
    ];
    expect(rule.runProject(context(endpoints, [{ name: 'L' }]))).toHaveLength(0);
  });

  it('accepts a semantic version only when enabled', () => {
    const endpoints = [{ relativePath: 'a.xml', line: 1, configRef: 'L', path: '/1.2/orders' }];
    const configs = [{ name: 'L' }];
    expect(rule.runProject(context(endpoints, configs))).toHaveLength(1);
    expect(
      rule.runProject(context(endpoints, configs, { allowSemanticVersion: true })),
    ).toHaveLength(0);
  });

  it('produces no finding when the config-ref cannot be resolved', () => {
    const issues = rule.runProject(
      context([{ relativePath: 'a.xml', line: 1, configRef: 'Missing', path: '/orders' }], []),
    );
    expect(issues).toHaveLength(0);
  });

  it('reports nothing when there are no listeners', () => {
    expect(rule.runProject(context([]))).toHaveLength(0);
  });
});

describe('API-011 HealthEndpointRule', () => {
  const rule = new HealthEndpointRule();

  const context = (
    endpoints: ProjectContext['listenerEndpoints'],
    options = {},
  ): ValidationContext =>
    createContext(options, { hasHttpListener: true, listenerEndpoints: endpoints });

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('API-011');
    expect(rule.severity).toBe('info');
  });

  it('reports when no health endpoint exists', () => {
    expect(
      rule.runProject(context([{ relativePath: 'a.xml', line: 1, path: '/orders' }])),
    ).toHaveLength(1);
  });

  it('accepts a health path', () => {
    expect(
      rule.runProject(context([{ relativePath: 'a.xml', line: 1, path: '/health' }])),
    ).toHaveLength(0);
  });

  it('accepts a health flow name', () => {
    expect(
      rule.runProject(
        context([{ relativePath: 'a.xml', line: 1, path: '/x', flowName: 'health-check-flow' }]),
      ),
    ).toHaveLength(0);
  });

  it('matches indicators case-insensitively', () => {
    expect(
      rule.runProject(context([{ relativePath: 'a.xml', line: 1, path: '/Readiness' }])),
    ).toHaveLength(0);
  });

  it('matches on segments, so a path merely containing an indicator does not count', () => {
    expect(
      rule.runProject(context([{ relativePath: 'a.xml', line: 1, path: '/deliveries' }])),
    ).toHaveLength(1);
  });

  it('matches a hyphenated segment', () => {
    expect(
      rule.runProject(context([{ relativePath: 'a.xml', line: 1, path: '/health-check' }])),
    ).toHaveLength(0);
  });

  it('honours a custom indicator list', () => {
    const endpoints = [{ relativePath: 'a.xml', line: 1, path: '/alive' }];
    expect(rule.runProject(context(endpoints))).toHaveLength(1);
    expect(rule.runProject(context(endpoints, { indicators: ['alive'] }))).toHaveLength(0);
  });

  it('does not apply to non-HTTP projects', () => {
    expect(rule.runProject(createContext({}, { hasHttpListener: false }))).toHaveLength(0);
  });
});

describe('HTTP-005 ListenerResponseContentTypeRule', () => {
  const rule = new ListenerResponseContentTypeRule();
  const run = (body: string, options = {}): Issue[] => {
    const result = parseXml(wrap(body));
    expect(result.success).toBe(true);
    return rule.validate(result.document!, createContext(options));
  };

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('HTTP-005');
    expect(rule.severity).toBe('info');
    expect(rule.category).toBe('http');
  });

  it('flags a response with no content type', () => {
    const issues = run(`
      <flow name="f">
        <http:listener config-ref="L" path="/orders">
          <http:response statusCode="200"/>
        </http:listener>
      </flow>`);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('Content-Type');
  });

  it('passes an explicit Content-Type header entry', () => {
    const issues = run(`
      <flow name="f">
        <http:listener config-ref="L" path="/orders">
          <http:response statusCode="200">
            <http:headers><http:header headerName="Content-Type" value="application/json"/></http:headers>
          </http:response>
        </http:listener>
      </flow>`);
    expect(issues).toHaveLength(0);
  });

  it('passes a headers expression naming Content-Type', () => {
    const issues = run(`
      <flow name="f">
        <http:listener config-ref="L" path="/orders">
          <http:response><http:headers>#[{"Content-Type": "application/json"}]</http:headers></http:response>
        </http:listener>
      </flow>`);
    expect(issues).toHaveLength(0);
  });

  it('reports an unverifiable header expression only when enabled', () => {
    const body = `
      <flow name="f">
        <http:listener config-ref="L" path="/orders">
          <http:response><http:headers>#[vars.responseHeaders]</http:headers></http:response>
        </http:listener>
      </flow>`;
    expect(run(body)).toHaveLength(1);
    expect(run(body, { reportDynamicHeaders: false })).toHaveLength(0);
  });

  it('checks error-response as well as response', () => {
    const issues = run(`
      <flow name="f">
        <http:listener config-ref="L" path="/orders">
          <http:response><http:headers>#[{"Content-Type": "application/json"}]</http:headers></http:response>
          <http:error-response statusCode="500"/>
        </http:listener>
      </flow>`);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('error-response');
  });

  it('ignores responses outside a listener', () => {
    expect(run(`<flow name="f"><http:request config-ref="A" path="/x"/></flow>`)).toHaveLength(0);
  });
});

describe('ERR-003 error handlers with no payload', () => {
  const rule = new ErrorResponseStructureRule();
  const run = (body: string, hasHttpListener: boolean): Issue[] => {
    const result = parseXml(wrap(body));
    expect(result.success).toBe(true);
    return rule.validate(result.document!, createContext({}, { hasHttpListener }));
  };

  it('reports an HTTP error handler that produces no payload', () => {
    const issues = run(
      `<flow name="f"><error-handler>
         <on-error-propagate type="HTTP:NOT_FOUND"><logger message="not found"/></on-error-propagate>
       </error-handler></flow>`,
      true,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('info');
    expect(issues[0]?.message).toContain('no response payload');
  });

  it('does not require a payload in a non-HTTP project', () => {
    const issues = run(
      `<flow name="f"><error-handler>
         <on-error-propagate><logger message="x"/></on-error-propagate>
       </error-handler></flow>`,
      false,
    );
    expect(issues).toHaveLength(0);
  });

  it('accepts a block that delegates through raise-error', () => {
    const issues = run(
      `<flow name="f"><error-handler>
         <on-error-propagate><raise-error type="APP:X"/></on-error-propagate>
       </error-handler></flow>`,
      true,
    );
    expect(issues).toHaveLength(0);
  });

  it('accepts a transform using an external DWL resource', () => {
    const issues = run(
      `<flow name="f"><error-handler>
         <on-error-propagate>
           <ee:transform><ee:message><ee:set-payload resource="dwl/error.dwl"/></ee:message></ee:transform>
         </on-error-propagate>
       </error-handler></flow>`,
      true,
    );
    expect(issues).toHaveLength(0);
  });

  it('still reports a payload missing correlationId', () => {
    const issues = run(
      `<flow name="f"><error-handler>
         <on-error-propagate>
           <ee:transform><ee:message><ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{ message: error.detailedDescription }]]></ee:set-payload></ee:message></ee:transform>
         </on-error-propagate>
       </error-handler></flow>`,
      true,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('correlationId');
  });
});

describe('API rules through a full project scan', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-lint-api-'));
    fs.writeFileSync(path.join(projectRoot, 'mule-artifact.json'), '{}');
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  const write = (relativePath: string, content: string): void => {
    const target = path.join(projectRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };

  it('detects a RAML specification and a versioned health endpoint', async () => {
    write('src/main/resources/api/orders.raml', '#%RAML 1.0\ntitle: Orders\n');
    write(
      'src/main/mule/api.xml',
      wrap(`
        <http:listener-config name="HTTP_Listener" basePath="/api/v1"/>
        <flow name="health-flow">
          <http:listener config-ref="HTTP_Listener" path="/health"/>
        </flow>`),
    );

    const engine = new LintEngine({
      rules: [
        new ApiSpecificationPresentRule(),
        new VersionedApiPathRule(),
        new HealthEndpointRule(),
      ],
    });
    const report = await engine.scan(projectRoot);
    expect(report.files.flatMap((file) => file.issues)).toHaveLength(0);
  });

  it('reports all three when the interface controls are missing', async () => {
    write(
      'src/main/mule/api.xml',
      wrap(`
        <http:listener-config name="HTTP_Listener" basePath="/orders"/>
        <flow name="get-orders-flow">
          <http:listener config-ref="HTTP_Listener" path="/"/>
        </flow>`),
    );

    const engine = new LintEngine({
      rules: [
        new ApiSpecificationPresentRule(),
        new VersionedApiPathRule(),
        new HealthEndpointRule(),
      ],
    });
    const report = await engine.scan(projectRoot);
    const ruleIds = report.files
      .flatMap((file) => file.issues)
      .map((issue) => issue.ruleId)
      .sort();
    expect(ruleIds).toEqual(['API-009', 'API-010', 'API-011']);
  });

  it('does not treat a plain configuration yaml as an API specification', async () => {
    write('src/main/resources/config/dev.yaml', 'http:\n  port: 8081\n');
    write(
      'src/main/mule/api.xml',
      wrap(`<flow name="f"><http:listener config-ref="L" path="/v1/x"/></flow>`),
    );

    const engine = new LintEngine({ rules: [new ApiSpecificationPresentRule()] });
    const report = await engine.scan(projectRoot);
    expect(report.files.flatMap((file) => file.issues)).toHaveLength(1);
  });
});
