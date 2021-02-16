
/**
 * Maintains the subscription count per topic.
 */
export class TopicSubscriptionCounter {

  private _subscriptionCounts = new Map<string, number>();

  public incrementAndGet(topic: string): number {
    const count = (this._subscriptionCounts.get(topic) ?? 0) + 1;
    this._subscriptionCounts.set(topic, count);
    return count;
  }

  public decrementAndGet(topic: string): number {
    const count = Math.max(0, (this._subscriptionCounts.get(topic) ?? 0) - 1);
    if (count === 0) {
      this._subscriptionCounts.delete(topic);
    }
    else {
      this._subscriptionCounts.set(topic, count);
    }
    return count;
  }

  public destroy(): void {
    this._subscriptionCounts.clear();
  }
}
