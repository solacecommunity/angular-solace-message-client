/**
 * Maintains the subscription count per topic.
 */
import {Destination} from './solace.model';

export class TopicSubscriptionCounter {

  private _subscriptionCounts = new Map<string, number>();

  public incrementAndGet(topic: string | Destination): number {
    const topicName = coerceTopicName(topic);
    const count = (this._subscriptionCounts.get(topicName) ?? 0) + 1;
    this._subscriptionCounts.set(topicName, count);
    return count;
  }

  public decrementAndGet(topic: string | Destination): number {
    const topicName = coerceTopicName(topic);
    const count = Math.max(0, (this._subscriptionCounts.get(topicName) ?? 0) - 1);
    if (count === 0) {
      this._subscriptionCounts.delete(topicName);
    }
    else {
      this._subscriptionCounts.set(topicName, count);
    }
    return count;
  }

  public destroy(): void {
    this._subscriptionCounts.clear();
  }
}

function coerceTopicName(topic: string | Destination): string {
  if (typeof topic === 'string') {
    return topic;
  }
  return topic.getName();
}
