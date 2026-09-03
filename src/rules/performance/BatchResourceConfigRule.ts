import { ValidationContext, Issue } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * PERF-003: Batch Resource Configuration
 *
 * A batch job that declares neither blockSize nor maxConcurrency runs on
 * runtime defaults, which is rarely the right shape for the record size and
 * downstream capacity of a specific integration.
 *
 * The rule checks presence and basic validity only. Positive integer literals
 * and property or DataWeave expressions both pass; recommending particular
 * numeric values is out of scope for static analysis.
 */
export class BatchResourceConfigRule extends BaseRule {
  id = 'PERF-003';
  name = 'Batch Resource Configuration';
  description = 'Batch jobs should declare blockSize or maxConcurrency';
  severity = 'warning' as const;
  category = 'performance' as const;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    for (const job of this.select('//*[local-name()="job"]', doc)) {
      if (!this.isBatchJob(job)) {
        continue;
      }

      const blockSize = this.getAttribute(job, 'blockSize');
      const maxConcurrency = this.getAttribute(job, 'maxConcurrency');

      const configured = [blockSize, maxConcurrency].filter((value) => this.isConfigured(value));
      if (configured.length > 0) {
        continue;
      }

      const jobName =
        this.getAttribute(job, 'jobName') ?? this.getNameAttribute(job) ?? 'batch job';
      issues.push(
        this.createIssue(
          job,
          `Batch job "${jobName}" declares neither blockSize nor maxConcurrency`,
          {
            suggestion:
              'Set blockSize and maxConcurrency to match the record size and downstream capacity, for example blockSize="${batch.block-size}" maxConcurrency="4"',
          },
        ),
      );
    }

    return issues;
  }

  /** Distinguish a batch:job from any other element named "job". */
  private isBatchJob(job: Node): boolean {
    const element = job as Element;
    const namespace = element.namespaceURI ?? '';
    const prefix = element.prefix ?? '';
    return prefix === 'batch' || namespace.endsWith('/mule/batch');
  }

  /** A value counts as configured when it is a positive integer or an expression. */
  private isConfigured(value: string | null): boolean {
    if (!value) {
      return false;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return false;
    }
    if (trimmed.includes('${') || trimmed.includes('#[')) {
      return true;
    }
    return /^\d+$/.test(trimmed) && Number(trimmed) > 0;
  }
}
