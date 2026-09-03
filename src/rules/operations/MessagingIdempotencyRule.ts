import { ValidationContext, Issue } from '../../types';
import { ProjectRule } from '../base/ProjectRule';

/**
 * RES-003: Messaging Idempotency Evidence
 *
 * Queue-based delivery is at-least-once, so a consumer can legitimately receive
 * the same message twice. Without a deduplication mechanism, a retry becomes a
 * duplicate side effect.
 *
 * Whether that matters depends on the operation — a read is naturally
 * idempotent, an append is not — so this stays an info finding reporting the
 * absence of visible evidence. Object Store usage and Mule's
 * idempotent-message-validator both count.
 */
export class MessagingIdempotencyRule extends ProjectRule {
  id = 'RES-003';
  name = 'Messaging Idempotency Evidence';
  description = 'Messaging consumers should show evidence of duplicate handling';
  severity = 'info' as const;
  category = 'operations' as const;
  override issueType = 'bug' as const;

  protected validateProject(context: ValidationContext): Issue[] {
    const projectContext = context.projectContext;
    if (!projectContext?.hasMessagingUsage) {
      return [];
    }

    if (projectContext.hasIdempotencyEvidence || projectContext.hasObjectStoreUsage) {
      return [];
    }

    return [
      this.createProjectIssue(
        'JMS or Anypoint MQ usage was detected but no idempotency evidence was found',
        {
          suggestion:
            'Add an <idempotent-message-validator> backed by an Object Store, keyed on a stable message identifier, for operations that are not naturally idempotent',
        },
      ),
    ];
  }
}
