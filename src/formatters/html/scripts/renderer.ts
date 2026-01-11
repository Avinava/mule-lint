/**
 * Renderer Script
 * Dashboard rendering and metrics display
 * 
 * NOTE: The actual renderer implementation is inline in HtmlFormatter.ts
 * since it requires access to DOM, Chart.js, and Tabulator instances.
 * This file exports reusable configuration constants.
 */

/**
 * Connector metadata for displaying connector icons and documentation links
 */
export const connectorMeta: Record<string, { name: string; icon: string | null; doc: string | null }> = {
    salesforce: { name: 'Salesforce', icon: 'com.mulesoft.connectors/mule-salesforce-connector/icon/svg/', doc: 'salesforce-connector' },
    netsuite: { name: 'NetSuite', icon: 'com.mulesoft.connectors/mule-netsuite-connector/icon/svg/', doc: 'netsuite-connector' },
    workday: { name: 'Workday', icon: 'com.mulesoft.connectors/mule-workday-connector/icon/svg/', doc: 'workday-connector' },
    http: { name: 'HTTP', icon: 'org.mule.connectors/mule-http-connector/icon/svg/', doc: 'http-connector' },
    db: { name: 'Database', icon: 'org.mule.connectors/mule-db-connector/icon/svg/', doc: 'db-connector' },
    database: { name: 'Database', icon: 'org.mule.connectors/mule-db-connector/icon/svg/', doc: 'db-connector' },
    sap: { name: 'SAP', icon: 'com.mulesoft.connectors/mule-sap-connector/icon/svg/', doc: 'sap-connector' },
    kafka: { name: 'Kafka', icon: 'com.mulesoft.connectors/mule-kafka-connector/icon/svg/', doc: 'kafka-connector' },
    jms: { name: 'JMS', icon: 'org.mule.connectors/mule-jms-connector/icon/svg/', doc: 'jms-connector' },
    amqp: { name: 'AMQP', icon: 'com.mulesoft.connectors/mule-amqp-connector/icon/svg/', doc: 'amqp-connector' },
    sftp: { name: 'SFTP', icon: 'org.mule.connectors/mule-sftp-connector/icon/svg/', doc: 'sftp-connector' },
    ftp: { name: 'FTP', icon: 'org.mule.connectors/mule-ftp-connector/icon/svg/', doc: 'ftp-connector' },
    file: { name: 'File', icon: 'org.mule.connectors/mule-file-connector/icon/svg/', doc: 'file-connector' },
    email: { name: 'Email', icon: 'org.mule.connectors/mule-email-connector/icon/svg/', doc: 'email-connector' },
    vm: { name: 'VM', icon: 'org.mule.connectors/mule-vm-connector/icon/svg/', doc: 'vm-connector' },
    os: { name: 'ObjectStore', icon: 'org.mule.connectors/mule-objectstore-connector/icon/svg/', doc: 'object-store-connector' },
    mongodb: { name: 'MongoDB', icon: 'com.mulesoft.connectors/mule-mongodb-connector/icon/svg/', doc: 'mongodb-connector' },
    redis: { name: 'Redis', icon: 'com.mulesoft.connectors/mule-redis-connector/icon/svg/', doc: 'redis-connector' },
    slack: { name: 'Slack', icon: 'com.mulesoft.connectors/mule-slack-connector/icon/svg/', doc: 'slack-connector' },
    box: { name: 'Box', icon: 'com.mulesoft.connectors/mule-box-connector/icon/svg/', doc: 'box-connector' },
    's3': { name: 'Amazon S3', icon: 'com.mulesoft.connectors/mule-amazon-s3-connector/icon/svg/', doc: 'amazon-s3-connector' },
    'amazon-s3': { name: 'Amazon S3', icon: 'com.mulesoft.connectors/mule-amazon-s3-connector/icon/svg/', doc: 'amazon-s3-connector' },
    sqs: { name: 'Amazon SQS', icon: 'com.mulesoft.connectors/mule-amazon-sqs-connector/icon/svg/', doc: 'amazon-sqs-connector' },
    dynamodb: { name: 'DynamoDB', icon: 'com.mulesoft.connectors/mule-amazon-dynamodb-connector/icon/svg/', doc: 'amazon-dynamodb-connector' },
    servicenow: { name: 'ServiceNow', icon: 'com.mulesoft.connectors/mule-servicenow-connector/icon/svg/', doc: 'servicenow-connector' },
    sockets: { name: 'Sockets', icon: 'org.mule.connectors/mule-sockets-connector/icon/svg/', doc: 'sockets-connector' },
    snowflake: { name: 'Snowflake', icon: 'com.mulesoft.connectors/mule-snowflake-connector/icon/svg/', doc: 'snowflake-connector' },
    stripe: { name: 'Stripe', icon: 'com.mulesoft.connectors/mule-stripe-connector/icon/svg/', doc: 'stripe-connector' },
    'anypoint-mq': { name: 'Anypoint MQ', icon: 'com.mulesoft.connectors/anypoint-mq-connector/icon/svg/', doc: 'anypoint-mq-connector' },
    // Core/internal connectors
    mule: { name: 'Mule Core', icon: null, doc: null },
    apikit: { name: 'APIkit', icon: null, doc: 'apikit' },
    'mule-apikit': { name: 'APIkit', icon: null, doc: 'apikit' },
    java: { name: 'Java', icon: null, doc: 'java-module' },
    'java-logger': { name: 'Logger', icon: null, doc: null },
    schedulers: { name: 'Scheduler', icon: null, doc: null },
    'secure-properties': { name: 'Secure Props', icon: null, doc: 'mule-runtime/mule-4.4/secure-app-props' }
};

/**
 * HTTP method styles for endpoint display
 */
export const methodStyles: Record<string, { bg: string; text: string; dot: string }> = {
    'GET': { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    'POST': { bg: 'bg-sky-100 dark:bg-sky-500/20', text: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500' },
    'PUT': { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    'PATCH': { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
    'DELETE': { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
    'ALL': { bg: 'bg-slate-100 dark:bg-slate-600', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' }
};

/**
 * MuleSoft Exchange base URL for connector icons
 */
export const exchangeBaseUrl = 'https://www.mulesoft.com/exchange/organizations/68ef9520-24e9-4cf2-b2f5-620025690913/assets/';

// Re-export chart configuration
export {
    severityColors,
    categoryColors,
    complexityRatingColors,
    qualityRatingColors,
    environmentStyles,
    securityStyles,
    defaultSecurityStyle,
    chartTheme,
    chartBarSettings,
    accentColor,
} from './charts';

import {
    severityColors,
    categoryColors,
    complexityRatingColors,
    environmentStyles,
    securityStyles,
    defaultSecurityStyle,
    chartBarSettings,
    accentColor,
} from './charts';

/**
 * Generate the full renderer script with dynamic configuration
 * This function is called at render time to inject runtime values
 */
export function generateRendererScript(config: {
    exchangeBaseUrl: string;
    connectorMeta: typeof connectorMeta;
    methodStyles: typeof methodStyles;
    qualityRatingsRendererScript: string;
}): string {

    return `
        // ===== RENDERER =====
        const renderer = {
            init() {
                this.renderSidebar();
                this.renderCharts();
                this.renderMetrics();
                this.initTable();
                this.initTheme();
                this.initKeyboardShortcuts();
                this.initExport();
            },
            
            renderMetrics() {
                if (report.metrics) {
                    const m = report.metrics;
                    document.getElementById('metric-flows').textContent = m.flowCount;
                    document.getElementById('metric-subflows').textContent = m.subFlowCount;
                    document.getElementById('metric-services').textContent = m.httpListenerCount || 0;
                    document.getElementById('metric-dw').textContent = m.dwTransformCount;
                    document.getElementById('metric-connectors').textContent = m.connectorConfigCount;
                    
                    // MuleSoft Exchange icon base URL
                    const exchangeBase = '${config.exchangeBaseUrl}';
                    
                    // Connector metadata
                    const connectorMeta = ${JSON.stringify(config.connectorMeta)};

                    
                    // Render connector type pills with logos and links
                    const pillsContainer = document.getElementById('connector-pills');
                    if (pillsContainer && m.connectorTypes && m.connectorTypes.length > 0) {
                        pillsContainer.innerHTML = m.connectorTypes.map(type => {
                            const meta = connectorMeta[type.toLowerCase()] || { name: type, icon: null, doc: null };
                            const docUrl = meta.doc ? 'https://docs.mulesoft.com/' + meta.doc + '/latest/' : null;
                            const pillClass = 'inline-flex items-center gap-1.5 px-2 py-0.5 text-2xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors';
                            const iconHtml = meta.icon ? '<img src="' + meta.icon + '" alt="" class="w-3.5 h-3.5 rounded-sm" onerror="this.style.display=\\'none\\'">' : '<span class="w-3.5 h-3.5 rounded-sm bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-2xs">⚙</span>';
                            if (docUrl) {
                                return '<a href="' + docUrl + '" target="_blank" rel="noopener" class="' + pillClass + '" title="View ' + meta.name + ' docs">' + iconHtml + '<span>' + meta.name + '</span></a>';
                            }
                            return '<span class="' + pillClass + '" title="' + meta.name + '">' + iconHtml + '<span>' + meta.name + '</span></span>';
                        }).join('');
                    } else if (pillsContainer) {
                        document.getElementById('connector-inventory').style.display = 'none';
                    }
                    
                    // Render API endpoints - grouped summary
                    const endpointContainer = document.getElementById('endpoint-pills');
                    if (endpointContainer && m.apiEndpoints && m.apiEndpoints.length > 0) {
                        document.getElementById('endpoints-inventory').style.display = 'flex';
                        
                        // Group endpoints by method
                        const byMethod = {};
                        m.apiEndpoints.forEach(ep => {
                            byMethod[ep.method] = (byMethod[ep.method] || 0) + 1;
                        });
                        
                        const methodStyles = ${JSON.stringify(config.methodStyles)};

                        
                        // Show total count + summary by method
                        const totalBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">' + m.apiEndpoints.length + ' endpoints</span>';
                        
                        const methodBadges = Object.entries(byMethod)
                            .sort((a, b) => b[1] - a[1]) // Sort by count desc
                            .map(([method, count]) => {
                                const style = methodStyles[method] || methodStyles['ALL'];
                                return '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 text-2xs font-medium rounded-full ' + style.bg + ' ' + style.text + '"><span class="w-2 h-2 rounded-full ' + style.dot + '"></span>' + method + ' <span class="font-bold">' + count + '</span></span>';
                            }).join('');
                        
                        endpointContainer.innerHTML = totalBadge + methodBadges;
                        
                        // Populate detail list
                        const endpointList = document.getElementById('endpoint-list');
                        if (endpointList) {
                            endpointList.innerHTML = m.apiEndpoints.map(ep => {
                                const style = methodStyles[ep.method] || methodStyles['ALL'];
                                return '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full ' + style.bg + ' ' + style.text + '"><span class="font-bold">' + ep.method + '</span><span class="opacity-75">' + ep.path + '</span></span>';
                            }).join('');
                        }
                        
                        // Toggle function
                        window.toggleEndpoints = function() {
                            const details = document.getElementById('endpoint-details');
                            const chevron = document.getElementById('endpoints-chevron');
                            details.classList.toggle('hidden');
                            chevron.classList.toggle('rotate-180');
                        };
                    }
                    
                    // Render environments
                    const envContainer = document.getElementById('environment-pills');
                    if (envContainer && m.environments && m.environments.length > 0) {
                        document.getElementById('environments-inventory').style.display = 'flex';
                        const envStyles = ${JSON.stringify(environmentStyles)};
                        envContainer.innerHTML = m.environments.map(env => {
                            const style = envStyles[env] || envStyles['local'];
                            return '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 text-2xs font-medium rounded-full ' + style.bg + '"><span class="w-2 h-2 rounded-full ' + style.dot + '"></span><span>' + env + '</span></span>';
                        }).join('');
                    }
                    
                    // Render security patterns
                    const securityContainer = document.getElementById('security-pills');
                    if (securityContainer && m.securityPatterns && m.securityPatterns.length > 0) {
                        document.getElementById('security-inventory').style.display = 'flex';
                        const secStyles = ${JSON.stringify(securityStyles)};
                        const defaultSecStyle = ${JSON.stringify(defaultSecurityStyle)};
                        securityContainer.innerHTML = m.securityPatterns.map(pattern => {
                            const style = secStyles[pattern] || defaultSecStyle;
                            return '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full ' + style.bg + '">' + style.icon + ' ' + pattern + '</span>';
                        }).join('');
                    }
                    
                    // Render external services
                    const serviceContainer = document.getElementById('service-pills');
                    if (serviceContainer && m.externalServices && m.externalServices.length > 0) {
                        document.getElementById('services-inventory').style.display = 'block';
                        serviceContainer.innerHTML = '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">' + m.externalServices.length + ' services</span>';
                        
                        const serviceList = document.getElementById('service-list');
                        if (serviceList) {
                            serviceList.innerHTML = m.externalServices.map(svc => 
                                '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">🔗 ' + svc.name + ' <span class="opacity-50">(' + svc.host + ')</span></span>'
                            ).join('');
                        }
                        
                        window.toggleServices = function() {
                            const details = document.getElementById('service-details');
                            const chevron = document.getElementById('services-chevron');
                            details.classList.toggle('hidden');
                            chevron.classList.toggle('rotate-180');
                        };
                    }
                    
                    // Render schedulers
                    const schedulerContainer = document.getElementById('scheduler-pills');
                    if (schedulerContainer && m.schedulers && m.schedulers.length > 0) {
                        document.getElementById('schedulers-inventory').style.display = 'block';
                        const cronCount = m.schedulers.filter(s => s.type === 'cron').length;
                        const fixedCount = m.schedulers.filter(s => s.type === 'fixed').length;
                        let summary = '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">' + m.schedulers.length + ' jobs</span>';
                        if (cronCount > 0) summary += '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400">⏰ cron ' + cronCount + '</span>';
                        if (fixedCount > 0) summary += '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400">🔄 fixed ' + fixedCount + '</span>';
                        schedulerContainer.innerHTML = summary;
                        
                        const schedulerList = document.getElementById('scheduler-list');
                        if (schedulerList) {
                            schedulerList.innerHTML = m.schedulers.map(sched => {
                                const icon = sched.type === 'cron' ? '⏰' : '🔄';
                                const bg = sched.type === 'cron' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' : 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400';
                                return '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full ' + bg + '">' + icon + ' ' + sched.value + ' <span class="opacity-50">(' + sched.flow + ')</span></span>';
                            }).join('');
                        }
                        
                        window.toggleSchedulers = function() {
                            const details = document.getElementById('scheduler-details');
                            const chevron = document.getElementById('schedulers-chevron');
                            details.classList.toggle('hidden');
                            chevron.classList.toggle('rotate-180');
                        };
                    }
                    
                    // Render Quality Ratings (A-E)
                    this.renderQualityRatings(m);
                }
            },
            
            ${config.qualityRatingsRendererScript},
            
            renderSidebar() {
                // Severity links
                const severityNav = document.getElementById('sidebar-severity');
                const severities = [
                    { key: 'error', label: 'Errors', count: report.summary.bySeverity.error, color: 'bg-rose-500' },
                    { key: 'warning', label: 'Warnings', count: report.summary.bySeverity.warning, color: 'bg-amber-500' },
                    { key: 'info', label: 'Info', count: report.summary.bySeverity.info, color: 'bg-sky-500' }
                ];
                severityNav.innerHTML = severities.filter(s => s.count > 0).map(s => \`
                    <a href="#" onclick="router.toggleSeverity('\${s.key}'); return false;" 
                        data-filter-severity="\${s.key}"
                        class="sidebar-link flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 rounded-r-md">
                        <span class="w-2.5 h-2.5 rounded-full \${s.color}"></span>
                        \${s.label}
                        <span class="ml-auto text-xs font-bold text-slate-400 dark:text-slate-500">\${s.count}</span>
                    </a>
                \`).join('');
                
                // Category links
                const catNav = document.getElementById('sidebar-categories');
                const catCounts = {};
                allIssues.forEach(i => catCounts[i.category] = (catCounts[i.category] || 0) + 1);
                const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
                
                catNav.innerHTML = sortedCats.map(([cat, count]) => \`
                    <a href="#" onclick="router.toggleCategory('\${cat}'); return false;"
                        data-filter-category="\${cat}"
                        class="sidebar-link flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 rounded-r-md">
                        <span class="capitalize truncate">\${cat}</span>
                        <span class="ml-auto text-xs font-bold text-slate-400 dark:text-slate-500">\${count}</span>
                    </a>
                \`).join('');
            },
            
            renderCharts() {
                const isDark = document.documentElement.classList.contains('dark');
                const textColor = isDark ? '#94a3b8' : '#64748b';
                const gridColor = isDark ? '#334155' : '#e2e8f0';
                
                Chart.defaults.font.family = "'Inter', sans-serif";
                Chart.defaults.font.size = 11;
                Chart.defaults.color = textColor;
                
                // Top Rules
                const ruleCounts = {};
                const ruleNames = {};
                allIssues.forEach(i => {
                    ruleCounts[i.ruleId] = (ruleCounts[i.ruleId] || 0) + 1;
                    ruleNames[i.ruleId] = i.ruleName;
                });
                const sortedRules = Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
                
                new Chart(document.getElementById('chart-rules'), {
                    type: 'bar',
                    data: {
                        labels: sortedRules.map(([id]) => {
                            const name = ruleNames[id];
                            return name.length > 30 ? name.substring(0, 27) + '...' : name;
                        }),
                        datasets: [{
                            data: sortedRules.map(x => x[1]),
                            backgroundColor: '${accentColor}',
                            borderRadius: ${chartBarSettings.borderRadius},
                            barThickness: ${chartBarSettings.barThickness.rules},
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { beginAtZero: true, grid: { color: gridColor }, ticks: { stepSize: 1 } },
                            y: { grid: { display: false } }
                        }
                    }
                });
                
                // Severity donut
                new Chart(document.getElementById('chart-severity'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Errors', 'Warnings', 'Info'],
                        datasets: [{
                            data: [report.summary.bySeverity.error, report.summary.bySeverity.warning, report.summary.bySeverity.info],
                            backgroundColor: ['${severityColors.error}', '${severityColors.warning}', '${severityColors.info}'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        cutout: '60%',
                        plugins: { legend: { position: 'right', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 10 } } } }
                    }
                });
                
                // Categories bar
                const catCounts = {};
                allIssues.forEach(i => catCounts[i.category] = (catCounts[i.category] || 0) + 1);
                const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
                const categoryColorPalette = ${JSON.stringify(categoryColors)};
                
                new Chart(document.getElementById('chart-categories'), {
                    type: 'bar',
                    data: {
                        labels: sortedCats.map(([cat]) => cat.charAt(0).toUpperCase() + cat.slice(1)),
                        datasets: [{
                            data: sortedCats.map(x => x[1]),
                            backgroundColor: sortedCats.map((_, i) => categoryColorPalette[i % categoryColorPalette.length]),
                            borderRadius: ${chartBarSettings.borderRadius},
                            barThickness: ${chartBarSettings.barThickness.categories},
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { beginAtZero: true, grid: { color: gridColor } },
                            y: { grid: { display: false } }
                        },
                        onClick: (e, elements) => {
                            if (elements.length > 0) {
                                const idx = elements[0].index;
                                router.toggleCategory(sortedCats[idx][0]);
                            }
                        }
                    }
                });

                // Flow Complexity Chart
                const complexityData = report.metrics?.flowComplexityData || [];
                if (complexityData.length > 0) {
                    document.getElementById('complexity-chart-container').style.display = 'block';
                    
                    // Sort by complexity (highest first) and take top 10
                    const sortedComplexity = [...complexityData]
                        .sort((a, b) => b.complexity - a.complexity)
                        .slice(0, 10);
                    
                    // Color based on rating
                    const ratingColors = ${JSON.stringify(complexityRatingColors)};
                    
                    new Chart(document.getElementById('chart-complexity'), {
                        type: 'bar',
                        data: {
                            labels: sortedComplexity.map(f => {
                                const name = f.flowName;
                                return name.length > 40 ? name.substring(0, 37) + '...' : name;
                            }),
                            datasets: [{
                                data: sortedComplexity.map(f => f.complexity),
                                backgroundColor: sortedComplexity.map(f => ratingColors[f.rating] || '#6b7280'),
                                borderRadius: ${chartBarSettings.borderRadius},
                                barThickness: ${chartBarSettings.barThickness.complexity},
                            }]
                        },
                        options: {
                            indexAxis: 'y',
                            maintainAspectRatio: false,
                            plugins: { 
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const flow = sortedComplexity[context.dataIndex];
                                            const breakdown = Object.entries(flow.breakdown || {})
                                                .map(([k, v]) => k + ': ' + v)
                                                .join(', ');
                                            return ['Complexity: ' + flow.complexity + ' (' + flow.rating + ')', breakdown || 'Base complexity only'];
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: { 
                                    beginAtZero: true, 
                                    grid: { color: gridColor },
                                    title: { display: true, text: 'Cyclomatic Complexity', font: { size: 10 } }
                                },
                                y: { grid: { display: false } }
                            }
                        }
                    });
                }
            },
            
            initTable() {
                const severityOrder = { error: 1, warning: 2, info: 3 };
                
                tableInstance = new Tabulator('#issues-table', {
                    data: allIssues,
                    layout: 'fitColumns',
                    height: '100%',
                    placeholder: 'No issues match your filters',
                    
                    columns: [
                        {
                            title: 'Severity',
                            field: 'severity',
                            width: 100,
                            headerFilter: 'list',
                            headerFilterParams: { valuesLookup: true, multiselect: true, clearable: true },
                            headerFilterFunc: 'in',
                            sorter: (a, b) => severityOrder[a] - severityOrder[b],
                            formatter: (cell) => {
                                const val = cell.getValue();
                                const styles = {
                                    error: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
                                    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
                                    info: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400'
                                };
                                return \`<span class="inline-flex px-2 py-0.5 text-2xs font-medium uppercase rounded-md \${styles[val]}">\${val}</span>\`;
                            }
                        },
                        {
                            title: 'Rule',
                            field: 'ruleName',
                            minWidth: 200,
                            headerFilter: 'list',
                            headerFilterParams: { valuesLookup: true, multiselect: true, clearable: true },
                            headerFilterFunc: 'in',
                            formatter: (cell) => {
                                const row = cell.getRow().getData();
                                return \`<div><div class="font-medium text-slate-800 dark:text-slate-200 truncate">\${cell.getValue()}</div><div class="text-xs text-slate-400 font-mono">\${row.ruleId}</div></div>\`;
                            }
                        },
                        {
                            title: 'Category',
                            field: 'category',
                            width: 120,
                            headerFilter: 'list',
                            headerFilterParams: { valuesLookup: true, multiselect: true, clearable: true },
                            headerFilterFunc: 'in',
                            formatter: (cell) => \`<span class="capitalize text-slate-600 dark:text-slate-300">\${cell.getValue()}</span>\`
                        },
                        {
                            title: 'Type',
                            field: 'issueType',
                            width: 110,
                            headerFilter: 'list',
                            headerFilterParams: { valuesLookup: true, multiselect: true, clearable: true },
                            headerFilterFunc: 'in',
                            formatter: (cell) => {
                                const val = cell.getValue() || 'code-smell';
                                const typeStyles = {
                                    'code-smell': { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-400', label: 'Code Smell' },
                                    'bug': { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-400', label: 'Bug' },
                                    'vulnerability': { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-400', label: 'Vulnerability' }
                                };
                                const style = typeStyles[val] || typeStyles['code-smell'];
                                return \`<span class="inline-flex px-2 py-0.5 text-2xs font-medium rounded-md \${style.bg} \${style.text}">\${style.label}</span>\`;
                            }
                        },
                        {
                            title: 'File',
                            field: 'fileName',
                            minWidth: 180,
                            headerFilter: 'input',
                            headerFilterPlaceholder: 'Filter...',
                            formatter: (cell) => {
                                const row = cell.getRow().getData();
                                const path = row.fileName;
                                const display = path.length > 40 ? '...' + path.slice(-37) : path;
                                return \`<div><div class="font-mono text-sky-600 dark:text-sky-400 text-xs truncate" title="\${path}">\${display}</div><div class="text-xs text-slate-400">Line \${row.line}</div></div>\`;
                            }
                        },
                        {
                            title: 'Message',
                            field: 'message',
                            widthGrow: 2,
                            headerFilter: 'input',
                            headerFilterPlaceholder: 'Filter...',
                            formatter: (cell) => {
                                const row = cell.getRow().getData();
                                let html = \`<div class="text-slate-700 dark:text-slate-300">\${cell.getValue()}</div>\`;
                                if (row.suggestion) {
                                    html += \`<div class="text-xs text-slate-400 mt-0.5 truncate" title="\${row.suggestion}">💡 \${row.suggestion}</div>\`;
                                }
                                return html;
                            }
                        }
                    ],
                    
                    initialSort: [{ column: 'severity', dir: 'asc' }]
                });
                
                // Global search
                document.getElementById('global-search').addEventListener('input', (e) => {
                    router.setSearchTerm(e.target.value);
                });
            },
            
            initTheme() {
                const toggle = document.getElementById('theme-toggle');
                const html = document.documentElement;
                const lightIcon = document.getElementById('theme-toggle-light-icon');
                const darkIcon = document.getElementById('theme-toggle-dark-icon');
                
                // Function to update icon visibility
                const updateIcons = () => {
                    if (html.classList.contains('dark')) {
                        lightIcon.classList.remove('hidden');
                        darkIcon.classList.add('hidden');
                    } else {
                        lightIcon.classList.add('hidden');
                        darkIcon.classList.remove('hidden');
                    }
                };

                // Check local storage or system preference
                if (localStorage.getItem('theme') === 'dark' || 
                    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    html.classList.add('dark');
                }
                
                // Initial icon update
                updateIcons();
                
                toggle.addEventListener('click', () => {
                    html.classList.toggle('dark');
                    localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
                    updateIcons();
                });
            },
            
            initKeyboardShortcuts() {
                document.addEventListener('keydown', (e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                        e.preventDefault();
                        document.getElementById('global-search').focus();
                    }
                    if (e.key === 'Escape') {
                        document.getElementById('global-search').blur();
                    }
                });
            },
            
            initExport() {
                document.getElementById('download-csv').addEventListener('click', () => {
                    tableInstance.download('csv', 'mule-lint-report.csv');
                });
                document.getElementById('export-btn').addEventListener('click', () => {
                    router.navigate('issues');
                    tableInstance.download('csv', 'mule-lint-report.csv');
                });
            }
        };
    `;
}
