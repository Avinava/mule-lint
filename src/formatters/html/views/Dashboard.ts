/**
 * Dashboard View
 * Main dashboard with metrics, charts, and summary
 */

import { renderMetricCard } from '../components/MetricCard';
import { icons } from '../components/Icons';
import { renderQualityRatingsSection } from '../sections/QualityRatings';
import { renderLintSummarySection, LintSummaryProps } from '../sections/LintSummary';

export interface DashboardViewProps extends LintSummaryProps {
    // LintSummaryProps includes: errors, warnings, info, filesScanned
}

export function renderDashboardView(props: DashboardViewProps): string {
    return `
            <!-- ===== DASHBOARD VIEW ===== -->
            <div id="view-dashboard" class="h-full overflow-y-auto p-6">
                <!-- Header -->
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">mule-lint dashboard</h2>
                    <p class="text-base text-slate-500 dark:text-slate-400 mt-2">
                        Scanned <strong class="text-slate-700 dark:text-slate-200">${props.filesScanned} files</strong> • Found <strong class="text-rose-600 dark:text-rose-400">${props.errors} errors</strong>, 
                        <strong class="text-amber-600 dark:text-amber-400">${props.warnings} warnings</strong>, and 
                        <strong class="text-sky-600 dark:text-sky-400">${props.info} suggestions</strong>
                    </p>
                </div>

                <!-- Project Metrics -->
                <div class="mb-6">
                    <div class="mb-3">
                        <div class="flex items-center gap-2">
                            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Project Metrics</h3>
                            <button class="info-btn" onclick="modal.open('project-metrics')">?</button>
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Architecture overview: flows, components, and configurations</p>
                    </div>
                    <div class="grid grid-cols-5 gap-3">
                        ${renderMetricCard({
        id: 'metric-flows',
        label: 'Flows',
        value: '-',
        sublabel: 'Entry points',
        color: 'violet',
        icon: icons.flow
    })}
                        ${renderMetricCard({
        id: 'metric-subflows',
        label: 'Sub-Flows',
        value: '-',
        sublabel: 'Reusable logic',
        color: 'teal',
        icon: icons.subflow
    })}
                        ${renderMetricCard({
        id: 'metric-services',
        label: 'Services',
        value: '-',
        sublabel: 'HTTP endpoints',
        color: 'cyan',
        icon: icons.service
    })}
                        ${renderMetricCard({
        id: 'metric-dw',
        label: 'DataWeave',
        value: '-',
        sublabel: 'Transforms',
        color: 'orange',
        icon: icons.dataweave
    })}
                        ${renderMetricCard({
        id: 'metric-connectors',
        label: 'Connectors',
        value: '-',
        sublabel: 'Configurations',
        color: 'indigo',
        icon: icons.connector
    })}
                    </div>
                    <!-- Connector Inventory -->
                    <div id="connector-inventory" class="mt-3 flex items-center gap-2 flex-wrap">
                        <span class="text-2xs font-medium text-slate-500 dark:text-slate-400">Connectors:</span>
                        <div id="connector-pills" class="flex flex-wrap gap-1.5"></div>
                    </div>
                    <!-- API Endpoints -->
                    <div id="endpoints-inventory" class="mt-2" style="display: none;">
                        <div class="flex items-center gap-2 flex-wrap cursor-pointer" onclick="window.toggleEndpoints()">
                            <span class="text-2xs font-medium text-slate-500 dark:text-slate-400">API Endpoints:</span>
                            <div id="endpoint-pills" class="flex flex-wrap gap-1.5"></div>
                            <svg id="endpoints-chevron" class="w-4 h-4 text-slate-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                        <div id="endpoint-details" class="hidden mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                            <div id="endpoint-list" class="flex flex-wrap gap-1.5"></div>
                        </div>
                    </div>
                    <!-- Environments -->
                    <div id="environments-inventory" class="mt-2 flex items-center gap-2 flex-wrap" style="display: none;">
                        <span class="text-2xs font-medium text-slate-500 dark:text-slate-400">Environments:</span>
                        <div id="environment-pills" class="flex flex-wrap gap-1.5"></div>
                    </div>
                    <!-- Security Patterns -->
                    <div id="security-inventory" class="mt-2 flex items-center gap-2 flex-wrap" style="display: none;">
                        <span class="text-2xs font-medium text-slate-500 dark:text-slate-400">Security:</span>
                        <div id="security-pills" class="flex flex-wrap gap-1.5"></div>
                    </div>
                    <!-- External Services -->
                    <div id="services-inventory" class="mt-2" style="display: none;">
                        <div class="flex items-center gap-2 flex-wrap cursor-pointer" onclick="window.toggleServices()">
                            <span class="text-2xs font-medium text-slate-500 dark:text-slate-400">External Services:</span>
                            <div id="service-pills" class="flex flex-wrap gap-1.5"></div>
                            <svg id="services-chevron" class="w-4 h-4 text-slate-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                        <div id="service-details" class="hidden mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div id="service-list" class="flex flex-wrap gap-1.5"></div>
                        </div>
                    </div>
                    <!-- Schedulers -->
                    <div id="schedulers-inventory" class="mt-2" style="display: none;">
                        <div class="flex items-center gap-2 flex-wrap cursor-pointer" onclick="window.toggleSchedulers()">
                            <span class="text-2xs font-medium text-slate-500 dark:text-slate-400">Schedulers:</span>
                            <div id="scheduler-pills" class="flex flex-wrap gap-1.5"></div>
                            <svg id="schedulers-chevron" class="w-4 h-4 text-slate-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                        <div id="scheduler-details" class="hidden mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div id="scheduler-list" class="flex flex-wrap gap-1.5"></div>
                        </div>
                    </div>
                </div>

                ${renderQualityRatingsSection()}

                ${renderLintSummarySection(props)}

                <!-- Charts -->
                <div class="grid grid-cols-3 gap-4 mb-6">
                    <div class="col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <div class="mb-4">
                            <div class="flex items-center gap-2">
                                <h3 class="text-base font-semibold text-slate-700 dark:text-slate-200">Top Violated Rules</h3>
                                <button class="info-btn" onclick="modal.open('categories')">?</button>
                            </div>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Most frequent rule violations across the project</p>
                        </div>
                        <div class="h-[180px]">
                            <canvas id="chart-rules"></canvas>
                        </div>
                    </div>
                    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <div class="mb-4">
                            <h3 class="text-base font-semibold text-slate-700 dark:text-slate-200">Severity Distribution</h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Overview of issue impact levels</p>
                        </div>
                        <div class="h-[180px] flex items-center justify-center">
                            <canvas id="chart-severity"></canvas>
                        </div>
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <div class="mb-4">
                        <h3 class="text-base font-semibold text-slate-700 dark:text-slate-200">Issues by Category</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Breakdown of issues by functional category</p>
                    </div>
                    <div class="h-[240px]">
                        <canvas id="chart-categories"></canvas>
                    </div>
                </div>

                <!-- Flow Complexity Chart -->
                <div id="complexity-chart-container" class="mt-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5" style="display: none;">
                    <div class="mb-4">
                        <h3 class="text-base font-semibold text-slate-700 dark:text-slate-200">Flow Complexity</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cyclomatic complexity scores for flows (higher = more complex)</p>
                    </div>
                    <div class="h-[300px]">
                        <canvas id="chart-complexity"></canvas>
                    </div>
                </div>
            </div>
    `;
}
