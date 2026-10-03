import { Chart } from 'chart.js/auto';
import type { ReportRuntime } from './types';
import { canvas, element } from './dom';
export function renderCharts(context: ReportRuntime): void {
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = textColor;
  // Top Rules
  const ruleCounts: Record<string, number> = {};
  const ruleNames: Record<string, string> = {};
  context.allIssues.forEach((i) => {
    ruleCounts[i.ruleId] = (ruleCounts[i.ruleId] || 0) + 1;
    ruleNames[i.ruleId] = i.ruleName;
  });
  const sortedRules = Object.entries(ruleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  new Chart(canvas('chart-rules'), {
    type: 'bar',
    data: {
      labels: sortedRules.map(([id]) => {
        const name = ruleNames[id] ?? id;
        return name.length > 30 ? name.substring(0, 27) + '...' : name;
      }),
      datasets: [
        {
          data: sortedRules.map((x) => x[1]),
          backgroundColor: '#10b981',
          borderRadius: 4,
          barThickness: 16,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: gridColor }, ticks: { stepSize: 1 } },
        y: { grid: { display: false } },
      },
    },
  });
  // Severity donut
  new Chart(canvas('chart-severity'), {
    type: 'doughnut',
    data: {
      labels: ['Errors', 'Warnings', 'Info'],
      datasets: [
        {
          data: [
            context.report.summary.bySeverity.error,
            context.report.summary.bySeverity.warning,
            context.report.summary.bySeverity.info,
          ],
          backgroundColor: ['#e11d48', '#d97706', '#0284c7'],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 12,
            font: { size: 10 },
          },
        },
      },
    },
  });
  // Categories bar
  const catCounts: Record<string, number> = {};
  context.allIssues.forEach((i) => (catCounts[i.category] = (catCounts[i.category] || 0) + 1));
  const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const categoryColorPalette = [
    '#10b981',
    '#06b6d4',
    '#8b5cf6',
    '#f59e0b',
    '#ef4444',
    '#ec4899',
    '#0ea5e9',
    '#84cc16',
    '#f97316',
    '#6366f1',
  ];
  new Chart(canvas('chart-categories'), {
    type: 'bar',
    data: {
      labels: sortedCats.map(([cat]) => cat.charAt(0).toUpperCase() + cat.slice(1)),
      datasets: [
        {
          data: sortedCats.map((x) => x[1]),
          backgroundColor: sortedCats.map(
            (_, i) => categoryColorPalette[i % categoryColorPalette.length] ?? '#10b981',
          ),
          borderRadius: 4,
          barThickness: 20,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: gridColor } },
        y: { grid: { display: false } },
      },
      onClick: (e, elements) => {
        if (elements.length > 0) {
          const selected = elements[0];
          const category = selected && sortedCats[selected.index];
          if (category) context.router.toggleCategory(category[0]);
        }
      },
    },
  });
  // Flow Complexity Chart
  const complexityData = context.report.metrics.flowComplexityData;
  if (complexityData.length > 0) {
    element('complexity-chart-container').style.display = 'block';
    // Sort by complexity (highest first) and take top 10
    const sortedComplexity = [...complexityData]
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10);
    // Color based on rating
    const ratingColors = { low: '#10b981', moderate: '#f59e0b', high: '#ef4444' };
    new Chart(canvas('chart-complexity'), {
      type: 'bar',
      data: {
        labels: sortedComplexity.map((f) => {
          const name = f.flowName;
          return name.length > 40 ? name.substring(0, 37) + '...' : name;
        }),
        datasets: [
          {
            data: sortedComplexity.map((f) => f.complexity),
            backgroundColor: sortedComplexity.map((f) => ratingColors[f.rating] || '#6b7280'),
            borderRadius: 4,
            barThickness: 18,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const flow = sortedComplexity[context.dataIndex];
                if (!flow) return [];
                const breakdown = Object.entries(flow.breakdown)
                  .map(([k, v]) => k + ': ' + String(v))
                  .join(', ');
                return [
                  'Complexity: ' + String(flow.complexity) + ' (' + flow.rating + ')',
                  breakdown || 'Base complexity only',
                ];
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: gridColor },
            title: { display: true, text: 'Cyclomatic Complexity', font: { size: 10 } },
          },
          y: { grid: { display: false } },
        },
      },
    });
  }
}
