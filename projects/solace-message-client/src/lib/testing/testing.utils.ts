import {asyncScheduler} from 'rxjs';
import {Message, OperationError, RequestError, SolclientFactory} from 'solclientjs';

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
  return new OperationError();
}

/**
 * Creates a fake request error.
 */
export function createRequestError(): RequestError {
  // @ts-expect-error: constructor of {@link RequestError} is protected.
  return new RequestError();
}
