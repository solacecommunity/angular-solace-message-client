import { TopicSubscriptionCounter } from './topic-subscription-counter';

describe('TopicSubscriptionCounter', () => {

  it('should count subscriptions per topic', async () => {
    const subscriptionCounter = new TopicSubscriptionCounter();

    expect(subscriptionCounter.incrementAndGet('a/b/c')).toEqual(1);
    expect(subscriptionCounter.incrementAndGet('a/b/*')).toEqual(1);

    expect(subscriptionCounter.incrementAndGet('a/b/c')).toEqual(2);
    expect(subscriptionCounter.incrementAndGet('a/b/*')).toEqual(2);

    expect(subscriptionCounter.decrementAndGet('a/b/c')).toEqual(1);
    expect(subscriptionCounter.decrementAndGet('a/b/*')).toEqual(1);

    expect(subscriptionCounter.decrementAndGet('a/b/c')).toEqual(0);
    expect(subscriptionCounter.decrementAndGet('a/b/*')).toEqual(0);
  });

  it('should never drop below 0', async () => {
    const subscriptionCounter = new TopicSubscriptionCounter();

    expect(subscriptionCounter.incrementAndGet('a/b/c')).toEqual(1);

    expect(subscriptionCounter.decrementAndGet('a/b/c')).toEqual(0);
    expect(subscriptionCounter.decrementAndGet('a/b/c')).toEqual(0);

    expect(subscriptionCounter.incrementAndGet('a/b/c')).toEqual(1);
    expect(subscriptionCounter.decrementAndGet('a/b/c')).toEqual(0);
  });
});
