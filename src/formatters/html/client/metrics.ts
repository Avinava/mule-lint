import { connectorMeta, methodStyles, envStyles, secStyles, defaultSecStyle } from './metadata';
import type { ProjectMetrics } from '../../../types/Report';
import type { ReportRuntime } from './types';
import { element, escapeHtml } from './dom';
export function renderMetrics(context: ReportRuntime): void {
  {
    const m = context.report.metrics;
    element('metric-flows').textContent = String(m.flowCount);
    element('metric-subflows').textContent = String(m.subFlowCount);
    element('metric-services').textContent = String(m.httpListenerCount || 0);
    element('metric-dw').textContent = String(m.dwTransformCount);
    element('metric-connectors').textContent = String(m.connectorConfigCount);
    // MuleSoft Exchange icon base URL
    // Connector metadata

    // Render connector type pills with logos and links
    const pillsContainer = element('connector-pills');
    if (m.connectorTypes.length > 0) {
      pillsContainer.innerHTML = m.connectorTypes
        .map((type) => {
          const meta = connectorMeta[type.toLowerCase()] || {
            name: type,
            icon: null,
            doc: null,
          };
          const docUrl = meta.doc ? 'https://docs.mulesoft.com/' + meta.doc + '/latest/' : null;
          const pillClass =
            'inline-flex items-center gap-1.5 px-2 py-0.5 text-2xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors';
          const iconHtml =
            '<span class="w-3.5 h-3.5 rounded-sm bg-slate-300 dark:bg-slate-600 inline-flex items-center justify-center text-2xs" aria-hidden="true">⚙</span>';
          if (docUrl) {
            return (
              '<a href="' +
              docUrl +
              '" target="_blank" rel="noopener" class="' +
              pillClass +
              '" title="View ' +
              escapeHtml(meta.name) +
              ' docs">' +
              iconHtml +
              '<span>' +
              escapeHtml(meta.name) +
              '</span></a>'
            );
          }
          return (
            '<span class="' +
            pillClass +
            '" title="' +
            escapeHtml(meta.name) +
            '">' +
            iconHtml +
            '<span>' +
            escapeHtml(meta.name) +
            '</span></span>'
          );
        })
        .join('');
    } else {
      element('connector-inventory').style.display = 'none';
    }
    // Render API endpoints - grouped summary
    const endpointContainer = element('endpoint-pills');
    if (m.apiEndpoints.length > 0) {
      element('endpoints-inventory').style.display = 'flex';
      // Group endpoints by method
      const byMethod: Record<string, number> = {};
      m.apiEndpoints.forEach((ep) => {
        byMethod[ep.method] = (byMethod[ep.method] || 0) + 1;
      });

      // Show total count + summary by method
      const totalBadge =
        '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">' +
        String(m.apiEndpoints.length) +
        ' endpoints</span>';
      const methodBadges = Object.entries(byMethod)
        .sort((a, b) => b[1] - a[1]) // Sort by count desc
        .map(([method, count]) => {
          const style = methodStyles[method] || {
            bg: 'bg-slate-100 dark:bg-slate-600',
            text: 'text-slate-600 dark:text-slate-300',
            dot: 'bg-slate-400',
          };
          return (
            '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 text-2xs font-medium rounded-full ' +
            style.bg +
            ' ' +
            style.text +
            '"><span class="w-2 h-2 rounded-full ' +
            style.dot +
            '"></span>' +
            escapeHtml(method) +
            ' <span class="font-bold">' +
            String(count) +
            '</span></span>'
          );
        })
        .join('');
      endpointContainer.innerHTML = totalBadge + methodBadges;
      // Populate detail list
      const endpointList = element('endpoint-list');
      {
        endpointList.innerHTML = m.apiEndpoints
          .map((ep) => {
            const style = methodStyles[ep.method] || {
              bg: 'bg-slate-100 dark:bg-slate-600',
              text: 'text-slate-600 dark:text-slate-300',
              dot: 'bg-slate-400',
            };
            return (
              '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full ' +
              style.bg +
              ' ' +
              style.text +
              '"><span class="font-bold">' +
              escapeHtml(ep.method) +
              '</span><span class="opacity-75">' +
              escapeHtml(ep.path) +
              '</span></span>'
            );
          })
          .join('');
      }
      // Toggle function
    }
    // Render environments
    const envContainer = element('environment-pills');
    if (m.environments.length > 0) {
      element('environments-inventory').style.display = 'flex';

      envContainer.innerHTML = m.environments
        .map((env) => {
          const style = envStyles[env] || {
            bg: 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300',
            dot: 'bg-slate-400',
          };
          return (
            '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 text-2xs font-medium rounded-full ' +
            style.bg +
            '"><span class="w-2 h-2 rounded-full ' +
            style.dot +
            '"></span><span>' +
            escapeHtml(env) +
            '</span></span>'
          );
        })
        .join('');
    }
    // Render security patterns
    const securityContainer = element('security-pills');
    if (m.securityPatterns.length > 0) {
      element('security-inventory').style.display = 'flex';

      securityContainer.innerHTML = m.securityPatterns
        .map((pattern) => {
          const style = secStyles[pattern] || defaultSecStyle;
          return (
            '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full ' +
            style.bg +
            '">' +
            style.icon +
            ' ' +
            escapeHtml(pattern) +
            '</span>'
          );
        })
        .join('');
    }
    // Render external services
    const serviceContainer = element('service-pills');
    if (m.externalServices.length > 0) {
      element('services-inventory').style.display = 'block';
      serviceContainer.innerHTML =
        '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">' +
        String(m.externalServices.length) +
        ' services</span>';
      const serviceList = element('service-list');
      {
        serviceList.innerHTML = m.externalServices
          .map(
            (svc) =>
              '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">🔗 ' +
              escapeHtml(svc.name) +
              ' <span class="opacity-50">(' +
              escapeHtml(svc.host) +
              ')</span></span>',
          )
          .join('');
      }
    }
    // Render schedulers
    const schedulerContainer = element('scheduler-pills');
    if (m.schedulers.length > 0) {
      element('schedulers-inventory').style.display = 'block';
      const cronCount = m.schedulers.filter((s) => s.type === 'cron').length;
      const fixedCount = m.schedulers.filter((s) => s.type === 'fixed').length;
      let summary =
        '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">' +
        String(m.schedulers.length) +
        ' jobs</span>';
      if (cronCount > 0)
        summary +=
          '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400">⏰ cron ' +
          String(cronCount) +
          '</span>';
      if (fixedCount > 0)
        summary +=
          '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400">🔄 fixed ' +
          String(fixedCount) +
          '</span>';
      schedulerContainer.innerHTML = summary;
      const schedulerList = element('scheduler-list');
      {
        schedulerList.innerHTML = m.schedulers
          .map((sched) => {
            const icon = sched.type === 'cron' ? '⏰' : '🔄';
            const bg =
              sched.type === 'cron'
                ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400'
                : 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400';
            return (
              '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded-full ' +
              bg +
              '">' +
              icon +
              ' ' +
              escapeHtml(sched.value) +
              ' <span class="opacity-50">(' +
              escapeHtml(sched.flow) +
              ')</span></span>'
            );
          })
          .join('');
      }
    }
    // Render Quality Ratings (A-E)
    renderQualityRatings(m);
  }
}
export function renderQualityRatings(m: ProjectMetrics): void {
  const ratingColors = {
    A: 'bg-emerald-500 text-white',
    B: 'bg-lime-500 text-white',
    C: 'bg-amber-500 text-white',
    D: 'bg-orange-500 text-white',
    E: 'bg-rose-500 text-white',
    '-': 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300',
  };
  const hasRatings = m.complexity || m.maintainability || m.reliability || m.security;
  if (hasRatings) {
    element('quality-ratings').style.display = 'block';
    if (m.complexity) {
      const rating = m.complexity.rating;
      const ratingEl = element('rating-complexity');
      ratingEl.textContent = rating;
      ratingEl.className =
        'w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ' +
        (ratingColors[rating] || ratingColors['-']);
      element('complexity-avg').textContent = 'Avg: ' + String(m.complexity.average || 0);
    }
    if (m.maintainability) {
      const rating = m.maintainability.rating;
      const ratingEl = element('rating-maintainability');
      ratingEl.textContent = rating;
      ratingEl.className =
        'w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ' +
        (ratingColors[rating] || ratingColors['-']);
      element('tech-debt').textContent = m.maintainability.technicalDebt || '0min';
    }
    if (m.reliability) {
      const rating = m.reliability.rating;
      const ratingEl = element('rating-reliability');
      ratingEl.textContent = rating;
      ratingEl.className =
        'w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ' +
        (ratingColors[rating] || ratingColors['-']);
      element('bug-count').textContent = String(m.reliability.bugs || 0) + ' bugs';
    }
    if (m.security) {
      const rating = m.security.rating;
      const ratingEl = element('rating-security');
      ratingEl.textContent = rating;
      ratingEl.className =
        'w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ' +
        (ratingColors[rating] || ratingColors['-']);
      const vulns = m.security.vulnerabilities || 0;
      element('vuln-count').textContent = String(vulns) + ' vulnerabilities';
    }
  }
}
