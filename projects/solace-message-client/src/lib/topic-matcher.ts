/**
 * Matches exact topics as used when publishing messages against subscription topics.
 *
 * This class implements the rules for 'Wildcard Characters in SMF Topic Subscriptions',
 * as outlined here: https://docs.solace.com/PubSub-Basics/Wildcard-Charaters-Topic-Subs.htm.
 */
export class TopicMatcher {

  private readonly _subscriptionTopic: string[];

  constructor(subscriptionTopic: string) {
    this._subscriptionTopic = parseSubscriptionTopic(subscriptionTopic);
  }

  public matches(topic: string | undefined): boolean {
    if (!topic) {
      return false;
    }
    const testeeSegments = topic.split('/');
    const subscriptionSegments = this._subscriptionTopic;

    for (let i = 0; i < subscriptionSegments.length; i++) {
      const subscriptionTopicSegment = subscriptionSegments[i];
      const testee = testeeSegments[i];
      const isLastSubscriptionTopicSegment = (i === subscriptionSegments.length - 1);

      if (testee === undefined) {
        return false;
      }

      if (subscriptionTopicSegment === '>' && isLastSubscriptionTopicSegment) {
        return true;
      }

      if (subscriptionTopicSegment === '*') {
        continue;
      }

      if (subscriptionTopicSegment.endsWith('*') && testee.startsWith(subscriptionTopicSegment.slice(0, -1))) {
        continue;
      }

      if (subscriptionTopicSegment !== testee) {
        return false;
      }
    }
    return testeeSegments.length === subscriptionSegments.length;
  }
}

/**
 * Parses the subscription topic, removing #noexport and #share segments, if any.
 */
function parseSubscriptionTopic(topic: string): string[] {
  const segments = topic.split('/');

  // Remove #noexport segment, if any. See https://docs.solace.com/Messaging/No-Export.htm
  // Example: #noexport/#share/ShareName/topicFilter, #noexport/topicFilter
  if (segments[0] === '#noexport') {
    segments.shift();
  }

  // Remove #share segments, if any. See https://docs.solace.com/Messaging/Direct-Msg/Direct-Messages.htm
  // Examples: #share/<ShareName>/<topicFilter>
  if (segments[0] === '#share') {
    segments.shift(); // removes #share segment
    segments.shift(); // removes share name segment
  }
  return segments;
}
