import {Destination, Message, MessageType, Session, SessionEvent, SessionEventCode, SessionProperties} from 'solclientjs';
import {drainMicrotaskQueue} from './testing.utils';
import {MessageConsumerFixture} from './message-consumer.fixture';
import {QueueBrowserFixture} from './queue-browser.fixture';
import {SendRequestFixture} from './send-request.fixture';
import {noop} from 'rxjs';
import {SolaceSessionProvider} from '../solace-session-provider';

/**
 * Fixture for a Solace {@link Session} to simulate events and messages and to stub functionality.
 */
export class SessionFixture {

  private _callbacks = new Map<SessionEventCode, (event: any) => void>();

  public session: jasmine.SpyObj<Session>;
  public messageConsumerFixture: MessageConsumerFixture;
  public queueBrowserFixture: QueueBrowserFixture;
  public sendRequestFixture: SendRequestFixture;
  /**
   * Spies for calls to {@link SolaceSessionProvider#provide}.
   */
  public sessionProvider: jasmine.SpyObj<SolaceSessionProvider>;
  /**
   * Session properties passed to {@link SolaceSessionProvider#provide}.
   */
  public sessionProperties: SessionProperties | undefined;

  constructor() {
    this.session = jasmine.createSpyObj('Session', ['on', 'connect', 'subscribe', 'unsubscribe', 'send', 'dispose', 'disconnect', 'createMessageConsumer', 'createQueueBrowser', 'sendRequest', 'sendReply', 'updateAuthenticationOnReconnect']);

    this.sessionProvider = jasmine.createSpyObj('SolaceSessionProvider', ['provide']);
    this.sessionProvider.provide.and.callFake((properties: SessionProperties) => {
      this.sessionProperties = properties;
      return this.session;
    });

    this.messageConsumerFixture = new MessageConsumerFixture(this.session);
    this.queueBrowserFixture = new QueueBrowserFixture(this.session);
    this.sendRequestFixture = new SendRequestFixture(this.session);

    // Capture session callbacks.
    this.session.on.and.callFake((eventCode: SessionEventCode, callback: (event: any) => void): Session => {
      this._callbacks.set(eventCode, callback);
      return this.session;
    });

    // Fire 'DISCONNECTED' event when invoking 'disconnect'
    this.session.disconnect.and.callFake(() => {
      return this.simulateEvent(SessionEventCode.DISCONNECTED);
    });
  }

  /**
   * Disables the automatic firing of 'SessionEventCode.DISCONNECTED' event when calling 'disconnect'.
   */
  public disableFiringDownEventOnDisconnect(): void {
    this.session.disconnect.and.callFake(noop);
  }

  /**
   * Simulates the Solace message broker to send given event to the Solace session.
   */
  public async simulateEvent(eventCode: SessionEventCode, correlationKey?: object | string): Promise<void> {
    await drainMicrotaskQueue();
    const callback = this._callbacks.get(eventCode);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${eventCode}'`);
    }
    callback(createSessionEvent(eventCode, correlationKey));
    await drainMicrotaskQueue();
  }

  /**
   * Simulates the Solace message broker to publish a message to the Solace session.
   */
  public async simulateMessage(message: Message): Promise<void> {
    const callback = this._callbacks.get(SessionEventCode.MESSAGE) as ((message: Message) => void);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${SessionEventCode.MESSAGE}'`);
    }
    callback(message);
    await drainMicrotaskQueue();
  }

  /**
   * Captures the most recent invocation to {@link Session.subscribe}.
   */
  public installSessionSubscribeCaptor(): SessionSubscribeCaptor {
    const captor = new SessionSubscribeCaptor();
    this.session.subscribe.and.callFake((topic: Destination, requestConfirmation: boolean, correlationKey: string | object | undefined, _requestTimeout: number) => {
      captor.topic = topic.getName();
      captor.correlationKey = correlationKey;
    });
    return captor;
  }

  /**
   * Captures the most recent invocation to {@link Session.unsubscribe}.
   */
  public installSessionUnsubscribeCaptor(): SessionSubscribeCaptor {
    const captor = new SessionSubscribeCaptor();
    this.session.unsubscribe.and.callFake((topic: Destination, requestConfirmation: boolean, correlationKey: string | object | undefined, _requestTimeout: number) => {
      captor.topic = topic.getName();
      captor.correlationKey = correlationKey;
    });
    return captor;
  }

  /**
   * Captures the most recent invocation to {@link Session.send}.
   */
  public installSessionSendCaptor(): SessionSendCaptor {
    const captor = new SessionSendCaptor();
    this.session.send.and.callFake((message: Message) => {
      captor.message = message;
      captor.destination = message.getDestination()!;
      captor.type = message.getType();
    });
    return captor;
  }
}

function createSessionEvent(sessionEventCode: SessionEventCode, correlationKey?: object | string): SessionEvent {
  // @ts-expect-error: constructor of {@link SessionEvent} is protected.
  return new SessionEvent(
    [] /* superclassArgs */,
    sessionEventCode,
    null /* infoStr */,
    null /* responseCode */,
    null /* errorSubcode */,
    correlationKey,
    null/* reason */,
  );
}

export class SessionSubscribeCaptor {

  public topic: string | undefined;
  public correlationKey: string | object | undefined;

  public reset(): void {
    this.topic = undefined;
    this.correlationKey = undefined;
  }
}

export class SessionSendCaptor {

  public message: Message | undefined;
  public destination: Destination | undefined;
  public type: MessageType | undefined;

  public reset(): void {
    this.message = undefined;
    this.destination = undefined;
    this.type = undefined;
  }
}
