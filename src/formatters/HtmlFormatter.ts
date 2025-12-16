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

    // Collect all issues into a flat list for the table
    const allIssues: Array<{
        severity: string;
        file: string;
        line: number;
        column: number;
        message: string;
        ruleId: string;
    }> = [];

    for (const file of report.files) {
        if (!file.parsed) {
            allIssues.push({
                severity: 'error',
                file: file.relativePath,
                line: 1,
                column: 1,
                message: file.parseError || 'Failed to parse XML file',
                ruleId: 'PARSE-ERROR'
            });
            continue;
        }
        for (const issue of file.issues) {
            allIssues.push({
                severity: issue.severity,
                file: file.relativePath,
                line: issue.line,
                column: issue.column || 0,
                message: issue.message,
                ruleId: issue.ruleId
            });
        }
    }

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
            width: 95%; /* Full width as requested */
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
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

        /* Filters */
        .controls {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            align-items: center;
            background: var(--surface);
            padding: 15px;
            border-radius: 8px;
            box-shadow: var(--shadow);
        }
        .search-box {
            flex: 1;
            padding: 10px 15px;
            border: 1px solid var(--border);
            border-radius: 6px;
            font-size: 1rem;
        }
        .filter-group {
            display: flex;
            gap: 10px;
        }
        .filter-btn {
            padding: 8px 16px;
            border: 1px solid var(--border);
            background: var(--background);
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
        .filter-btn:hover:not(.active) { background: #e0e0e0; }

        /* Issues Table */
        .table-container {
            background: var(--surface);
            border-radius: 8px;
            box-shadow: var(--shadow);
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            text-align: left;
            padding: 12px 20px;
            border-bottom: 1px solid var(--border);
        }
        th { 
            background: #f9f9f9; 
            color: var(--text-secondary); 
            font-weight: 600; 
            font-size: 0.85rem; 
            text-transform: uppercase; 
            position: sticky;
            top: 0;
        }
        tr:hover { background-color: #f5f9ff; }
        tr:last-child td { border-bottom: none; }
        
        .severity-badge { 
            font-weight: 700; 
            text-transform: uppercase; 
            font-size: 0.75rem; 
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
            min-width: 60px;
            text-align: center;
        }
        .bg-error { background-color: #ffebee; color: var(--error); }
        .bg-warning { background-color: #fff3e0; color: var(--warning); }
        .bg-info { background-color: #e3f2fd; color: var(--info); }

        .file-link { font-family: monospace; font-weight: 600; color: var(--text-primary); }
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

        .empty-state {
            text-align: center;
            padding: 60px;
            color: var(--text-secondary);
        }
        .empty-icon { font-size: 3rem; margin-bottom: 1rem; }

        /* Responsive */
        @media (max-width: 768px) {
            .controls { flex-direction: column; align-items: stretch; }
            .filter-group { justify-content: space-between; }
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
                <span class="number" style="color: var(--error)">${totalErrors}</span>
                <span class="label">Errors</span>
            </div>
            <div class="card">
                <span class="number" style="color: var(--warning)">${totalWarnings}</span>
                <span class="label">Warnings</span>
            </div>
            <div class="card">
                <span class="number" style="color: var(--info)">${totalInfos}</span>
                <span class="label">Infos</span>
            </div>
            <div class="card">
                <span class="number">${report.files.length}</span>
                <span class="label">Files Scanned</span>
            </div>
        </div>

        <!-- Controls -->
        <div class="controls">
            <input type="text" id="searchInput" class="search-box" placeholder="Search by file, message, or rule..." onkeyup="filterTable()">
            <div class="filter-group">
                <button class="filter-btn active" onclick="toggleFilter('all', this)" id="btn-all">All</button>
                <button class="filter-btn" onclick="toggleFilter('error', this)" id="btn-error">Errors</button>
                <button class="filter-btn" onclick="toggleFilter('warning', this)" id="btn-warning">Warnings</button>
                <button class="filter-btn" onclick="toggleFilter('info', this)" id="btn-info">Infos</button>
            </div>
        </div>

        <!-- Main Table -->
        <div class="table-container">
            <table id="issuesTable">
                <thead>
                    <tr>
                        <th width="100">Severity</th>
                        <th width="150">Rule</th>
                        <th width="300">File</th>
                        <th width="100">Location</th>
                        <th>Message</th>
                    </tr>
                </thead>
                <tbody>
                    ${allIssues.map(issue => renderIssueRow(issue)).join('')}
                </tbody>
            </table>
            
            ${totalIssues === 0 && report.summary.parseErrors === 0 ? `
            <div class="empty-state">
                <div class="empty-icon">🎉</div>
                <h2>No issues found!</h2>
                <p>Your MuleSoft code looks clean and compliant.</p>
            </div>
            ` : ''}
            
            <div id="noResults" class="empty-state" style="display: none;">
                <h2>No matching issues found</h2>
                <p>Try adjusting your search filters.</p>
            </div>
        </div>
    </div>

    <script>
        let currentSeverity = 'all';

        function toggleFilter(severity, btn) {
            currentSeverity = severity;
            
            // Update buttons
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            filterTable();
        }

        function filterTable() {
            const input = document.getElementById('searchInput');
            const filter = input.value.toLowerCase();
            const table = document.getElementById('issuesTable');
            const tr = table.getElementsByTagName('tr');
            let visibleCount = 0;

            for (let i = 1; i < tr.length; i++) {
                const row = tr[i];
                const severity = row.getAttribute('data-severity');
                const text = row.innerText.toLowerCase();
                
                const severityMatch = currentSeverity === 'all' || severity === currentSeverity;
                const textMatch = text.includes(filter);

                if (severityMatch && textMatch) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            }
            
            // Show/hide no results message
            const noResults = document.getElementById('noResults');
            const emptyState = document.querySelector('.empty-state:not(#noResults)');
            
            if (emptyState) return; // Don't interfere if main empty state is shown
            
            if (visibleCount === 0 && tr.length > 1) {
                noResults.style.display = 'block';
                table.style.display = 'none';
            } else {
                noResults.style.display = 'none';
                table.style.display = '';
            }
        }
    </script>
</body>
</html>`;
}

function renderIssueRow(issue: any): string {
    const badgeClass = issue.severity === 'error' ? 'bg-error' : 
                      issue.severity === 'warning' ? 'bg-warning' : 'bg-info';
    
    return `<tr data-severity="${issue.severity}">
        <td><span class="severity-badge ${badgeClass}">${issue.severity}</span></td>
        <td><span class="rule-pill">${issue.ruleId}</span></td>
        <td class="file-link" title="${issue.file}">${issue.file}</td>
        <td class="location">${issue.line}:${issue.column}</td>
        <td>${escapeHtml(issue.message)}</td>
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
