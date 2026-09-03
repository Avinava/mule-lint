import { FlowLoggingRule } from '../../src/rules/logging/FlowLoggingRule';
import { BatchResourceConfigRule } from '../../src/rules/performance/BatchResourceConfigRule';
import { SchedulerModeRule } from '../../src/rules/operations/SchedulerModeRule';
import { MessagingIdempotencyRule } from '../../src/rules/operations/MessagingIdempotencyRule';
import { OversizedFlowRule } from '../../src/rules/complexity/OversizedFlowRule';
import { ExternalDwlRule } from '../../src/rules/dataweave/DataWeaveRules';
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
        xmlns:batch="http://www.mulesoft.org/schema/mule/batch"
        xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core">
    ${body}
  </mule>`;

const runRule = (
  rule: { validate: (d: Document, c: ValidationContext) => Issue[] },
  body: string,
  options: Record<string, unknown> = {},
): Issue[] => {
  const result = parseXml(wrap(body));
  expect(result.success).toBe(true);
  return rule.validate(result.document!, createContext(options));
};

describe('LOG-005 FlowLoggingRule', () => {
  const rule = new FlowLoggingRule();

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('LOG-005');
    expect(rule.severity).toBe('warning');
    expect(rule.category).toBe('logging');
  });

  it('flags a flow with no logger', () => {
    const issues = runRule(rule, `<flow name="orders-flow"><set-payload value="x"/></flow>`);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('orders-flow');
  });

  it('passes a flow containing a logger', () => {
    expect(runRule(rule, `<flow name="f"><logger message="x"/></flow>`)).toHaveLength(0);
  });

  it('accepts a nested logger', () => {
    expect(runRule(rule, `<flow name="f"><try><logger message="x"/></try></flow>`)).toHaveLength(0);
  });

  it('accepts a JSON logger component', () => {
    expect(
      runRule(
        rule,
        `<flow name="f"><json-logger:logger xmlns:json-logger="http://x" message="m"/></flow>`,
      ),
    ).toHaveLength(0);
  });

  it('excludes sub-flows by default and includes them on request', () => {
    const body = `<sub-flow name="helper-subflow"><set-payload value="x"/></sub-flow>`;
    expect(runRule(rule, body)).toHaveLength(0);
    expect(runRule(rule, body, { includeSubflows: true })).toHaveLength(1);
  });

  it('honours excludePatterns', () => {
    const body = `<flow name="health-check"><set-payload value="x"/></flow>`;
    expect(runRule(rule, body)).toHaveLength(1);
    expect(runRule(rule, body, { excludePatterns: ['health-*'] })).toHaveLength(0);
  });

  it('excludes APIKit-generated router flows by default', () => {
    expect(
      runRule(rule, `<flow name="orders-api-main"><set-payload value="x"/></flow>`),
    ).toHaveLength(0);
    expect(
      runRule(rule, `<flow name="orders-api-console"><set-payload value="x"/></flow>`),
    ).toHaveLength(0);
  });

  it('capitalises the element label in the message', () => {
    const message = runRule(rule, `<flow name="f"><set-payload value="x"/></flow>`)[0]?.message;
    expect(message).toMatch(/^Flow "f"/);
    const sub = runRule(rule, `<sub-flow name="s"><set-payload value="x"/></sub-flow>`, {
      includeSubflows: true,
    })[0]?.message;
    expect(sub).toMatch(/^Sub-flow "s"/);
  });
});

describe('PERF-003 BatchResourceConfigRule', () => {
  const rule = new BatchResourceConfigRule();

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('PERF-003');
    expect(rule.severity).toBe('warning');
  });

  it('flags a batch job with neither attribute', () => {
    const issues = runRule(rule, `<batch:job jobName="customer-import"/>`);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('customer-import');
  });

  it('passes when blockSize is set', () => {
    expect(runRule(rule, `<batch:job jobName="j" blockSize="100"/>`)).toHaveLength(0);
  });

  it('passes when only maxConcurrency is set', () => {
    expect(runRule(rule, `<batch:job jobName="j" maxConcurrency="4"/>`)).toHaveLength(0);
  });

  it('accepts a property placeholder', () => {
    expect(runRule(rule, `<batch:job jobName="j" blockSize="\${batch.block-size}"/>`)).toHaveLength(
      0,
    );
  });

  it('rejects a non-positive or non-numeric literal', () => {
    expect(runRule(rule, `<batch:job jobName="j" blockSize="0"/>`)).toHaveLength(1);
    expect(runRule(rule, `<batch:job jobName="j" blockSize="  "/>`)).toHaveLength(1);
  });

  it('ignores a non-batch element named job', () => {
    expect(runRule(rule, `<flow name="f"><job name="not-batch"/></flow>`)).toHaveLength(0);
  });
});

describe('OPS-004 SchedulerModeRule', () => {
  const rule = new SchedulerModeRule();

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('OPS-004');
    expect(rule.severity).toBe('info');
    expect(rule.category).toBe('operations');
  });

  it('flags fixed-frequency under the default policy', () => {
    const issues = runRule(
      rule,
      `<flow name="poll-flow"><scheduler><scheduling-strategy><fixed-frequency frequency="60000"/></scheduling-strategy></scheduler></flow>`,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('poll-flow');
    expect(issues[0]?.message).toContain('prefers CRON');
  });

  it('does not call fixed-frequency invalid', () => {
    const message = runRule(
      rule,
      `<flow name="f"><scheduler><scheduling-strategy><fixed-frequency frequency="1"/></scheduling-strategy></scheduler></flow>`,
    )[0]?.message;
    expect(message).not.toMatch(/invalid|must not|forbidden/i);
  });

  it('passes a cron scheduler', () => {
    expect(
      runRule(
        rule,
        `<flow name="f"><scheduler><scheduling-strategy><cron expression="\${scheduler.cron}"/></scheduling-strategy></scheduler></flow>`,
      ),
    ).toHaveLength(0);
  });

  it('emits nothing when preferredMode is any', () => {
    expect(
      runRule(
        rule,
        `<flow name="f"><scheduler><scheduling-strategy><fixed-frequency frequency="1"/></scheduling-strategy></scheduler></flow>`,
        { preferredMode: 'any' },
      ),
    ).toHaveLength(0);
  });

  it('honours excludeFlows', () => {
    const body = `<flow name="poll-inventory"><scheduler><scheduling-strategy><fixed-frequency frequency="1"/></scheduling-strategy></scheduler></flow>`;
    expect(runRule(rule, body)).toHaveLength(1);
    expect(runRule(rule, body, { excludeFlows: ['poll-*'] })).toHaveLength(0);
  });
});

describe('RES-003 MessagingIdempotencyRule', () => {
  const rule = new MessagingIdempotencyRule();
  const run = (projectContext: Partial<ProjectContext>): Issue[] =>
    rule.runProject(createContext({}, projectContext));

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('RES-003');
    expect(rule.severity).toBe('info');
    expect(rule.issueType).toBe('bug');
  });

  it('reports messaging usage with no idempotency evidence', () => {
    expect(run({ hasMessagingUsage: true })).toHaveLength(1);
  });

  it('passes when an idempotent message validator is present', () => {
    expect(run({ hasMessagingUsage: true, hasIdempotencyEvidence: true })).toHaveLength(0);
  });

  it('passes when an Object Store is used', () => {
    expect(run({ hasMessagingUsage: true, hasObjectStoreUsage: true })).toHaveLength(0);
  });

  it('emits nothing without messaging usage', () => {
    expect(run({ hasMessagingUsage: false })).toHaveLength(0);
  });
});

describe('MULE-805 OversizedFlowRule', () => {
  const rule = new OversizedFlowRule();

  const flowWith = (count: number, source = ''): string =>
    `<flow name="big-flow">${source}${'<logger message="x"/>'.repeat(count)}</flow>`;

  it('exposes the expected metadata', () => {
    expect(rule.id).toBe('MULE-805');
    expect(rule.severity).toBe('info');
    expect(rule.category).toBe('complexity');
  });

  it('passes a flow at the threshold', () => {
    expect(runRule(rule, flowWith(15))).toHaveLength(0);
  });

  it('flags a flow above the threshold and reports the count', () => {
    const issues = runRule(rule, flowWith(16));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('16 sequential processors');
    expect(issues[0]?.message).toContain('threshold 15');
  });

  it('excludes the message source from the count', () => {
    expect(runRule(rule, flowWith(15, '<http:listener config-ref="L" path="/x"/>'))).toHaveLength(
      0,
    );
  });

  it('excludes the error handler from the count', () => {
    const body = `<flow name="f">${'<logger/>'.repeat(15)}<error-handler><on-error-propagate/></error-handler></flow>`;
    expect(runRule(rule, body)).toHaveLength(0);
  });

  it('counts a scope once without recursing into it', () => {
    const nested = `<foreach>${'<logger/>'.repeat(30)}</foreach>`;
    expect(runRule(rule, `<flow name="f">${nested}</flow>`)).toHaveLength(0);
  });

  it('honours a custom threshold', () => {
    expect(runRule(rule, flowWith(6), { maxProcessors: 5 })).toHaveLength(1);
  });

  it('excludes sub-flows by default', () => {
    const body = `<sub-flow name="s">${'<logger/>'.repeat(20)}</sub-flow>`;
    expect(runRule(rule, body)).toHaveLength(0);
    expect(runRule(rule, body, { includeSubflows: true })).toHaveLength(1);
  });
});

describe('DW-001 inline variable coverage', () => {
  const rule = new ExternalDwlRule();
  const longBody = `%dw 2.0\noutput application/json\n---\n${'{ a: 1 },\n'.repeat(15)}`;

  it('flags an oversized inline set-variable', () => {
    const issues = runRule(
      rule,
      `<flow name="f"><ee:transform doc:name="T" xmlns:doc="http://www.mulesoft.org/schema/mule/documentation">
         <ee:variables><ee:set-variable variableName="v"><![CDATA[${longBody}]]></ee:set-variable></ee:variables>
       </ee:transform></flow>`,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('variable');
  });

  it('still flags an oversized inline payload', () => {
    const issues = runRule(
      rule,
      `<flow name="f"><ee:transform><ee:message><ee:set-payload><![CDATA[${longBody}]]></ee:set-payload></ee:message></ee:transform></flow>`,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('payload');
  });

  it('produces one finding per DataWeave body, not per query path', () => {
    const issues = runRule(
      rule,
      `<flow name="f"><ee:transform>
         <ee:message><ee:set-payload><![CDATA[${longBody}]]></ee:set-payload></ee:message>
         <ee:variables><ee:set-variable variableName="v"><![CDATA[${longBody}]]></ee:set-variable></ee:variables>
       </ee:transform></flow>`,
    );
    expect(issues).toHaveLength(2);
  });

  it('ignores a body that references an external resource', () => {
    expect(
      runRule(
        rule,
        `<flow name="f"><ee:transform><ee:message><ee:set-payload resource="dwl/x.dwl"/></ee:message></ee:transform></flow>`,
      ),
    ).toHaveLength(0);
  });

  it('passes a short inline body', () => {
    expect(
      runRule(
        rule,
        `<flow name="f"><ee:transform><ee:message><ee:set-payload><![CDATA[%dw 2.0\n---\npayload]]></ee:set-payload></ee:message></ee:transform></flow>`,
      ),
    ).toHaveLength(0);
  });
});
