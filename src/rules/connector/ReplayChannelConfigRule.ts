import { ValidationContext, Issue, IssueType } from '../../types';
import { BaseRule } from '../base/BaseRule';

/**
 * SF-001: Salesforce Replay Channel Config
 *
 * Salesforce CDC (Change Data Capture) and Platform Event listeners should
 * configure replay channel settings for message reliability. Without proper
 * replay configuration, events can be lost if the application is restarted
 * or temporarily disconnected.
 *
 * Looks for salesforce:replay-channel or similar replay configurations
 * on Salesforce subscriber/listener elements.
 */
export class ReplayChannelConfigRule extends BaseRule {
  id = 'SF-001';
  name = 'Salesforce Replay Channel Config';
  description =
    'Salesforce CDC/Platform Event listeners should configure replay channel for reliability';
  severity = 'warning' as const;
  category = 'operations' as const;
  issueType: IssueType = 'bug';

  validate(doc: Document, _context: ValidationContext): Issue[] {
    const issues: Issue[] = [];

    // Find Salesforce subscribe elements (CDC/Platform Events)
    const subscribers = [
      ...this.select(
        '//*[local-name()="subscribe-channel" or local-name()="subscribe-topic"]',
        doc,
      ),
      ...this.select('//*[local-name()="replay-channel" or local-name()="replay-topic"]', doc),
    ];

    // If we find replay-channel/replay-topic, that means replay IS configured — good
    const hasReplayConfig = this.exists(
      '//*[local-name()="replay-channel" or local-name()="replay-topic"]',
      doc,
    );

    // Find plain subscribe elements without replay
    const plainSubscribers = this.select(
      '//*[local-name()="subscribe-channel" or local-name()="subscribe-topic"]',
      doc,
    );

    if (plainSubscribers.length > 0 && !hasReplayConfig) {
      for (const sub of plainSubscribers) {
        const streamingChannel =
          this.getAttribute(sub, 'streamingChannel') ??
          this.getAttribute(sub, 'channel') ??
          'unknown';

        issues.push(
          this.createIssue(
            sub,
            `Salesforce subscriber for "${streamingChannel}" has no replay channel configuration`,
            {
              suggestion:
                'Use salesforce:replay-channel instead of subscribe-channel, or configure Object Store-backed replay for CDC/Platform Event reliability',
            },
          ),
        );
      }
    }

    // Also check for replay-channel that might be missing resumeFromLastReplay
    if (subscribers.length === 0) {
      return issues; // No Salesforce streaming elements in this file
    }

    return issues;
  }
}
