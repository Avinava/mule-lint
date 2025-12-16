import { LintReport } from '../types/Report';
import { Issue, Severity } from '../types/Rule';

/**
 * Format lint report as a modern, interactive HTML page
 */
export function formatHtml(report: LintReport): string {
    const title = 'Mule-Lint Report';
    const date = new Date(report.timestamp).toLocaleString();
    
    // Calculate stats
    const totalErrors = report.summary.bySeverity.error;
    const totalWarnings = report.summary.bySeverity.warning;
    const totalInfos = report.summary.bySeverity.info;
    const totalIssues = totalErrors + totalWarnings + totalInfos;
    const score = Math.max(0, 100 - (totalErrors * 5) - (totalWarnings * 1));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        :root {
            --primary: #00A1DF; /* MuleSoft Blue */
            --primary-dark: #0077A5;
            --success: #4CAF50;
            --error: #F44336;
            --warning: #FF9800;
            --info: #2196F3;
            --surface: #ffffff;
            --background: #f4f6f8;
            --text-primary: #172b4d;
            --text-secondary: #6b778c;
            --border: #dfe1e6;
            --shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            margin: 0;
            padding: 0;
            background-color: var(--background);
            color: var(--text-primary);
            line-height: 1.6;
        }

        /* Layout */
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Header */
        header {
            background-color: var(--surface);
            padding: 1rem 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            margin-bottom: 2rem;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        h1 { margin: 0; color: var(--primary); font-size: 1.5rem; display: flex; align-items: center; gap: 10px; }
        .meta { color: var(--text-secondary); font-size: 0.9em; }

        /* Dashboard Grid */
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        /* Cards */
        .card {
            background: var(--surface);
            padding: 24px;
            border-radius: 8px;
            box-shadow: var(--shadow);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }
        .card:hover { transform: translateY(-2px); }
        
        .number { font-size: 3rem; font-weight: 700; line-height: 1; margin-bottom: 0.5rem; }
        .label { color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }

        .score-ring {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            font-weight: bold;
            color: var(--primary);
            border: 8px solid var(--background);
            position: relative;
            background: conic-gradient(var(--primary) calc(var(--score) * 1%), var(--border) 0);
        }
        .score-inner {
            width: 80px;
            height: 80px;
            background: var(--surface);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
        }

        /* Filters */
        .controls {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .search-box {
            flex: 1;
            padding: 10px 15px;
            border: 1px solid var(--border);
            border-radius: 6px;
            font-size: 1rem;
            min-width: 200px;
        }
        .filter-btn {
            padding: 8px 16px;
            border: 1px solid var(--border);
            background: var(--surface);
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .filter-btn.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }
        .filter-btn:hover:not(.active) { background: #f0f0f0; }

        /* File List */
        .file-section {
            background: var(--surface);
            border-radius: 8px;
            box-shadow: var(--shadow);
            margin-bottom: 20px;
            overflow: hidden;
        }
        .file-header {
            padding: 15px 20px;
            background: #fafafa;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            user-select: none;
        }
        .file-header:hover { background: #f0f0f0; }
        .file-path { font-weight: 600; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; color: var(--text-primary); }
        .badge-group { display: flex; gap: 8px; }
        .badge { padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; color: white; min-width: 20px; text-align: center; }
        .badge.error { background: var(--error); }
        .badge.warning { background: var(--warning); }
        .badge.info { background: var(--info); }

        /* Issues Table */
        .issues-table {
            width: 100%;
            border-collapse: collapse;
            display: table; /* Default visible */
        }
        .issues-table.collapsed { display: none; }
        
        th, td {
            text-align: left;
            padding: 12px 20px;
            border-bottom: 1px solid var(--border);
        }
        th { background: #f9f9f9; color: var(--text-secondary); font-weight: 600; font-size: 0.85rem; text-transform: uppercase; }
        tr:last-child td { border-bottom: none; }
        
        .severity-cell { font-weight: 700; text-transform: uppercase; font-size: 0.8rem; }
        .location { font-family: monospace; color: var(--text-secondary); }
        .rule-pill {
            display: inline-block;
            background: #eef2f5;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            color: var(--text-secondary);
            font-family: monospace;
            border: 1px solid #dce1e6;
        }
        
        .color-error { color: var(--error); }
        .color-warning { color: var(--warning); }
        .color-info { color: var(--info); }

        .empty-state {
            text-align: center;
            padding: 60px;
            color: var(--text-secondary);
        }
        .empty-icon { font-size: 3rem; margin-bottom: 1rem; }

        /* Responsive */
        @media (max-width: 768px) {
            .file-header { flex-direction: column; align-items: flex-start; gap: 10px; }
            .badge-group { align-self: flex-start; }
        }
    </style>
</head>
<body>
    <header>
        <div class="container header-content">
            <div>
                <h1>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    ${title}
                </h1>
                <div class="meta">Generated on ${date}</div>
            </div>
            <div>
                 <a href="#" onclick="window.print()" style="color: var(--primary); text-decoration: none; font-weight: 500;">Download / Print</a>
            </div>
        </div>
    </header>

    <div class="container">
        <!-- Dashboard -->
        <div class="dashboard">
            <div class="card">
                <div class="score-ring" style="--score: ${score}">
                    <div class="score-inner">${score}</div>
                </div>
                <span class="label" style="margin-top: 10px;">Health Score</span>
            </div>
            <div class="card">
                <span class="number" style="color: var(--error)">${totalErrors}</span>
                <span class="label">Errors</span>
            </div>
            <div class="card">
                <span class="number" style="color: var(--warning)">${totalWarnings}</span>
                <span class="label">Warnings</span>
            </div>
            <div class="card">
                <span class="number" style="color: default">${report.files.length}</span>
                <span class="label">Files Scanned</span>
            </div>
        </div>

        <!-- Controls -->
        <div class="controls">
            <input type="text" id="searchInput" class="search-box" placeholder="Search files, rules, or messages..." onkeyup="filterIssues()">
            
            <button class="filter-btn active" onclick="toggleFilter('all', this)" id="btn-all">All</button>
            <button class="filter-btn" onclick="toggleFilter('error', this)" id="btn-error">Errors <span class="badge error">${totalErrors}</span></button>
            <button class="filter-btn" onclick="toggleFilter('warning', this)" id="btn-warning">Warnings <span class="badge warning">${totalWarnings}</span></button>
        </div>

        <!-- File List -->
        <div id="report-content">
            ${renderFiles(report)}
        </div>
        
        ${totalIssues === 0 && report.summary.parseErrors === 0 ? `
        <div class="empty-state">
            <div class="empty-icon">🎉</div>
            <h2>No issues found!</h2>
            <p>Your MuleSoft code looks clean and compliant.</p>
        </div>
        ` : ''}

    </div>

    <script>
        let currentFilter = 'all';

        function toggleFilter(filter, btn) {
            currentFilter = filter;
            
            // Update buttons
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            filterIssues();
        }

        function filterIssues() {
            const search = document.getElementById('searchInput').value.toLowerCase();
            const fileSections = document.querySelectorAll('.file-section');
            
            fileSections.forEach(section => {
                const text = section.innerText.toLowerCase();
                const matchesSearch = text.includes(search);
                
                // For filtering by severity, we check if the section has relevant issues
                // This is a simplified approach: we either show or hide the whole file if it matches
                // Ideally we filter rows, but file-level hiding is often better for overview
                
                let matchesFilter = true;
                if (currentFilter !== 'all') {
                    matchesFilter = section.dataset.has.includes(currentFilter);
                }

                if (matchesSearch && matchesFilter) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });
        }

        function toggleFile(header) {
            const table = header.nextElementSibling;
            table.classList.toggle('collapsed');
        }
    </script>
</body>
</html>`;
}

function renderFiles(report: LintReport): string {
    return report.files
        .filter(f => f.issues.length > 0 || !f.parsed)
        .map(file => {
            const errorCount = file.issues.filter(i => i.severity === 'error').length + (file.parsed ? 0 : 1);
            const warningCount = file.issues.filter(i => i.severity === 'warning').length;
            const infoCount = file.issues.filter(i => i.severity === 'info').length;
            
            const hasTypes = [];
            if (errorCount > 0) hasTypes.push('error');
            if (warningCount > 0) hasTypes.push('warning');
            if (infoCount > 0) hasTypes.push('info');

            return `<div class="file-section" data-has="${hasTypes.join(' ')}">
                <div class="file-header" onclick="toggleFile(this)">
                    <span class="file-path">${file.relativePath}</span>
                    <div class="badge-group">
                        ${!file.parsed ? '<span class="badge error">PARSE</span>' : ''}
                        ${errorCount > 0 ? `<span class="badge error">${errorCount}</span>` : ''}
                        ${warningCount > 0 ? `<span class="badge warning">${warningCount}</span>` : ''}
                    </div>
                </div>
                <table class="issues-table">
                    <thead>
                        <tr>
                            <th width="80">Severity</th>
                            <th width="100">Location</th>
                            <th>Message</th>
                            <th width="120">Rule</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${!file.parsed ? renderParseError(file) : ''}
                        ${file.issues.map(issue => renderIssue(issue)).join('')}
                    </tbody>
                </table>
            </div>`;
        }).join('');
}

function renderParseError(file: any): string {
    return `<tr>
        <td class="severity-cell color-error">ERROR</td>
        <td class="location">1:1</td>
        <td>
            <div><strong>Failed to parse XML file</strong></div>
            <div style="font-size: 0.9em; margin-top: 4px; color: var(--text-secondary);">
                ${file.parseError || 'Unknown error'}
            </div>
        </td>
        <td><span class="rule-pill">PARSE-ERROR</span></td>
    </tr>`;
}

function renderIssue(issue: Issue): string {
    return `<tr>
        <td class="severity-cell color-${issue.severity}">${issue.severity}</td>
        <td class="location">${issue.line}:${issue.column || 0}</td>
        <td>${escapeHtml(issue.message)}</td>
        <td><span class="rule-pill">${issue.ruleId}</span></td>
    </tr>`;
}

function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
