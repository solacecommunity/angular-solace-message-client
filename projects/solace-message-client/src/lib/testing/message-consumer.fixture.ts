import {Message, MessageConsumer, MessageConsumerEvent, MessageConsumerEventName, MessageConsumerProperties, OperationError, Session} from 'solclientjs';
import {noop} from 'rxjs';
import {drainMicrotaskQueue} from './testing.utils';

/**
 * Fixture for a Solace {@link MessageConsumer} to simulate events and messages and to stub functionality.
 */
export class MessageConsumerFixture {

  private _callbacks = new Map<MessageConsumerEventName, MessageConsumerEventListener>();

  public messageConsumer: jasmine.SpyObj<Omit<MessageConsumer, 'disposed'> & {disposed: boolean}>;
  public messageConsumerProperties: MessageConsumerProperties | undefined;

  constructor(session: jasmine.SpyObj<Session>) {
    this.messageConsumer = jasmine.createSpyObj('messageConsumer', ['on', 'connect', 'disconnect', 'dispose']);
    this.messageConsumer.disposed = false;

    // Configure session to return the message consumer stub and capture the passed config.
    session.createMessageConsumer.and.callFake((messageConsumerProperties: MessageConsumerProperties): MessageConsumer => {
      this.messageConsumerProperties = messageConsumerProperties;
      return this.messageConsumer;
    });

    // Capture session callbacks.
    this.messageConsumer.on.and.callFake((eventName: MessageConsumerEventName, callback: MessageConsumerEventListener): MessageConsumer => {
      this._callbacks.set(eventName, callback);
      return this.messageConsumer;
    });

    // Fire 'DOWN' event when invoking 'disconnect'
    this.messageConsumer.disconnect.and.callFake(() => this.simulateEvent(MessageConsumerEventName.DOWN));

    // Mark message consumer disposed when calling 'dispose'
    this.messageConsumer.dispose.and.callFake(() => {
      this.messageConsumer.disposed = true;
    });
  }

  /**
   * Disables the automatic firing of 'MessageConsumerEventName.DOWN' event when calling 'disconnect'.
   */
  public disableFiringDownEventOnDisconnect(): void {
    this.messageConsumer.disconnect.and.callFake(noop);
  }

  /**
   * Simulates the Solace message broker to send given event to the Solace message consumer.
   */
  public async simulateEvent(eventName: MessageConsumerEventName, event?: OperationError | MessageConsumerEvent): Promise<void> {
    await drainMicrotaskQueue();

    const callback = this._callbacks.get(eventName);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${eventName}'`);
    }
    callback(event as any);
    await drainMicrotaskQueue();
  }

  /**
   * Simulates the Solace message broker to publish a message to the Solace message consumer.
   */
  public async simulateMessage(message: Message): Promise<void> {
    const callback = this._callbacks.get(MessageConsumerEventName.MESSAGE) as (message: Message) => void;
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${MessageConsumerEventName.MESSAGE}'`);
    }
    callback(message);
    await drainMicrotaskQueue();
  }
}

type MessageConsumerEventListener = (() => void) | ((event: MessageConsumerEvent) => void) | ((error: OperationError) => void) | ((message: Message) => void);
