import { Injectable } from '@angular/core';
import { Destination } from './solace.model';

/**
 * Matches exact topics as used when publishing messages against subscription topics.
 *
 * This class implements the rules for 'Wildcard Characters in SMF Topic Subscriptions',
 * as outlined here: https://docs.solace.com/PubSub-Basics/Wildcard-Charaters-Topic-Subs.htm.
 */
@Injectable()
export class TopicMatcher {

  public matchesSubscriptionTopic(testeeTopic: string | Destination, subscriptionTopic: string | Destination): boolean {
    const testeeSegments = coerceTopicName(testeeTopic).split('/');
    const subscriptionTopicSegments = coerceTopicName(subscriptionTopic).split('/');

    for (let i = 0; i < subscriptionTopicSegments.length; i++) {
      const subscriptionTopicSegment = subscriptionTopicSegments[i];
      const testee = testeeSegments[i];
      const isLastSubscriptionTopicSegment = (i === subscriptionTopicSegments.length - 1);

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
    return testeeSegments.length === subscriptionTopicSegments.length;
  }
}

function coerceTopicName(topic: string | Destination): string {
  if (typeof topic === 'string') {
    return topic;
  }
  return topic.getName();
}
