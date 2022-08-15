import {Injectable} from '@angular/core';
import {BehaviorSubject, NEVER, noop, Observable, OperatorFunction} from 'rxjs';
import {Destination, Message, MessageConsumer, MessageConsumerProperties, MessageDeliveryModeType, MessageType, QueueBrowserProperties, SDTField, Session} from 'solclientjs';
import {map} from 'rxjs/operators';
import {SolaceMessageClientConfig} from './solace-message-client.config';

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
   * Promise that resolves to the {@link Session} when connected to the message broker, or that rejects if no connection
   * could be established, or if no connect attempt has been made yet.
   */
  public abstract readonly session: Promise<Session>;

  /**
   * Connects to the Solace message broker with the specified configuration. Has no effect if already connected.
   *
   * Do not forget to invoke this method if you import {@link SolaceMessageClientModule} without configuration in the root injector.
   * Typically, you would connect to the broker in an app initializer.
   *
   * @return Promise that resolves to the {@link Session} when connected to the broker, or that rejects if the connection attempt failed.
   *         If already connected, the Promise resolves immediately.
   */
  public abstract connect(config: SolaceMessageClientConfig): Promise<Session>;

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
   * See https://docs.solace.com/PubSub-Basics/Wildcard-Charaters-Topic-Subs.htm for more information and examples.
   *
   * If a segment begins with a colon (`:`), it is called a named wildcard segment that acts as a placeholder for any value. The characters after the leading colon give the segment its name.
   * Internally, named wildcard segments are translated to single-level wildcard segments. Named segments allow retrieving substituted segment values when receiving a message in an easy manner.
   * E.g., the topic 'myhome/:room/temperature' is translated to 'myhome/* /temperature', matching messages sent to topics like 'myhome/kitchen/temperature' or 'myhome/livingroom/temperature'.
   * Substituted segment values are then available in {@link MessageEnvelope.params}, or as the second element of the tuple when using {@link mapToBinary} or {@link mapToText}
   * RxJS operators.
   *
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
   * @return Observable that emits when receiving a message published to the given topic. The Observable never completes. If not connected to the broker yet, or if the connect attempt failed, the Observable errors.
   */
  public abstract observe$(topic: string, options?: ObserveOptions): Observable<MessageEnvelope>;

  /**
   * Consumes messages from a given topic endpoint or queue endpoint.
   *
   * Endpoint names are case-sensitive and consist of one or more segments, each separated by a forward slash.
   *
   * When passing a `string` topic literal (that is, not a {@link MessageConsumerProperties} object), creates a private, non-durable topic endpoint on the broker that subscribes
   * to messages published to the given topic. From the consumer's point of view, this is similar to observe a topic using {@link SolaceMessageClient#observe$}, with the difference
   * that messages are not lost in the event of short connection interruptions as messages are retained on the broker until transported to the consumer. The lifecycle of a non-durable
   * topic endpoint is bound to the client that created it, with an additional 60s in case of unexpected disconnect.
   *
   * To subscribe to a queue, or to pass a more advanced endpoint configuration, pass a {@link MessageConsumerProperties} object instead.
   *
   * ## Passing a `string` topic literal is equivalent to passing the following config:
   *
   * ```ts
   * solaceMessageClient.consume$({
   *   topicEndpointSubscription: SolclientFactory.createTopicDestination('topic'),
   *   queueDescriptor: {
   *     type: QueueType.TOPIC_ENDPOINT,
   *     durable: false,
   *   },
   * });
   * ```
   *
   * ## To consume messages sent to a durable queue, pass the following config:
   * ```ts
   * solaceMessageClient.consume$({
   *   queueDescriptor: {
   *     type: QueueType.QUEUE,
   *     name: 'queue',
   *   },
   * });
   * ```
   *
   * ## Topic vs Topic Endpoint
   * A topic is not the same thing as a topic endpoint. Messages cannot be published directly to topic endpoints, but only indirectly via topics.
   * A topic is a message property the event broker uses to route a message to its destination. Topic endpoints, unlike topics, are objects that define the storage of messages
   * for a consuming application. Topic endpoints are more closely related to queues than to topics.
   * For more information, refer to https://solace.com/blog/queues-vs-topic-endpoints.
   *
   * For topic endpoints, you can subscribe to multiple topics simultaneously by using wildcard segments in the topic.
   *
   * **Single-Level Wildcard Character (`*`)**:
   * - if a segment contains the asterisk (`*`) character as its only character, this segment is required and acts as a placeholder for any segment value.
   * - if a segment ends with the asterisk (`*`) character, this segment acts as a placeholder for segment values starting with the characters before the asterisk.
   *   The segment to match can have additional characters, must does not have to.
   *
   * **Multi-Level Wildcard Character (`>`)**:
   * -  when used as the last segment, it provides a "one or more" wildcard match for any topics with an identical prefix to the subscription.
   *
   * See https://docs.solace.com/PubSub-Basics/Wildcard-Charaters-Topic-Subs.htm for more information and examples.
   *
   * If a segment begins with a colon (`:`), it is called a named wildcard segment that acts as a placeholder for any value. The characters after the leading colon give the segment its name.
   * Internally, named wildcard segments are translated to single-level wildcard segments. Named segments allow retrieving substituted segment values when receiving a message in an easy manner.
   * E.g., the topic 'myhome/:room/temperature' is translated to 'myhome/* /temperature', matching messages sent to topics like 'myhome/kitchen/temperature' or 'myhome/livingroom/temperature'.
   * Substituted segment values are then available in {@link MessageEnvelope.params}, or as the second element of the tuple when using {@link mapToBinary} or {@link mapToText} RxJS operators.
   *
   * The Observables emits the messages as received by the Solace broker. You can use one of the following custom RxJS operators to map the message to its payload.
   * - {@link mapToBinary}
   * - {@link mapToText}
   *
   * @param topicOrDescriptor - If specifying a `string` literal, then it is used as the subscription topic to create a topic endpoint for, allowing messages to be reliably received even if the
   *        connection is unstable. If passing a descriptor object, it is used as the config to connect to a queue or topic endpoint.
   *        A topic endpoint subscription allows using wildcards (single-level or multi-level) to subscribe to multiple topics simultaneously. In place of using a single-level wildcard segment (`*`),
   *        you can also use a named wildcard segment starting with a colon (`:`), allowing you to retrieve substituted values of wildcard segments when receiving a message.
   * @return Observable that emits when receiving a message published to the given endpoint. The Observable never completes. If not connected to the broker yet, or if the connect attempt failed, the Observable errors.
   */
  public abstract consume$(topicOrDescriptor: string | (MessageConsumerProperties & ConsumeOptions)): Observable<MessageEnvelope>;

  /**
   * Browses messages in a queue, without removing/consuming the messages.
   *
   * @param queueOrDescriptor - Specifies the queue to browse, or a descriptor object describing how to connect to the queue browser.
   * @return Observable that emits spooled messages in the specified queue. The Observable never completes. If not connected to the broker yet, or if the connect attempt failed, the Observable errors.
   */
  public abstract browse$(queueOrDescriptor: string | (QueueBrowserProperties & BrowseOptions)): Observable<MessageEnvelope>;

  /**
   * Publishes a message to the given topic or queue destination.
   *
   * ## Topic Destination
   * When sending the message to a topic destination, the broker will transport the message to all subscribers subscribed to the topic at the time of sending the message.
   *
   * ## Queue Destination
   * A queue differs from the topic distribution mechanism that the message is transported to exactly a single consumer, i.e., the message is load balanced to a single consumer
   * in round‑robin fashion, or for exclusive queues, it is always transported to the same subscription. When sending a message to a queue, the broker retains the message until
   * it is consumed, or until it expires. Refer to the subsequent chapter 'Durability of Endpoints' for more information.
   * A queue is typically used in a point-to-point (P2P) messaging environment.
   *
   * ## Topic vs Topic Endpoint
   * A topic is not the same thing as a topic endpoint. Messages cannot be published directly to topic endpoints, but only indirectly via topics.
   * A topic is a message property the event broker uses to route a message to its destination. Topic endpoints, unlike topics, are objects that define the storage of messages
   * for a consuming application. Topic endpoints are more closely related to queues than to topics.
   * For more information, refer to https://solace.com/blog/queues-vs-topic-endpoints.
   *
   * ## Destination Name
   * Destinations case-sensitive and consist of one or more segments, each separated by a forward slash. The destination must be exact, thus not contain wildcards.
   *
   * ## Payload
   * A message may contain unstructured byte data, or a structured container. See {@link Data} for further information.
   *
   * ## Delivery Mode
   * Solace supports two delivery modes, also known as qualities of service (QoS):
   *  - Direct Messaging (default if not specified)
   *  - Guaranteed or Persistent Messaging
   *
   * You can change the message delivery mode via the {@link PublishOptions.deliveryMode} property.
   * For more information, refer to the documentation of {@link PublishOptions.deliveryMode}.
   *
   * ## Durability of Queue Endpoints
   * Solace distinguishes between durable und non-durable queues.
   *
   * When sending the message to a durable queue, the broker retains the message until it is consumed (and also acknowledged) by the consumer, or until
   * it expires. In constract, a non-durable queue, also known as a temporary queue, has a shorter lifecycle than a durable queue. It has the lifespan
   * of the client that created it, with an additional 60 seconds in case of unexpected disconnect. The 60 seconds provides the client with some time to
   * reconnect to the endpoint before it and its contents are deleted from the Solace broker.
   *
   * Although the terms durable and persistent are related, keep in mind that the concept 'durability' applies to endpoints, whereas 'persistence'
   * applies to event messages.
   *
   * For further information refer to:
   * - https://docs.solace.com/PubSub-Basics/Endpoints.htm
   * - https://solace.com/blog/solace-endpoints-durable-vs-non-durable
   *
   * @param  destination - Specifies the destination where to send the message to. If of the type `string`, sends it to a topic destination.
   *         To send a message to a queue, pass a queue {@link Destination} which can be constructed using the {@link SolclientFactory}, as following:
   *         `SolclientFactory.createDurableQueueDestination('queue')`
   * @param  data - Specifies optional {@link Data transfer data} to be carried along with this message. A message may contain unstructured byte data,
   *         or structured data in the form of a {@link SDTField}. Alternatively, to have full control over the message to be published, pass the
   *         {@link Message} object instead, which you can construct using {@link SolclientFactory#createMessage}.
   *         For more information, refer to the documentation of {@link Data}.
   * @param  options - Controls how to publish the message.
   * @return A Promise that resolves when dispatched the message, or that rejects if the message could not be dispatched.
   */
  public abstract publish(destination: string | Destination, data?: Data | Message, options?: PublishOptions): Promise<void>;

  /**
   * Sends a request to the specified destination and waits for the response to arrive.
   *
   * - If sending the request to a topic, the request is transported to all subscribers subscribed to the topic at the time of sending the request.
   * - If sending the request to a queue, the request is transported to a single subscriber. The request is retained if there was no subscriber
   *   at the time of sending the request.
   * - If not receiving a reply within the specified (or globally set) timeout, then the Observable will error.
   * - If not passing a 'replyTo' destination via options object, the API will generate a 'replyTo' destination where to send the reply to.
   *
   * Note:
   * The implementation is based on "solclientjs" {@link Session#sendRequest} which does not support receiving multiple responses
   * and requires the replier to include the requestor's `correlationId` in the reply message.
   *
   * @param  destination - Specifies the destination where to send the message to. If of the type `string`, sends it to a topic destination.
   * @param  data - Specifies optional {@link Data transfer data} to be carried along with this request. The request may contain unstructured byte data,
   *         or structured data in the form of a {@link SDTField}. Alternatively, to have full control over the message to be published, pass the
   *         {@link Message} object instead, which you can construct using {@link SolclientFactory#createMessage}.
   *         For more information, refer to the documentation of {@link Data}.
   * @param  options - Controls how to publish the request, e.g., to pass a custom 'replyTo' destination.
   * @return Observable that emits the received reply and then completes, or that errors if the request could not be dispatched or no reply was received
   *         within the specified timeout.
   */
  public abstract request$(destination: string | Destination, data?: Data | Message, options?: RequestOptions): Observable<MessageEnvelope>;

  /**
   * Replies to the passed request.
   *
   * @param  request - Specifies the request to send a reply for.
   * @param  data - Specifies optional {@link Data transfer data} to be carried along with the reply. The reply may contain unstructured byte data,
   *         or structured data in the form of a {@link SDTField}. Alternatively, to have full control over the message to be published, pass the
   *         {@link Message} object instead, which you can construct using {@link SolclientFactory#createMessage}.
   *         For more information, refer to the documentation of {@link Data}.
   * @param  options - Controls how to publish the reply.
   * @return A Promise that resolves when dispatched the reply, or that rejects if the reply could not be dispatched.
   */
  public abstract reply(request: Message, data?: Data | Message, options?: PublishOptions): Promise<void>;
}

/**
 * SolaceMessageClient which does nothing, i.e., can be used in tests.
 */
@Injectable()
export class NullSolaceMessageClient implements SolaceMessageClient {

  public readonly connected$ = new BehaviorSubject<boolean>(true);

  public observe$(topic: string, options?: ObserveOptions): Observable<MessageEnvelope> {
    return NEVER;
  }

  public consume$(topicOrDescriptor: string | (MessageConsumerProperties & ConsumeOptions)): Observable<MessageEnvelope> {
    return NEVER;
  }

  public browse$(queueOrDescriptor: string | (QueueBrowserProperties & BrowseOptions)): Observable<MessageEnvelope> {
    return NEVER;
  }

  public publish(destination: string | Destination, data?: ArrayBufferLike | DataView | string | SDTField | Message, options?: PublishOptions): Promise<void> {
    return Promise.resolve();
  }

  public request$(destination: string | Destination, data?: Data | Message, options?: RequestOptions): Observable<MessageEnvelope> {
    return NEVER;
  }

  public reply(request: Message, data?: ArrayBufferLike | DataView | string | SDTField | Message, options?: PublishOptions): Promise<void> {
    return Promise.resolve();
  }

  public get session(): Promise<Session> {
    return new Promise(noop);
  }

  public connect(config: SolaceMessageClientConfig): Promise<Session> {
    return new Promise(noop);
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
   * Specifies the maximum time (in milliseconds) to wait for the destination to be subscribed.
   * If specified, overrides the global timeout as set via {@link SessionProperties#readTimeoutInMsecs}.
   *
   * @deprecated This API will be removed in a future release. Instead, use {@link #subscribeTimeout} instead.
   */
  requestTimeout?: number;
  /**
   * Specifies the maximum time (in milliseconds) to wait for the destination to be subscribed.
   * If specified, overrides the global timeout as set via {@link SessionProperties#readTimeoutInMsecs}.
   */
  subscribeTimeout?: number;

  /**
   * Controls if to emit received messages inside or outside of the Angular zone.
   * If emitted outside of the Angular zone no change detection cycle is triggered.
   *
   * By default, if not specified, emits inside the Angular zone.
   */
  emitOutsideAngularZone?: boolean;

  /**
   * A lifecycle hook that is called when subscribed to a destination.
   *
   * Use if you need to wait until the destination is actually subscribed, e.g, if implementing the request/response message exchange pattern,
   * or for reading information about the endpoint if consuming messages via {@link SolaceMessageClient#consume$}.
   */
  onSubscribed?(): void;
}

/**
 * Control how to consume messages.
 */
export interface ConsumeOptions {

  /**
   * Controls if to emit received messages inside or outside of the Angular zone.
   * If emitted outside of the Angular zone no change detection cycle is triggered.
   *
   * By default, if not specified, emits inside the Angular zone.
   */
  emitOutsideAngularZone?: boolean;

  /**
   * A lifecycle hook that is called when subscribed to a destination.
   *
   * Use if you need to wait until the destination is actually subscribed, e.g, if implementing the request/response message exchange pattern,
   * or for reading information about the endpoint if consuming messages via {@link SolaceMessageClient#consume$}.
   *
   * @param messageConsumer - reference to the message consumer, useful to read generated endpoint names:
   *        * For non-durable endpoints, if not passing an endpoint name, Solace API generates a name which can be queried by calling {@link MessageConsumer#getDestination};
   *          The generated descriptor can be queried by calling {@link MessageConsumer#getProperties#queueDescriptor};
   *        * For durable endpoints, endpoint properties can be retrieved as configured on the broker by calling {@link MessageConsumer#getProperties#queueProperties};
   */
  onSubscribed?(messageConsumer: MessageConsumer): void;
}

/**
 * Control how to browse a queue.
 */
export interface BrowseOptions {

  /**
   * Controls if to emit received messages inside or outside of the Angular zone.
   * If emitted outside of the Angular zone no change detection cycle is triggered.
   *
   * By default, if not specified, emits inside the Angular zone.
   */
  emitOutsideAngularZone?: boolean;
}

/**
 * Control how to publish a message.
 */
export interface PublishOptions {

  /**
   * Allows intercepting the raw message before it is sent over the network.
   *
   * Only basic properties can be set via {@link PublishOptions}. To set other properties or properties not yet supported by the API,
   * the message can be intercepted and the properties set accordingly.
   */
  intercept?: (message: Message) => void;

  /**
   * Convenience API for setting headers to pass additional information along with the message.
   *
   * Headers are transported as structured data separate from the payload. To pass a header value
   * different to `string`, `boolean` or `number`, pass it as Structured Data Type (SDT) in the
   * form of a {@link SDTField}, as following: `SDTField.create(SDTFieldType.INT8, 2);`
   *
   * Header values are mapped as following to structured data types:
   * `string` -> SDTFieldType.STRING
   * `boolean` -> SDTFieldType.BOOL
   * `number` -> SDTFieldType.INT32
   *
   * @see Message.setUserPropertyMap
   */
  headers?: Map<string, string | boolean | number | SDTField>;

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
   * Solace supports two delivery modes, also known as qualities of service (QoS):
   * - Direct Messaging (default if not specified)
   * - Guaranteed or Persistent Messaging
   *
   * For a detailed comparison, refer to https://solace.com/blog/delivery-modes-direct-messaging-vs-persistent-messaging.
   *
   * ### Direct Messaging (default)
   * Direct messaging is over TCP and provides a reliable, but not guaranteed, delivery of messages from the Solace event broker to consuming clients,
   * and is the default message delivery system. The broker delivers a message one time at most. It is most appropriate for messaging applications
   * that require very high-rate or very low-latency message transmission, i.e., to efficiently publish messages to a large number of clients with matching
   * subscriptions.
   *
   * For more information, refer to https://docs.solace.com/PubSub-Basics/Direct-Messages.htm.
   *
   * ### Persistent or Guaranteed Messaging
   * Persistent messaging is also over TCP but has an additional set of acknowledgments beyond those used by TCP itself. Solace event broker guarantees the message
   * never to be lost and to be delivered at least once. Use persistent messaging when data must be received by the consuming application.
   *
   * Persistent messaging occurs between the publishing application and the broker, and between the broker and the consuming application. If the consuming application
   * is not connected or cannot keep up with the publishing application, the messages are stored in endpoints on the broker.
   *
   * For more information, refer to  https://docs.solace.com/PubSub-Basics/Guaranteed-Messages.htm or https://docs.solace.com/PubSub-Basics/Basic-Guaranteed-Messsaging-Operation.htm.
   *
   * If you experience poor performance when sending guaranteed messages, consider adjusting the size of the publishing window via {@link Session#publisherProperties#windowSize},
   * as described here: https://solace.com/blog/understanding-guaranteed-message-publish-window-sizes-and-acknowledgement
   *
   * @default MessageDeliveryModeType.DIRECT
   */
  deliveryMode?: MessageDeliveryModeType;

  /**
   * Sets the correlation ID which is carried in the message headers unmodified.
   *
   * A correlation ID is a unique identifier value that is attached to a message that allows referencing to a particular transaction or event chain.
   *
   * If replying to a request via {@link SolaceMessageClient#reply}, the API will copy the correlation id from the request, thus must not be set manually.
   */
  correlationId?: string;
  /**
   * Sets the correlation key to correlate events from the Solace event broker when sending the message to the broker.
   *
   * The correlation key is an object that is passed back to the client during the router acknowledgement or rejection.
   * Note that the correlation key is not included in the transmitted message and is only used with the local API.
   */
  correlationKey?: string | object;
  /**
   * Sets the destination a replier can reply to in "request-response" communication.
   *
   * If not passed the API will generate a 'replyTo' destination where to send the reply to.
   */
  replyTo?: Destination;
  /**
   * Marks this message as a reply to a previous request in "request-response" communication.
   *
   * If replying to a request via {@link SolaceMessageClient#reply}, the API will mark the message as a reply, thus must not be set manually.
   */
  markAsReply?: boolean;
}

/**
 * Control how to publish a request.
 */
export interface RequestOptions extends PublishOptions {
  /**
   * Specifies the maximum time (in milliseconds) to wait for a response to be received. The minimum value is 100ms.
   * If specified, overrides the global timeout as set via {@link SessionProperties#readTimeoutInMsecs}.
   */
  requestTimeout?: number;
  /**
   * Controls if to emit received replies inside or outside of the Angular zone.
   * If emitted outside of the Angular zone no change detection cycle is triggered.
   *
   * By default, if not specified, emits inside the Angular zone.
   */
  emitOutsideAngularZone?: boolean;
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
    return [message.getSdtContainer()!.getValue(), envelope.params, message];
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
export function mapToBinary<T extends Uint8Array | string = Uint8Array>(): OperatorFunction<MessageEnvelope, [T | string, Params, Message]> {
  return map((envelope: MessageEnvelope) => {
    const message: Message = envelope.message;
    if (message.getType() !== MessageType.BINARY) {
      throw Error(`[IllegalMessageTypeError] Expected message type to be ${formatMessageType(MessageType.BINARY)}, but was ${formatMessageType(message.getType())}. Be sure to use a compatible map operator.`);
    }
    return [message.getBinaryAttachment() as T, envelope.params, message];
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
  /**
   * Convenience API for accessing headers attached to the message.
   *
   * @see Message.getUserPropertyMap
   */
  headers: Map<string, any>;
}

/**
 * Represents the payload of a message.
 *
 * A message may contain unstructured byte data, or a structured container.
 *
 * ## Binary Data Message
 * By default, data is transported as unstructured bytes in the binary attachment message part.
 *
 * Supported data types are:
 * - ArrayBufferLike, e.g. `ArrayBuffer`, `Uint8Array`, `Uint32Array`, or similar
 * - DataView
 * - string (latin1-encoded; only supported for backwards compatibility; use `new TextEncoder.encode(...)` instead)
 *
 * ## Structured Data Message
 * Alternatively, you can exchange data using the structured data API by passing it as Structured Data Type (SDT) in the form of a {@link SDTField}
 * of the type {@link SDTFieldType#STRING}, {@link SDTFieldType#MAP} or {@link SDTFieldType#STREAM}. Transporting data as structured message is useful
 * in a heterogeneous network that has clients that use different hardware architectures and programming languages, allowing exchanging binary data in
 * a structured, language- and architecture-independent way.
 *
 * Example: `SDTField.create(SDTFieldType.STRING, 'payload')`
 *
 * https://solace.com/blog/inside-solace-message-introduction/
 */
export type Data = ArrayBufferLike | DataView | string | SDTField;
