<div class="hero">
  <div class="hero__eyebrow">Mule 4 static analysis</div>
  <h1>See project risks before deployment</h1>
  <p>Run one local command from your Mule project root. No Anypoint credentials, no platform access, and no JavaScript knowledge required.</p>
  <div class="hero__actions">
    <a class="md-button md-button--primary" href="getting-started/">Run your first scan</a>
    <a class="md-button" href="best-practices/mulesoft-best-practices/">Browse Mule practices</a>
  </div>
</div>

```bash
npm install -g @sfdxy/mule-lint
cd path/to/your-mule-project
mule-lint . --profile recommended
```

Node.js is only the runtime used to start mule-lint. If you work mainly in Anypoint Studio and Maven, think of it like installing a command-line utility: you do not need to write Node code.

<div class="role-grid">
  <div class="role-card">
    <h3>MuleSoft developer</h3>
    <p>Scan before committing, read findings by file and line, and open an HTML report when you want the full project picture.</p>
    <a href="recipes/">Common recipes →</a>
  </div>
  <div class="role-card">
    <h3>Team lead</h3>
    <p>Adopt a reviewed profile, tune deliberate exceptions, and add a quality gate after the team has reviewed the baseline.</p>
    <a href="profiles/">Profiles and rollout →</a>
  </div>
  <div class="role-card">
    <h3>Platform or CI engineer</h3>
    <p>Produce SARIF for pull-request annotations and use exit codes for a reliable pipeline decision.</p>
    <a href="quality-gates/">Quality gates →</a>
  </div>
  <div class="role-card">
    <h3>AI-assisted developer</h3>
    <p>Expose local lint, formatting, and API contract tools to Codex, Claude, VS Code, or another MCP client.</p>
    <a href="mcp-design/">MCP setup →</a>
  </div>
</div>

## One report, two ways to work

The terminal output is quickest while fixing a file. The HTML report is better for exploring severity, rule categories, project metrics, and the complete suggested fix.

[![HTML report generated from the sample project](linter/images/html-report-dashboard.png)](output-formats.md#html)

Every screenshot and output example comes from the repository’s [sample Orders System API](https://github.com/Avinava/mule-lint/tree/master/examples/sample-orders-system-api). It contains no customer names, endpoints, identifiers, credentials, or business logic.

## What gets checked

- Mule XML: flows, error handlers, connectors, logging, naming, and cross-file references
- DataWeave: maintainability, duplication, and compatibility patterns
- YAML: environment coverage, property naming, and plaintext secrets
- Project structure: Maven setup, common folders, and source-control hygiene
- RAML and OpenAPI: a separate `api validate` command for contract conformance

The full [standards catalog](best-practices/standards-catalog.md) explains the engineering outcomes. The [rules catalog](best-practices/rules-catalog.md) documents the executable checks.

## A safe first workflow

1. Run `mule-lint . --profile recommended` locally.
2. Fix errors that apply to your project.
3. Review warnings with the team; configure only deliberate exceptions.
4. Generate HTML for a shared view.
5. Add CI enforcement after the baseline is understood.

Not sure what a message means? Start with [troubleshooting](troubleshooting.md), then use the rule ID to find its entry in the rules catalog.
