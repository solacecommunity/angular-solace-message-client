// tslint:disable:no-redundant-jsdoc
import * as solace from 'solclientjs/lib-browser/solclient-full';
import { Injectable } from '@angular/core';
import { BehaviorSubject, EMPTY, noop, Observable, OperatorFunction } from 'rxjs';
import { Message, MessageDeliveryModeType, MessageType, SDTField } from './solace.model';
import { map } from 'rxjs/operators';
import { SolaceMessageClientConfig } from './solace-message-client.config';

/**
 * Allows clients to communicate with a Solace messaging broker for sending and receiving messages using the native SMF protocol (Solace Message Format).
 *
 * This message client establishes a single connection to the broker regardless of the number of subscriptions.
 *
 * See https://docs.solace.com/API-Developer-Online-Ref-Documentation/js/index.html for more information about the Solace Web API.
 */
@Injectable()
export abstract class SolaceMessageClient {

  /**
   * An Observable that, when subscribed, emits the current connection state to the broker.
   * Upon subscription, emits the current connection state, unless no connect attempt has been made yet. It never completes and
   * emits continuously when the connection state changes.
   */
  public abstract readonly connected$: Observable<boolean>;

  /**
   * Promise that resolves to the {@link solace.Session} when connected to the message broker, or that rejects if no connection
   * could be established, or if no connect attempt has been made yet.
   */
  public abstract readonly session: Promise<solace.Session>;

  /**
   * Connects to the Solace message broker with the specified configuration. Has no effect if already connected.
   *
   * Do not forget to invoke this method if you import {@link SolaceMessageClientModule} without configuration in the root injector.
   * Typically, you would connect to the broker in an app initializer.
   *
   * @return Promise that resolves when connected to the broker, or that rejects if the connection attempt failed.
   *         If already connected, the Promise resolves immediately.
   */
  public abstract connect(config: SolaceMessageClientConfig): Promise<void>;

  /**
   * Disconnects this client from the Solace message broker. Has no effect if already disconnected.
   *
   * Disconnecting this client will complete all Observables for observing messages. Subscriptions are not restored when connecting anew.
   *
   * @return Promise that resolves when disconnected from the broker.
   */
  public abstract disconnect(): Promise<void>;

  /**
   * Receives messages published to the given topic.
   *
   * The Observable never completes, unless invoking {@link disconnect}. If not connected to the broker yet, or if the connect attempt failed, the Observable errors.
   *
   * You can subscribe to multiple topics simultaneously by using wildcard segments in the topic. Topics are case-sensitive and consist of one or more segments, each
   * separated by a forward slash.
   *
   * **Single-Level Wildcard Character (`*`)**:
   * - if a segment contains the asterisk (`*`) character as its only character, this segment is required and acts as a placeholder for any segment value.
   * - if a segment ends with the asterisk (`*`) character, this segment acts as a placeholder for segment values starting with the characters before the asterisk.
   *   The segment to match can have additional characters, must does not have to.
   *
   * **Multi-Level Wildcard Character (`>`)**:
   * -  when used as the last segment, it provides a "one or more" wildcard match for any topics with an identical prefix to the subscription.
   *
   * If a segment begins with a colon (`:`), it is called a named wildcard segment that acts as a placeholder for any value. The characters after the leading colon give the segment its name.
   * Internally, named wildcard segments are translated to single-level wildcard segments. But, named segments allow retrieving substituted segment values when receiving a message in an easy manner.
   * E.g., the topic 'myhome/:room/temperature' is translated to 'myhome/* /temperature', matching messages sent to topics like 'myhome/kitchen/temperature' or 'myhome/livingroom/temperature'.
   * Substituted segment values are then available in {@link MessageEnvelope.params}, or as the second element of the tuple when using {@link mapToBinary} or {@link mapToText}
   * RxJS operators.
   *
   * See https://docs.solace.com/PubSub-Basics/Wildcard-Charaters-Topic-Subs.htm for more information and examples.
   *
   * The Observables emits the messages as received by the Solace broker. You can use one of the following custom RxJS operators to map the message to its payload.
   * - {@link mapToBinary}
   * - {@link mapToText}
   *
   * @param topic - Specifies the topic which to observe.
   *        Topics are case-sensitive and consist of one or more segments, each separated by a forward slash.
   *        You can subscribe to the exact topic of a published message, or use wildcards (single-level or multi-level) to subscribe to multiple topics simultaneously.
   *        In place of using a single-level wildcard segment (`*`), you can also use a named wildcard segment starting with a colon (`:`), allowing you to retrieve
   *        substituted values of wildcard segments when receiving a message.
   * @param options - Controls how to observe the topic.
   * @return Observable that emits when receiving a message published to the given topic. If not connected to the broker yet, or if the connect attempt failed, the Observable errors.
   */
  public abstract observe$(topic: string, options?: ObserveOptions): Observable<MessageEnvelope>;

  /**
   * Publishes a message to the given topic. The message is transported to all consumers subscribed to the topic.
   *
   * A message may contain unstructured byte data, or a structured container.
   *
   * ## Binary Data Message
   * By default, data is transported as unstructured bytes in the binary attachment message part.
   *
   * Supported data types are:
   *   - `ArrayBufferLike` objects, e.g. `ArrayBuffer`, `Uint8Array`, `Uint32Array`, or similar
   *   - `DataView` objects
   *   - For backwards compatibility, `solclient` supports passing a latin1-encoded `string` literal.
   *     Instead, strings should be encoded into their binary representation upfront, e.g., by using
   *     `TextEncoder.encode(...)`.
   *
   * ## Structured Data Message
   * Alternatively, you can exchange data using the structured data API by passing it as Structured Data Type (SDT) in the form of a {@link SDTField}
   * of the type {@link SDTFieldType#STRING}, {@link SDTFieldType#MAP} or {@link SDTFieldType#STREAM}. Transporting data as structured message is useful
   * in a heterogeneous network that has clients that use different hardware architectures and programming languages, allowing exchanging binary data in
   * a structured, language- and architecture-independent way.
   *
   * Example: `SolaceObjectFactory.createSDTField(SDTFieldType.STRING, 'payload')`
   *
   * ## Message Delivery
   * By default, messages are published as direct messages, thus, message delivery is not guaranteed.
   * This mode provides at-most-once message delivery with the following characteristics:
   *   * Messages are not retained for clients that are not connected to a Solace message broker.
   *   * Messages can be discarded when congestion or system failures are encountered.
   *   * Messages can be reordered in the event of network topology changes.
   *
   * Direct messages are most appropriate for messaging applications that require very high-rate or very low-latency
   * message transmission. Direct Messaging enables applications to efficiently publish messages to a large number of
   * clients with matching subscriptions.
   *
   * You can change the message delivery mode via the {@link PublishOptions.deliveryMode} property.
   * For more information, see https://docs.solace.com/PubSub-Basics/Basic-Guaranteed-Messsaging-Operation.htm.
   *
   * @param  topic - Specifies the topic to which the message should be sent.
   *         Topics are case-sensitive and consist of one or more segments, each separated by a forward slash.
   *         The topic is required and must be exact, thus not contain wildcards.
   * @param  data - Specifies optional transfer data to be carried along with this message. A message may contain unstructured byte data,
   *         or structured data in the form of a {@link SDTField}. Use {@link SolaceObjectFactory#createSDTField} to construct structured data.
   *         To have full control over the message to be published, you can also pass the {@link Message} object, which you can create using
   *         {@link SolaceObjectFactory#createMessage}.
   * @param  options - Controls how to publish the message.
   * @return A Promise that resolves when dispatched the message, or that rejects if the message could not be dispatched.
   */
  public abstract publish(topic: string, data?: ArrayBufferLike | DataView | string | SDTField | Message, options?: PublishOptions): Promise<void>;
}

/**
 * SolaceMessageClient which does nothing, i.e., can be used in tests.
 */
@Injectable()
export class NullSolaceMessageClient implements SolaceMessageClient {

  public readonly connected$ = new BehaviorSubject<boolean>(true);

  public observe$(topic: string, options?: ObserveOptions): Observable<MessageEnvelope> {
    return EMPTY;
  }

  public publish(topic: string, data?: ArrayBufferLike | DataView | string | SDTField | Message, options?: PublishOptions): Promise<void> {
    return Promise.resolve();
  }

  public get session(): Promise<solace.Session> {
    return new Promise(noop);
  }

  public connect(config: SolaceMessageClientConfig): Promise<void> {
    return Promise.resolve();
  }

  public disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Control how to observe a topic.
 */
export interface ObserveOptions {
  /**
   * The request timeout period (in milliseconds).
   * If specified, this value overwrites readTimeoutInMsecs property in {@link SessionProperties}.
   */
  requestTimeout?: number;
}

/**
 * Control how to publish a message.
 */
export interface PublishOptions {

  /**
   * Specifies the message priority (JMS Priority) for the message.
   * Numerical values between 0 and 255 are accepted, use undefined to unset.
   *
   * If destination queues and topic endpoints for this message
   * are configured to respect message priority,
   * the values 0 through 9 can be used to affect the priority
   * of delivery to consumers of those queues or topic endpoints.
   * For the purposes of prioritized message delivery, values larger than 9
   * are treated the same as 9.
   */
  priority?: number;
  /**
   * Specifies the guaranteed message TTL, in milliseconds.
   *
   * The time to live is the number of milliseconds the message may be stored on the
   * Solace Message Router before the message is discarded or moved to a Dead Message
   * Queue. See {@link Message.setDMQEligible}.
   *
   * Setting the Time To Live to zero disables TTL for the message.
   *
   * This property is only valid for Guaranteed messages (Persistent and Non-Persistent).
   * It has no effect when used in conjunction with other message types unless the message
   * is promoted by the appliance to a Guaranteed message.
   *
   * The maxium allowed time to live is 3.1536E11 (315360000000) which is
   * approximately 10 years.
   */
  timeToLive?: number;

  /**
   * Specifies if to publish a Guaranteed Message DMQ (Dead Message Queue) eligible message.
   * When this property is set, when the message expires in the network,
   * the message is saved on a appliance dead message queue. Otherwise the expired message is
   * discarded. See {@link PublishOptions.setTimeToLive}.
   */
  dmqEligible?: boolean;

  /**
   * Sets the delivery mode of the message.
   *
   * @default MessageDeliveryModeType.DIRECT
   */
  deliveryMode?: MessageDeliveryModeType;

  /**
   * Sets the correlation ID.
   * The message Correlation Id is carried in the Solace message headers unmodified by the API and the Solace
   * Message Router. This field may be used for peer-to-peer message synchronization and is commonly used for
   * correlating a request to a reply.
   */
  correlationId?: string;
}

/**
 * RxJS operator for mapping a structured text message into its textual representation.
 *
 * Each message is mapped to a tuple of three elements:
 * [<text>, Params, Message].
 *
 * Note: Messages must be published as {@link MessageType.TEXT} messages, otherwise an error is thrown.
 */
export function mapToText(): OperatorFunction<MessageEnvelope, [string, Params, Message]> {
  return map((envelope: MessageEnvelope) => {
    const message: Message = envelope.message;
    if (message.getType() !== MessageType.TEXT) {
      throw Error(`[IllegalMessageTypeError] Expected message type to be ${formatMessageType(MessageType.TEXT)}, but was ${formatMessageType(message.getType())}. Be sure to use a compatible map operator.`);
    }
    return [message.getSdtContainer().getValue(), envelope.params, message];
  });
}

/**
 * RxJS operator for mapping a message into its binary representation.
 *
 * Each message is mapped to a tuple of three elements:
 * [<binary>, Params, Message].
 *
 * Backward compatibility note: Using the version10 factory profile or older, the binary attachment is returned as a 'latin1' String:
 * Each character has a code in the range * 0-255 representing the value of a single received byte at that position.
 *
 * Note: Messages must be published as {@link MessageType.BINARY} messages, otherwise an error is thrown.
 */
export function mapToBinary(): OperatorFunction<MessageEnvelope, [Uint8Array | string, Params, Message]> {
  return map((envelope: MessageEnvelope) => {
    const message: Message = envelope.message;
    if (message.getType() !== MessageType.BINARY) {
      throw Error(`[IllegalMessageTypeError] Expected message type to be ${formatMessageType(MessageType.BINARY)}, but was ${formatMessageType(message.getType())}. Be sure to use a compatible map operator.`);
    }
    return [message.getBinaryAttachment(), envelope.params, message];
  });
}

/**
 * Container for substitued values of named wildcard topic segments.
 */
export type Params = Map<string, string>;

function formatMessageType(messageType: MessageType): string {
  switch (messageType) {
    case MessageType.TEXT:
      return `TEXT (${messageType})`;
    case MessageType.BINARY:
      return `BINARY (${messageType})`;
    case MessageType.MAP:
      return `MAP (${messageType})`;
    case MessageType.STREAM:
      return `STREAM (${messageType})`;
    default:
      return `UNKNOWN (${messageType})`;
  }
}

/**
 * Envelope containing the {@link Message} and resolved values for named topic segments, if any.
 */
export interface MessageEnvelope {
  /**
   * Unmodified message as received by the Solace message broker.
   */
  message: Message;
  /**
   * Contains the resolved values of named single-level wildcard segments as specified in the topic.
   * For example: If subscribed to the topic `person/:id` and a message is published to the topic `person/5`,
   * the resolved id with the value `5` is contained in the segments map.
   */
  params: Params;
}
