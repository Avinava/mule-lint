import * as xpath from 'xpath';
import { ProjectMetrics } from '../types/Report';
import { ComplexityCalculator } from './ComplexityCalculator';

/**
 * Helper to select nodes via XPath (non-namespace-aware for metrics collection)
 */
function selectNodes(expression: string, context: Node): Node[] {
  try {
    const result = xpath.select(expression, context);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

/**
 * Safely get an attribute value from a Node, returning a fallback if missing.
 */
function getAttr(node: Node, name: string, fallback = ''): string {
  const el = node as Element;
  return el.getAttribute(name) || fallback;
}

/**
 * Collects project metrics from a parsed Mule XML document.
 *
 * Extracted from LintEngine.collectFileMetrics() to reduce monolith
 * size and allow independent testing of metrics logic.
 */
export function collectFileMetrics(
  doc: Document,
  relativePath: string,
  metrics: ProjectMetrics,
): void {
  try {
    // ── Flows ──────────────────────────────────────────────
    const flows = selectNodes('//*[local-name()="flow"]', doc);
    const flowCount = flows.length;
    metrics.flowCount += flowCount;

    // Per-flow complexity
    for (const flow of flows) {
      const flowName = getAttr(flow, 'name', 'unnamed');
      try {
        const result = ComplexityCalculator.calculateFlowComplexity(flow);
        const breakdown: Record<string, number> = {};
        for (const detail of result.details) {
          breakdown[detail.type] = detail.count;
        }
        metrics.flowComplexityData.push({
          flowName,
          file: relativePath,
          complexity: result.complexity,
          rating: result.rating,
          breakdown,
        });
      } catch {
        // Skip complexity calculation on error
      }
    }

    // ── Sub-flows ──────────────────────────────────────────
    const subFlows = selectNodes('//*[local-name()="sub-flow"]', doc);
    const subFlowCount = subFlows.length;
    metrics.subFlowCount += subFlowCount;

    // ── DataWeave transforms ───────────────────────────────
    const dwTransforms = selectNodes(
      '//*[local-name()="transform" and (namespace-uri()="http://www.mulesoft.org/schema/mule/ee/core" or contains(local-name(..), "ee:"))]',
      doc,
    );
    // Fallback: also check for ee:transform in any namespace
    const dwTransforms2 = selectNodes('//*[contains(name(), ":transform")]', doc);
    const dwCount = dwTransforms.length > 0 ? dwTransforms.length : dwTransforms2.length;
    metrics.dwTransformCount += dwCount;

    // ── Connector configs ──────────────────────────────────
    const configs = selectNodes(
      '//*[contains(local-name(), "-config") or local-name()="config" or contains(local-name(), "-connection")]',
      doc,
    );
    metrics.connectorConfigCount += configs.length;

    // Extract connector types from config elements
    for (const config of configs) {
      const nodeName = config.nodeName;
      const prefix = nodeName.split(':')[0];
      if (prefix && !metrics.connectorTypes.includes(prefix)) {
        metrics.connectorTypes.push(prefix);
      }
    }

    // ── Connector types from namespace declarations ────────
    const root = doc.documentElement;
    const muleNsPattern = /^http:\/\/www\.mulesoft\.org\/schema\/mule\/(.+)$/;
    const skipList = ['core', 'documentation', 'ee/core', 'doc'];

    for (const attr of Array.from(root.attributes)) {
      if (attr.name.startsWith('xmlns:')) {
        const match = muleNsPattern.exec(attr.value);
        const connector = match?.[1];
        if (connector) {
          if (!skipList.includes(connector) && !metrics.connectorTypes.includes(connector)) {
            metrics.connectorTypes.push(connector);
          }
        }
      }
    }

    // ── HTTP listeners ─────────────────────────────────────
    const listeners = selectNodes('//*[local-name()="listener"]', doc);
    metrics.httpListenerCount += listeners.length;

    // ── Error handlers (try scopes) ────────────────────────
    const trys = selectNodes('//*[local-name()="try"]', doc);
    metrics.errorHandlerCount += trys.length;

    // ── Choice routers ─────────────────────────────────────
    const choices = selectNodes('//*[local-name()="choice"]', doc);
    metrics.choiceRouterCount += choices.length;

    // ── API endpoints from flow names (APIkit pattern) ─────
    for (const flow of flows) {
      const flowName = getAttr(flow, 'name');
      // Pattern: method:\\path:config-name (e.g., "get:\\customers:api-config")
      const match = flowName.match(/^(get|post|put|patch|delete|head|options):\\(.+?)(?::|$)/i);
      const methodMatch = match?.[1];
      const pathMatch = match?.[2];
      if (methodMatch && pathMatch) {
        const method = methodMatch.toUpperCase();
        const path = pathMatch.replace(/\\/g, '/');
        if (!metrics.apiEndpoints.some((ep) => ep.path === path && ep.method === method)) {
          metrics.apiEndpoints.push({ path: '/' + path, method });
        }
      }
    }

    // Also extract HTTP listener paths
    for (const listener of listeners) {
      const path = getAttr(listener, 'path');
      if (path && !path.includes('*') && !metrics.apiEndpoints.some((ep) => ep.path === path)) {
        metrics.apiEndpoints.push({ path, method: 'ALL' });
      }
    }

    // ── Security patterns ──────────────────────────────────
    for (const attr of Array.from(root.attributes)) {
      if (attr.name.startsWith('xmlns:')) {
        const ns = attr.value.toLowerCase();
        if (ns.includes('tls') && !metrics.securityPatterns.includes('TLS')) {
          metrics.securityPatterns.push('TLS');
        }
        if (ns.includes('oauth') && !metrics.securityPatterns.includes('OAuth')) {
          metrics.securityPatterns.push('OAuth');
        }
      }
    }

    const secureProps = selectNodes('//*[contains(local-name(), "secure-properties")]', doc);
    if (secureProps.length > 0 && !metrics.securityPatterns.includes('Secure Properties')) {
      metrics.securityPatterns.push('Secure Properties');
    }

    const basicAuth = selectNodes('//*[contains(local-name(), "basic-authentication")]', doc);
    if (basicAuth.length > 0 && !metrics.securityPatterns.includes('Basic Auth')) {
      metrics.securityPatterns.push('Basic Auth');
    }

    // ── External services (HTTP request configs) ───────────
    const requestConfigs = selectNodes('//*[local-name()="request-config"]', doc);
    for (const config of requestConfigs) {
      const name = getAttr(config, 'name', 'unknown');
      const host = getAttr(config, 'host');
      const basePath = getAttr(config, 'basePath');
      const hostValue = host || basePath || 'external';
      if (!metrics.externalServices.some((s) => s.name === name)) {
        metrics.externalServices.push({ name, host: hostValue });
      }
    }

    // ── Schedulers ─────────────────────────────────────────
    const schedulerTriggers = selectNodes('//*[local-name()="scheduling-strategy"]/*', doc);
    for (const trigger of schedulerTriggers) {
      const triggerElement = trigger as Element;
      const triggerName = triggerElement.localName;
      const parent = triggerElement.parentNode?.parentNode;
      const flowName = parent ? getAttr(parent, 'name', 'unknown') : 'unknown';

      if (triggerName === 'cron') {
        const expression = getAttr(trigger, 'expression');
        metrics.schedulers.push({ type: 'cron', value: expression, flow: flowName });
      } else if (triggerName === 'fixed-frequency') {
        const freq = getAttr(trigger, 'frequency');
        const unit = getAttr(trigger, 'timeUnit', 'MILLISECONDS');
        metrics.schedulers.push({ type: 'fixed', value: freq + ' ' + unit, flow: flowName });
      }
    }

    // ── File complexity ────────────────────────────────────
    const totalFlows = flowCount + subFlowCount;
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (totalFlows >= 10) {
      complexity = 'complex';
    } else if (totalFlows >= 5) {
      complexity = 'medium';
    }
    metrics.fileComplexity[relativePath] = complexity;
  } catch {
    // Silently skip metrics collection on error
  }
}
