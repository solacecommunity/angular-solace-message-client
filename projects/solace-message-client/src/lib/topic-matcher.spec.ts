import {TestBed} from '@angular/core/testing';
import {TopicMatcher} from './topic-matcher';

describe('SolaceMessageClient', () => {

  let testee: TopicMatcher;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TopicMatcher,
      ],
    });
    testee = TestBed.inject(TopicMatcher);
  });

  it('should not match a `null` topic', () => {
    expect(testee.matchesSubscriptionTopic(null, 'a/b/c')).toBeFalse();
  });

  it('should not match an empty topic', () => {
    expect(testee.matchesSubscriptionTopic('', 'a/b/c')).toBeFalse();
  });

  it('should match when publishing a message to the exact topic \'a\'', () => {
    expect(testee.matchesSubscriptionTopic('a', 'a')).toBeTrue();
  });

  it('should match when publishing a message to the exact topic \'a/b\'', () => {
    expect(testee.matchesSubscriptionTopic('a/b', 'a/b')).toBeTrue();
  });

  it('should match when publishing a message to the exact topic \'a/b/c\'', () => {
    expect(testee.matchesSubscriptionTopic('a/b/c', 'a/b/c')).toBeTrue();
  });

  it('should not match the subscription topic \'a/b/c\' when published to the topic \'a\'', () => {
    expect(testee.matchesSubscriptionTopic('a', 'a/b/c')).toBeFalse();
  });

  it('should not match the subscription topic \'a/b/c\' when published to the topic \'a/b\'', () => {
    expect(testee.matchesSubscriptionTopic('a/b', 'a/b/c')).toBeFalse();
  });

  it('should not match the subscription topic \'a/b/c\' when published to the topic \'a/b/c/d\'', () => {
    expect(testee.matchesSubscriptionTopic('a/b/c/d', 'a/b/c')).toBeFalse();
  });

  it('should fulfill examples at https://docs.solace.com/PubSub-Basics/Wildcard-Charaters-Topic-Subs.htm', () => {
    expect(testee.matchesSubscriptionTopic('animals/domestic/cats', 'animals/domestic/*')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('animals/domestic/dogs', 'animals/domestic/*')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('animals/domestic/dogs/beagles', 'animals/domestic/*')).toBeFalse();

    expect(testee.matchesSubscriptionTopic('animals/domestic/cats/persian', 'animals/*/cats/*')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('animals/wild/cats/leopard', 'animals/*/cats/*')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('animals/domestic/cats/persian/grey', 'animals/*/cats/*')).toBeFalse();
    expect(testee.matchesSubscriptionTopic('animals/domestic/dogs/beagles', 'animals/*/cats/*')).toBeFalse();

    expect(testee.matchesSubscriptionTopic('animals/domestic/dog', 'animals/domestic/dog*')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('animals/domestic/doggy', 'animals/domestic/dog*')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('animals/domestic/dog/beagle', 'animals/domestic/dog*')).toBeFalse();
    expect(testee.matchesSubscriptionTopic('animals/domestic/cat', 'animals/domestic/dog*')).toBeFalse();

    expect(testee.matchesSubscriptionTopic('animals/domestic/cats', 'animals/domestic/>')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('animals/domestic/dogs/beagles', 'animals/domestic/>')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('animals', 'animals/domestic/>')).toBeFalse();
    expect(testee.matchesSubscriptionTopic('animals', 'animals/domestic')).toBeFalse();
    expect(testee.matchesSubscriptionTopic('animals', 'animals/Domestic')).toBeFalse();

    expect(testee.matchesSubscriptionTopic('animals/domestic/cats/tabby/grey', 'animals/*/cats/>')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('animals/wild/cats/leopard', 'animals/*/cats/>')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('animals/domestic/dogs/beagles', 'animals/*/cats/>')).toBeFalse();

    expect(testee.matchesSubscriptionTopic('my/test/topic', 'my/test/*')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('My/Test/Topic', 'my/test/*')).toBeFalse();
    expect(testee.matchesSubscriptionTopic('my/test', 'my/test/*')).toBeFalse();

    expect(testee.matchesSubscriptionTopic('animals/red/wild', 'animals/red*/wild')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('animals/reddish/wild', 'animals/red*/wild')).toBeTrue();

    expect(testee.matchesSubscriptionTopic('animals/*bro', 'animals/*bro')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('animals/bro', 'animals/*bro')).toBeFalse();
    expect(testee.matchesSubscriptionTopic('animals/xbro', 'animals/*bro')).toBeFalse();

    expect(testee.matchesSubscriptionTopic('animals/br*wn', 'animals/br*wn')).toBeTrue();
    expect(testee.matchesSubscriptionTopic('animals/brown', 'animals/br*wn')).toBeFalse();
    expect(testee.matchesSubscriptionTopic('animals/brwn', 'animals/br*wn')).toBeFalse();
    expect(testee.matchesSubscriptionTopic('animals/brOOwn', 'animals/br*wn')).toBeFalse();
  });
});
