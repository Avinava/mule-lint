import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

const SALESFORCE_NAMESPACE = 'contains(namespace-uri(), "/mule/salesforce")';
const REPLAY_LISTENERS = `//*[${SALESFORCE_NAMESPACE} and (local-name()="replay-channel-listener" or local-name()="replay-topic-listener")]`;

/**
 * SF-003: Salesforce Replay Listener Loses Events
 *
 * A Replay channel or topic listener with `replayOption="ONLY_NEW"` receives
 * only events broadcast after it subscribes, so events published while the
 * application is stopped or redeploying are lost. `autoReplay="true"` resumes
 * from the last successfully processed replay ID instead and is not reported.
 *
 * Source: https://docs.mulesoft.com/salesforce-connector/latest/salesforce-connector-reference
 * (Replay Option) and salesforce-connector-processing-events (Resume from the Last Replay Id).
 */
export class ReplayOnlyNewRule extends BaseRule {
  id = 'SF-003';
  name = 'Salesforce Replay Listener Loses Events';
  description =
    'Salesforce Replay listeners using ONLY_NEW without autoReplay lose events published while the app is down';
  severity = 'warning' as const;
  category = 'operations' as const;
  override issueType: IssueType = 'bug';

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    for (const listener of this.select(REPLAY_LISTENERS, doc)) {
      if (this.getAttribute(listener, 'replayOption') !== 'ONLY_NEW') continue;
      if (this.getAttribute(listener, 'autoReplay') === 'true') continue;

      const target =
        this.getAttribute(listener, 'streamingChannel') ??
        this.getAttribute(listener, 'topic') ??
        'unknown';
      issues.push(
        this.createIssue(
          listener,
          `Replay listener for "${target}" uses ONLY_NEW and loses events published while the application is down`,
          {
            suggestion:
              'Set autoReplay="true" to resume from the last successfully processed replay ID, or use FROM_LAST_REPLAY_ID with its own recovery for failed events (it stores the highest replay ID whether or not processing succeeded).',
          },
        ),
      );
    }

    return issues;
  }
}

/**
 * SF-004: Salesforce Basic Authentication API Version
 *
 * The Salesforce connector supports Basic Authentication only up to Salesforce
 * API v64.0. The API version is the last segment of the connection's
 * Authorization URL (`url`, for example `.../services/Soap/u/64.0`).
 *
 * Only an explicit URL is checked. When `url` is unset, the connector uses the
 * latest API version it supports, which is above v64.0 in current releases.
 */
export class BasicAuthApiVersionRule extends BaseRule {
  id = 'SF-004';
  name = 'Salesforce Basic Authentication API Version';
  description = 'Salesforce Basic Authentication is supported only up to API v64.0';
  severity = 'warning' as const;
  category = 'operations' as const;
  override issueType: IssueType = 'bug';

  private static readonly MAX_BASIC_AUTH_VERSION = 64;

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];
    const connections = this.select(
      `//*[${SALESFORCE_NAMESPACE} and local-name()="basic-connection"]`,
      doc,
    );

    for (const connection of connections) {
      const url = this.getAttribute(connection, 'url');
      const version = url ? /\/Soap\/u\/(\d+(?:\.\d+)?)/i.exec(url)?.[1] : undefined;
      if (!version || Number(version) <= BasicAuthApiVersionRule.MAX_BASIC_AUTH_VERSION) continue;

      issues.push(
        this.createIssue(
          connection,
          `Basic Authentication targets Salesforce API v${version}, but it is supported only up to v64.0`,
          {
            suggestion:
              'Move to an OAuth connection type (for example OAuth JWT or OAuth Client Credentials), or pin the Authorization URL to API v64.0 or below.',
          },
        ),
      );
    }

    return issues;
  }
}

/**
 * SF-005: Salesforce Replay Listener Primary Node
 *
 * With more than one worker or cluster node, a Replay listener without
 * `primaryNodeOnly="true"` processes every event on every instance.
 */
export class ReplayListenerPrimaryNodeRule extends BaseRule {
  id = 'SF-005';
  name = 'Salesforce Replay Listener Primary Node';
  description =
    'Salesforce Replay listeners should run on the primary node only when the app scales out';
  severity = 'info' as const;
  category = 'operations' as const;
  override issueType: IssueType = 'bug';

  validate(doc: Document, _context: ValidationContext): Issue[] {
    return this.select(REPLAY_LISTENERS, doc)
      .filter((listener) => this.getAttribute(listener, 'primaryNodeOnly') !== 'true')
      .map((listener) =>
        this.createIssue(
          listener,
          'Replay listener does not set primaryNodeOnly="true"; with several workers or nodes every instance processes every event',
          {
            suggestion:
              'Set primaryNodeOnly="true", or confirm the application runs on a single worker.',
          },
        ),
      );
  }
}
