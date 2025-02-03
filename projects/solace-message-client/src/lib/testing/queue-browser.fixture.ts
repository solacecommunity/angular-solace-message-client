import {Message, OperationError, QueueBrowser, QueueBrowserEventName, QueueBrowserProperties, Session} from 'solclientjs';
import {drainMicrotaskQueue} from './testing.utils';

/**
 * Fixture for a Solace {@link QueueBrowser} to simulate events and messages and to stub functionality.
 */
export class QueueBrowserFixture {

  private _callbacks = new Map<QueueBrowserEventName, QueueBrowserEventListener>();

  public queueBrowser: jasmine.SpyObj<QueueBrowser>;
  public queueBrowserProperties: QueueBrowserProperties | undefined;

  constructor(session: jasmine.SpyObj<Session>) {
    this.queueBrowser = jasmine.createSpyObj<QueueBrowser>('queueBrowser', ['on', 'connect', 'disconnect', 'start', 'stop']);

    // Configure session to return the queue browser stub and capture the passed config.
    session.createQueueBrowser.and.callFake((queueBrowserProperties: QueueBrowserProperties): QueueBrowser => {
      this.queueBrowserProperties = queueBrowserProperties;
      return this.queueBrowser;
    });

    // Capture session callbacks.
    this.queueBrowser.on.and.callFake((eventName: QueueBrowserEventName, callback: QueueBrowserEventListener) => {
      this._callbacks.set(eventName, callback);
      return this.queueBrowser;
    });

    // Fire 'DOWN' event when invoking 'disconnect'
    this.queueBrowser.disconnect.and.callFake(() => {
      void this.simulateEvent(QueueBrowserEventName.DOWN);
      void this.simulateEvent(QueueBrowserEventName.DISPOSED);
    });
  }

  /**
   * Simulates the Solace message broker to send given event to the Solace queue browser.
   */
  public async simulateEvent(eventName: QueueBrowserEventName, error?: OperationError): Promise<void> {
    await drainMicrotaskQueue();

    const callback = this._callbacks.get(eventName);
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${eventName}'`);
    }
    else if (error instanceof OperationError) {
      ((callback) as (error: OperationError) => void)(error);
    }
    else {
      ((callback) as () => void)();
    }
    await drainMicrotaskQueue();
  }

  /**
   * Simulates the Solace message broker to publish a message to the Solace queue browser.
   */
  public async simulateMessage(message: Message): Promise<void> {
    const callback = this._callbacks.get(QueueBrowserEventName.MESSAGE) as ((message: Message) => void) | undefined;
    if (!callback) {
      throw Error(`[SpecError] No callback registered for event '${QueueBrowserEventName.MESSAGE}'`);
    }
    callback(message);
    await drainMicrotaskQueue();
  }
}

type QueueBrowserEventListener = (() => void) | ((error: OperationError) => void) | ((message: Message) => void);
