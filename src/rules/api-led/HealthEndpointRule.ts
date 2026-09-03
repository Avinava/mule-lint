import { ValidationContext, Issue } from '../../types';
import { ProjectRule } from '../base/ProjectRule';

/**
 * API-011: Health Endpoint Present
 *
 * An HTTP-exposed application should offer a health endpoint so load balancers
 * and monitoring can distinguish a running worker from a healthy one.
 *
 * Evidence is a recognised indicator in either a literal listener path or a
 * flow name. Non-HTTP batch, library, and event-only projects are skipped.
 */
export class HealthEndpointRule extends ProjectRule {
  id = 'API-011';
  name = 'Health Endpoint Present';
  description = 'HTTP-exposed applications should provide a health endpoint';
  severity = 'info' as const;
  category = 'api-led' as const;

  private static readonly DEFAULT_INDICATORS = [
    'health',
    'healthz',
    'ping',
    'status',
    'heartbeat',
    'ready',
    'readiness',
    'live',
    'liveness',
  ];

  protected validateProject(context: ValidationContext): Issue[] {
    const projectContext = context.projectContext;
    if (!projectContext?.hasHttpListener) {
      return [];
    }

    const indicators = this.getOption(
      context,
      'indicators',
      HealthEndpointRule.DEFAULT_INDICATORS,
    ).map((indicator) => indicator.toLowerCase());

    const endpoints = projectContext.listenerEndpoints ?? [];
    const hasHealthEndpoint = endpoints.some((endpoint) => {
      const candidates = [endpoint.path ?? '', endpoint.flowName ?? ''];
      return candidates.some((candidate) =>
        this.toSegments(candidate).some((segment) => indicators.includes(segment)),
      );
    });

    if (hasHealthEndpoint) {
      return [];
    }

    return [
      this.createProjectIssue('No health endpoint was found for an HTTP-exposed application', {
        suggestion:
          'Add a flow with a listener on /health returning a small JSON status payload, so monitoring can check liveness',
      }),
    ];
  }

  /**
   * Split a path or flow name into lowercase word segments.
   *
   * Segment equality rather than substring matching keeps paths such as
   * `/deliveries` — which contains "live" — from being read as a health check.
   */
  private toSegments(value: string): string[] {
    return value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((segment) => segment.length > 0);
  }
}
