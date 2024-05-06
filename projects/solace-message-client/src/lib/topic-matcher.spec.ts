import {TopicMatcher} from './topic-matcher';

describe('SolaceMessageClient', () => {

  it('should not match a `undefined` topic', () => {
    expect(new TopicMatcher('a/b/c').matches(undefined)).toBeFalse();
  });

  it('should not match an empty topic', () => {
    expect(new TopicMatcher('a/b/c').matches('')).toBeFalse();
  });

  it('should match when publishing a message to the exact topic \'a\'', () => {
    expect(new TopicMatcher('a').matches('a')).toBeTrue();
  });

  it('should match when publishing a message to the topic with #share and #noexport', () => {
    expect(new TopicMatcher('#share/sharename/a').matches('a')).toBeTrue();
    expect(new TopicMatcher('#share/sharename/a').matches('b')).toBeFalse();

    expect(new TopicMatcher('#noexport/a').matches('a')).toBeTrue();
    expect(new TopicMatcher('#noexport/a').matches('b')).toBeFalse();

    expect(new TopicMatcher('#noexport/#share/sharename/a').matches('a')).toBeTrue();
    expect(new TopicMatcher('#noexport/#share/sharename/a').matches('b')).toBeFalse();

    expect(new TopicMatcher('#share/sharename/a/*/b').matches('a/x/b')).toBeTrue();
    expect(new TopicMatcher('#share/sharename/a/*/b').matches('a/x/c')).toBeFalse();

    expect(new TopicMatcher('#noexport/a/*/b').matches('a/x/b')).toBeTrue();
    expect(new TopicMatcher('#noexport/a/*/b').matches('a/x/c')).toBeFalse();

    expect(new TopicMatcher('#noexport/#share/sharename/a/*/b').matches('a/x/b')).toBeTrue();
    expect(new TopicMatcher('#noexport/#share/sharename/a/*/b').matches('a/x/c')).toBeFalse();

    expect(new TopicMatcher('#share/sharename/a/>').matches('a/x/b/z')).toBeTrue();
    expect(new TopicMatcher('#share/sharename/a/>').matches('b/x/b/z')).toBeFalse();

    expect(new TopicMatcher('#noexport/a/>').matches('a/x/b/z')).toBeTrue();
    expect(new TopicMatcher('#noexport/a/>').matches('b/x/b/z')).toBeFalse();

    expect(new TopicMatcher('#noexport/#share/sharename/a/>').matches('a/x/b/z')).toBeTrue();
    expect(new TopicMatcher('#noexport/#share/sharename/a/b').matches('a/c')).toBeFalse();
  });

  it('should match when publishing a message to the exact topic \'a/b\'', () => {
    expect(new TopicMatcher('a/b').matches('a/b')).toBeTrue();
  });

  it('should match when publishing a message to the exact topic \'a/b/c\'', () => {
    expect(new TopicMatcher('a/b/c').matches('a/b/c')).toBeTrue();
  });

  it('should not match the subscription topic \'a/b/c\' when published to the topic \'a\'', () => {
    expect(new TopicMatcher('a/b/c').matches('a')).toBeFalse();
  });

  it('should not match the subscription topic \'a/b/c\' when published to the topic \'a/b\'', () => {
    expect(new TopicMatcher('a/b/c').matches('a/b')).toBeFalse();
  });

  it('should not match the subscription topic \'a/b/c\' when published to the topic \'a/b/c/d\'', () => {
    expect(new TopicMatcher('a/b/c').matches('a/b/c/d')).toBeFalse();
  });

  it('should fulfill examples at https://docs.solace.com/PubSub-Basics/Wildcard-Charaters-Topic-Subs.htm', () => {
    expect(new TopicMatcher('animals/domestic/*').matches('animals/domestic/cats')).toBeTrue();
    expect(new TopicMatcher('animals/domestic/*').matches('animals/domestic/dogs')).toBeTrue();
    expect(new TopicMatcher('animals/domestic/*').matches('animals/domestic/dogs/beagles')).toBeFalse();

    expect(new TopicMatcher('animals/*/cats/*').matches('animals/domestic/cats/persian')).toBeTrue();
    expect(new TopicMatcher('animals/*/cats/*').matches('animals/wild/cats/leopard')).toBeTrue();
    expect(new TopicMatcher('animals/*/cats/*').matches('animals/domestic/cats/persian/grey')).toBeFalse();
    expect(new TopicMatcher('animals/*/cats/*').matches('animals/domestic/dogs/beagles')).toBeFalse();

    expect(new TopicMatcher('animals/domestic/dog*').matches('animals/domestic/dog')).toBeTrue();
    expect(new TopicMatcher('animals/domestic/dog*').matches('animals/domestic/doggy')).toBeTrue();
    expect(new TopicMatcher('animals/domestic/dog*').matches('animals/domestic/dog/beagle')).toBeFalse();
    expect(new TopicMatcher('animals/domestic/dog*').matches('animals/domestic/cat')).toBeFalse();

    expect(new TopicMatcher('animals/domestic/>').matches('animals/domestic/cats')).toBeTrue();
    expect(new TopicMatcher('animals/domestic/>').matches('animals/domestic/dogs/beagles')).toBeTrue();
    expect(new TopicMatcher('animals/domestic/>').matches('animals')).toBeFalse();
    expect(new TopicMatcher('animals/domestic').matches('animals')).toBeFalse();
    expect(new TopicMatcher('animals/Domestic').matches('animals')).toBeFalse();

    expect(new TopicMatcher('animals/*/cats/>').matches('animals/domestic/cats/tabby/grey')).toBeTrue();
    expect(new TopicMatcher('animals/*/cats/>').matches('animals/wild/cats/leopard')).toBeTrue();
    expect(new TopicMatcher('animals/*/cats/>').matches('animals/domestic/dogs/beagles')).toBeFalse();

    expect(new TopicMatcher('my/test/*').matches('my/test/topic')).toBeTrue();
    expect(new TopicMatcher('my/test/*').matches('My/Test/Topic')).toBeFalse();
    expect(new TopicMatcher('my/test/*').matches('my/test')).toBeFalse();

    expect(new TopicMatcher('animals/red*/wild').matches('animals/red/wild')).toBeTrue();
    expect(new TopicMatcher('animals/red*/wild').matches('animals/reddish/wild')).toBeTrue();

    expect(new TopicMatcher('animals/*bro').matches('animals/*bro')).toBeTrue();
    expect(new TopicMatcher('animals/*bro').matches('animals/bro')).toBeFalse();
    expect(new TopicMatcher('animals/*bro').matches('animals/xbro')).toBeFalse();

    expect(new TopicMatcher('animals/br*wn').matches('animals/br*wn')).toBeTrue();
    expect(new TopicMatcher('animals/br*wn').matches('animals/brown')).toBeFalse();
    expect(new TopicMatcher('animals/br*wn').matches('animals/brwn')).toBeFalse();
    expect(new TopicMatcher('animals/br*wn').matches('animals/brOOwn')).toBeFalse();
  });
});
