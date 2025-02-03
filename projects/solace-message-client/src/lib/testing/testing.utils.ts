import {asyncScheduler} from 'rxjs';
import {LogLevel, Message, OperationError, RequestError, SolclientFactory, SolclientFactoryProfiles, SolclientFactoryProperties} from 'solclientjs';

/**
 * Initializes `SolclientFactory`.
 */
export function initSolclientFactory(): void {
  const factoryProperties = new SolclientFactoryProperties();
  factoryProperties.profile = SolclientFactoryProfiles.version10_5;
  factoryProperties.logLevel = LogLevel.TRACE;
  SolclientFactory.init(factoryProperties);
}

/**
 * Waits until all microtasks (Promise) and elapsed macrotasks (setTimeout) completed.
 */
export async function drainMicrotaskQueue(): Promise<void> {
  await new Promise(resolve => asyncScheduler.schedule(resolve));
}

/**
 * Creates a fake topic message.
 */
export function createTopicMessage(topic: string): Message {
  const message = SolclientFactory.createMessage();
  message.setDestination(SolclientFactory.createTopicDestination(topic));
  return message;
}

/**
 * Creates a fake queue message.
 */
export function createQueueMessage(queue: string): Message {
  const message = SolclientFactory.createMessage();
  message.setDestination(SolclientFactory.createDurableQueueDestination(queue));
  return message;
}

/**
 * Creates a fake operation error.
 */
export function createOperationError(): OperationError {
  // @ts-expect-error: constructor of {@link OperationError} is protected.
  return new OperationError(); // eslint-disable-line @typescript-eslint/no-unsafe-return
}

/**
 * Creates a fake request error.
 */
export function createRequestError(): RequestError {
  // @ts-expect-error: constructor of {@link RequestError} is protected.
  return new RequestError(); // eslint-disable-line @typescript-eslint/no-unsafe-return
}
