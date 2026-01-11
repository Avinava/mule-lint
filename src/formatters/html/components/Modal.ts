/**
 * Modal Component
 * Centered overlay dialog with backdrop blur
 */

export const modalHtml = `
<div id="modal-overlay" class="modal-overlay">
    <div class="modal-content">
        <div class="modal-header">
            <h3 class="modal-title"></h3>
            <button class="modal-close" onclick="modal.close()">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
        <div class="modal-body"></div>
    </div>
</div>
`;

export interface ModalContent {
    title: string;
    body: string;
}

export const modalContent: Record<string, ModalContent> = {
    complexity: {
        title: 'Complexity Rating',
        body: `
            <h4>What is measured</h4>
            <p>Average cyclomatic complexity across all flows. Higher complexity = harder to test and maintain.</p>
            <h4 style="margin-top: 16px;">How it's calculated</h4>
            <p>Count decision points per flow:</p>
            <ul>
                <li>choice/when clauses</li>
                <li>foreach loops</li>
                <li>try/catch blocks</li>
                <li>scatter-gather routes</li>
                <li>async operations</li>
                <li>error handlers</li>
            </ul>
            <p style="margin-top: 8px;"><strong>Formula:</strong> Base complexity (1) + total decision points</p>
            <h4 style="margin-top: 16px;">Rating Thresholds</h4>
            <div class="rating-scale">
                <span class="badge" style="background: var(--rating-a);">A</span><span>≤ 5 - Simple, easy to test</span>
                <span class="badge" style="background: var(--rating-b);">B</span><span>≤ 10 - Moderate complexity</span>
                <span class="badge" style="background: var(--rating-c);">C</span><span>≤ 15 - Complex, consider splitting</span>
                <span class="badge" style="background: var(--rating-d);">D</span><span>≤ 20 - High, refactor recommended</span>
                <span class="badge" style="background: var(--rating-e);">E</span><span>> 20 - Critical, immediate action</span>
            </div>
        `
    },
    maintainability: {
        title: 'Maintainability Rating',
        body: `
            <h4>What is measured</h4>
            <p>Technical debt as a percentage of estimated development time.</p>
            <h4 style="margin-top: 16px;">How it's calculated</h4>
            <p><strong>Debt minutes:</strong></p>
            <ul>
                <li>Code smells × 5 minutes</li>
                <li>Bug issues × 15 minutes</li>
                <li>Vulnerabilities × 30 minutes</li>
            </ul>
            <p style="margin-top: 8px;"><strong>Development estimate:</strong> (flows × 10min) + (subflows × 5min), min 60min</p>
            <p style="margin-top: 8px;"><strong>Debt Ratio:</strong> (Debt minutes / Development estimate) × 100%</p>
            <h4 style="margin-top: 16px;">Rating Thresholds</h4>
            <div class="rating-scale">
                <span class="badge" style="background: var(--rating-a);">A</span><span>≤ 5% - Excellent maintainability</span>
                <span class="badge" style="background: var(--rating-b);">B</span><span>≤ 10% - Good maintainability</span>
                <span class="badge" style="background: var(--rating-c);">C</span><span>≤ 20% - Moderate debt</span>
                <span class="badge" style="background: var(--rating-d);">D</span><span>≤ 50% - High debt, plan remediation</span>
                <span class="badge" style="background: var(--rating-e);">E</span><span>> 50% - Critical, immediate action</span>
            </div>
        `
    },
    reliability: {
        title: 'Reliability Rating',
        body: `
            <h4>What is measured</h4>
            <p>Number of bug-type issues that may cause runtime failures.</p>
            <h4 style="margin-top: 16px;">Bug-type rules include</h4>
            <ul>
                <li><strong>MULE-003:</strong> Missing error handler on flows</li>
                <li><strong>PROJ-001:</strong> Missing pom.xml file</li>
            </ul>
            <h4 style="margin-top: 16px;">Rating Thresholds</h4>
            <div class="rating-scale">
                <span class="badge" style="background: var(--rating-a);">A</span><span>0 bugs - No reliability issues</span>
                <span class="badge" style="background: var(--rating-b);">B</span><span>1-2 bugs - Minor concerns</span>
                <span class="badge" style="background: var(--rating-c);">C</span><span>3-5 bugs - Moderate risk</span>
                <span class="badge" style="background: var(--rating-d);">D</span><span>6-10 bugs - High risk</span>
                <span class="badge" style="background: var(--rating-e);">E</span><span>> 10 bugs - Critical issues</span>
            </div>
        `
    },
    security: {
        title: 'Security Rating',
        body: `
            <h4>What is measured</h4>
            <p>Vulnerability count from security-related rule violations.</p>
            <h4 style="margin-top: 16px;">Vulnerability rules include</h4>
            <ul>
                <li><strong>MULE-201:</strong> Hardcoded credentials</li>
                <li><strong>MULE-202:</strong> Insecure TLS configuration</li>
                <li><strong>YAML-004:</strong> Plaintext secrets in config</li>
                <li><strong>MULE-004:</strong> Hardcoded URLs</li>
            </ul>
            <h4 style="margin-top: 16px;">Rating Thresholds</h4>
            <div class="rating-scale">
                <span class="badge" style="background: var(--rating-a);">A</span><span>0 vulns - Secure configuration</span>
                <span class="badge" style="background: var(--rating-b);">B</span><span>1 vuln - Minor finding</span>
                <span class="badge" style="background: var(--rating-c);">C</span><span>2-3 vulns - Review needed</span>
                <span class="badge" style="background: var(--rating-d);">D</span><span>4-5 vulns - Remediation required</span>
                <span class="badge" style="background: var(--rating-e);">E</span><span>> 5 vulns - Critical security issues</span>
            </div>
        `
    },
    'project-metrics': {
        title: 'Project Metrics Explained',
        body: `
            <h4>What is analyzed</h4>
            <p>Mule-Lint scans your project structure to identify MuleSoft application components.</p>
            <h4 style="margin-top: 16px;">Metrics Definitions</h4>
            <ul>
                <li><strong>Flows:</strong> Main entry points (HTTP listeners, schedulers) that handle requests</li>
                <li><strong>Sub-flows:</strong> Reusable flow fragments for modularity</li>
                <li><strong>Connectors:</strong> External system integrations (HTTP, Database, Salesforce, etc.)</li>
                <li><strong>Endpoints:</strong> API routes exposed by the application</li>
                <li><strong>Schedulers:</strong> Cron or fixed-frequency job triggers</li>
                <li><strong>Services:</strong> External HTTP request configurations</li>
            </ul>
            <h4 style="margin-top: 16px;">Why it matters</h4>
            <p>These metrics help estimate project size, complexity, and integration footprint for capacity planning and maintenance.</p>
        `
    },
    'severity': {
        title: 'Issue Severity Levels',
        body: `
            <h4>Understanding Severity</h4>
            <p>Issues are classified by their impact on your application.</p>
            <h4 style="margin-top: 16px;">Severity Levels</h4>
            <div class="rating-scale">
                <span class="badge" style="background: #ef4444;">E</span><span><strong>Error:</strong> Critical issues that may cause failures or security vulnerabilities</span>
                <span class="badge" style="background: #f59e0b;">W</span><span><strong>Warning:</strong> Best practice violations that affect maintainability</span>
                <span class="badge" style="background: #3b82f6;">I</span><span><strong>Info:</strong> Suggestions and recommendations for improvement</span>
            </div>
            <h4 style="margin-top: 16px;">Priority</h4>
            <p>Fix errors first, then address warnings. Info-level issues can be handled during refactoring.</p>
        `
    },
    'categories': {
        title: 'Rule Categories',
        body: `
            <h4>How rules are organized</h4>
            <p>Rules are grouped by the aspect of your application they validate.</p>
            <h4 style="margin-top: 16px;">Categories</h4>
            <ul>
                <li><strong>Configuration:</strong> pom.xml, mule-artifact.json settings</li>
                <li><strong>Error Handling:</strong> Try/catch, error handlers, exception strategies</li>
                <li><strong>Naming:</strong> Flow, file, and property naming conventions</li>
                <li><strong>Best Practices:</strong> DataWeave, hardcoded values, patterns</li>
                <li><strong>Security:</strong> Credentials, TLS, sensitive data handling</li>
                <li><strong>Logging:</strong> Logger placement and format</li>
            </ul>
        `
    }
};

export const modalScript = `
const modal = {
    overlay: null,
    content: ${JSON.stringify(modalContent)},
    init() {
        this.overlay = document.getElementById('modal-overlay');
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                this.close();
            }
        });
    },
    open(type) {
        const data = this.content[type];
        if (!data) return;
        this.overlay.querySelector('.modal-title').textContent = data.title;
        this.overlay.querySelector('.modal-body').innerHTML = data.body;
        this.overlay.classList.add('active');
    },
    close() {
        this.overlay.classList.remove('active');
    }
};
`;
